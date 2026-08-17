import { randomBytes } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@data-room/db';
import {
  type AddShareRecipientsInput,
  type BreadcrumbDto,
  type CreateShareInput,
  DEFAULT_PAGE_SIZE,
  type ListNodesQuery,
  type NodeDto,
  type Page,
  type ReceivedShareDto,
  type ShareAccessEventDto,
  type ShareDto,
  type SharedTargetDto,
  type SignedUrlDto,
} from '@data-room/shared';

import { AppError } from '../common/app-error';
import { DataRoomsService } from '../data-rooms/data-rooms.service';
import { FilesService } from '../files/files.service';
import { type NodeRow, nodeSelect, toNodeDto } from '../nodes/node-mapper';
import { NodesService } from '../nodes/nodes.service';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateShareAccess, isNodeWithinShare, type ShareAccess } from './share-access';

export interface ViewerContext {
  user: { id: string; email: string; name: string } | null;
  ipAddress?: string;
  userAgent?: string;
}

const shareInclude = {
  recipients: { orderBy: { invitedAt: 'asc' } },
  node: { select: nodeSelect },
  dataRoom: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { accessEvents: true } },
} satisfies Prisma.ShareInclude;

type ShareRecord = Prisma.ShareGetPayload<{ include: typeof shareInclude }>;

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataRooms: DataRoomsService,
    private readonly nodes: NodesService,
    private readonly files: FilesService,
  ) {}

  async create(userId: string, dataRoomId: string, input: CreateShareInput): Promise<ShareDto> {
    await this.dataRooms.requireOwned(userId, dataRoomId);

    if (input.targetType === 'NODE' && input.nodeId) {
      await this.nodes.requireOwnedNode(userId, input.nodeId);
    }

    const share = await this.prisma.share.create({
      data: {
        dataRoomId,
        targetType: input.targetType,
        nodeId: input.targetType === 'NODE' ? input.nodeId : null,
        mode: input.mode,
        role: input.role,
        token: generateShareToken(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdById: userId,
        recipients:
          input.mode === 'RESTRICTED'
            ? { create: await this.recipientRows(input.recipients) }
            : undefined,
      },
      include: shareInclude,
    });

    return toShareDto(share);
  }

  async listForTarget(
    userId: string,
    dataRoomId: string,
    nodeId: string | null,
  ): Promise<ShareDto[]> {
    await this.dataRooms.requireOwned(userId, dataRoomId);

    const shares = await this.prisma.share.findMany({
      where: { dataRoomId, nodeId, revokedAt: null },
      include: shareInclude,
      orderBy: { createdAt: 'desc' },
    });

    return shares.map(toShareDto);
  }

  async revoke(userId: string, shareId: string): Promise<void> {
    await this.requireOwnedShare(userId, shareId);

    await this.prisma.share.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
  }

  async addRecipients(
    userId: string,
    shareId: string,
    input: AddShareRecipientsInput,
  ): Promise<ShareDto> {
    const existing = await this.requireOwnedShare(userId, shareId);

    if (existing.mode !== 'RESTRICTED') {
      throw AppError.invalidMove('Only a restricted share has a list of people.');
    }

    const rows = await this.recipientRows(input.recipients);

    await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.shareRecipient.upsert({
          where: { shareId_email: { shareId, email: row.email } },
          update: { revokedAt: null, userId: row.userId },
          create: { ...row, shareId },
        }),
      ),
    );

    return this.getOwnedShareDto(shareId);
  }

  async revokeRecipient(userId: string, shareId: string, recipientId: string): Promise<ShareDto> {
    await this.requireOwnedShare(userId, shareId);

    await this.prisma.shareRecipient.update({
      where: { id: recipientId },
      data: { revokedAt: new Date() },
    });

    return this.getOwnedShareDto(shareId);
  }

  async listEvents(userId: string, shareId: string, limit: number): Promise<ShareAccessEventDto[]> {
    await this.requireOwnedShare(userId, shareId);

    const events = await this.prisma.shareAccessEvent.findMany({
      where: { shareId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        node: { select: { name: true } },
      },
    });

    return events.map((event) => ({
      id: event.id,
      action: event.action,
      actor: {
        id: event.user?.id ?? null,
        name: event.user?.name ?? null,
        email: event.user?.email ?? event.email ?? null,
      },
      nodeName: event.node?.name ?? null,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  async receivedShares(userId: string, email: string): Promise<ReceivedShareDto[]> {
    const shares = await this.prisma.share.findMany({
      where: {
        revokedAt: null,
        createdById: { not: userId },
        recipients: {
          some: {
            revokedAt: null,
            OR: [{ userId }, { email: email.toLowerCase() }],
          },
        },
      },
      include: shareInclude,
      orderBy: { createdAt: 'desc' },
    });

    return shares
      .filter((share) => !(share.node && share.node.deletedAt !== null))
      .map((share) => ({
        id: share.id,
        token: share.token,
        url: `/s/${share.token}`,
        dataRoomName: share.dataRoom.name,
        targetName: share.node?.name ?? share.dataRoom.name,
        targetType: share.targetType,
        sharedBy: { name: share.createdBy.name, email: share.createdBy.email },
        createdAt: share.createdAt.toISOString(),
        expiresAt: share.expiresAt?.toISOString() ?? null,
      }));
  }

  async openShare(token: string, viewer: ViewerContext): Promise<SharedTargetDto> {
    const { share, access } = await this.resolveToken(token, viewer);

    const isFolderShare = share.node?.type === 'FOLDER';

    const stats = await this.nodes.subtreeStats(
      share.dataRoomId,
      isFolderShare ? share.nodeId : null,
    );

    await this.recordAccess(share.id, viewer, 'LIST', null);

    return {
      token: share.token,
      mode: share.mode,
      dataRoomName: share.dataRoom.name,
      targetType: share.targetType,
      rootNode: share.node ? toNodeDto(share.node) : null,
      breadcrumbs: [{ id: null, name: share.node?.name ?? share.dataRoom.name }],
      capabilities: access.allowed ? access.capabilities : [],
      stats:
        share.node?.type === 'FILE'
          ? { folderCount: 0, fileCount: 1, totalSizeBytes: share.node.sizeBytes }
          : stats,
      sharedBy: { name: share.createdBy.name, email: share.createdBy.email },
      expiresAt: share.expiresAt?.toISOString() ?? null,
    };
  }

  async listSharedNodes(
    token: string,
    viewer: ViewerContext,
    query: Pick<ListNodesQuery, 'parentId' | 'sort' | 'direction' | 'cursor' | 'limit'>,
  ): Promise<Page<NodeDto>> {
    const { share } = await this.resolveToken(token, viewer);

    if (share.node?.type === 'FILE') {
      return { items: [], nextCursor: null };
    }

    const parentId = query.parentId ?? share.nodeId ?? null;

    if (query.parentId) {
      const folder = await this.requireNodeWithinShare(share, query.parentId);
      if (folder.type !== 'FOLDER') {
        throw AppError.notFound('That folder');
      }
    }

    return this.nodes.listChildren({
      dataRoomId: share.dataRoomId,
      parentId,
      sort: query.sort,
      direction: query.direction,
      cursor: query.cursor,
      limit: query.limit ?? DEFAULT_PAGE_SIZE,
    });
  }

  async sharedBreadcrumbs(
    token: string,
    viewer: ViewerContext,
    folderId: string | null,
  ): Promise<BreadcrumbDto[]> {
    const { share } = await this.resolveToken(token, viewer);
    const rootName = share.node?.name ?? share.dataRoom.name;

    if (!folderId || folderId === share.nodeId) {
      return [{ id: null, name: rootName }];
    }

    await this.requireNodeWithinShare(share, folderId);

    return this.nodes.breadcrumbsFor(
      rootName,
      share.dataRoomId,
      folderId,
      share.nodeId ?? undefined,
    );
  }

  async sharedFileUrl(
    token: string,
    viewer: ViewerContext,
    nodeId: string,
    disposition: 'inline' | 'attachment',
  ): Promise<SignedUrlDto> {
    const { share } = await this.resolveToken(token, viewer);
    const node = await this.requireNodeWithinShare(share, nodeId);

    if (node.type !== 'FILE' || !node.currentVersionId) {
      throw AppError.notFound('That file');
    }

    await this.recordAccess(
      share.id,
      viewer,
      disposition === 'attachment' ? 'DOWNLOAD' : 'VIEW',
      node.id,
    );

    return this.files.signVersion(node.currentVersionId, node.name, disposition);
  }

  private async resolveToken(
    token: string,
    viewer: ViewerContext,
  ): Promise<{ share: ShareRecord; access: ShareAccess }> {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: shareInclude,
    });

    if (!share) {
      throw AppError.notFound('That link');
    }

    const targetIsDeleted =
      share.node?.deletedAt != null || (await this.dataRoomIsDeleted(share.dataRoomId));

    const access = evaluateShareAccess(share, viewer.user, { targetIsDeleted });

    if (!access.allowed) {
      switch (access.reason) {
        case 'REVOKED':
          throw AppError.shareRevoked();
        case 'EXPIRED':
          throw AppError.shareExpired();
        case 'TARGET_DELETED':
          throw AppError.shareTargetDeleted();
        case 'SIGN_IN_REQUIRED':
          throw AppError.shareSignInRequired(access.invitedEmails);
        case 'NOT_INVITED':
          throw AppError.accessDenied(
            'This link is limited to specific people, and this account is not one of them.',
          );
      }
    }

    return { share, access };
  }

  private async dataRoomIsDeleted(dataRoomId: string): Promise<boolean> {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id: dataRoomId },
      select: { deletedAt: true },
    });

    return room?.deletedAt !== null;
  }

  private async requireNodeWithinShare(share: ShareRecord, nodeId: string): Promise<NodeRow> {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, deletedAt: null },
      select: nodeSelect,
    });

    if (!node || !isNodeWithinShare(share, node)) {
      throw AppError.notFound('That item');
    }

    return node;
  }

  private async requireOwnedShare(userId: string, shareId: string): Promise<ShareRecord> {
    const share = await this.prisma.share.findFirst({
      where: { id: shareId, dataRoom: { ownerId: userId } },
      include: shareInclude,
    });

    if (!share) {
      throw AppError.notFound('That share');
    }

    return share;
  }

  private async getOwnedShareDto(shareId: string): Promise<ShareDto> {
    const share = await this.prisma.share.findUniqueOrThrow({
      where: { id: shareId },
      include: shareInclude,
    });

    return toShareDto(share);
  }

  private async recipientRows(
    emails: string[],
  ): Promise<Array<{ email: string; userId: string | null }>> {
    const unique = [...new Set(emails.map((email) => email.toLowerCase()))];
    if (unique.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { email: { in: unique } },
      select: { id: true, email: true },
    });
    const idByEmail = new Map(users.map((user) => [user.email, user.id]));

    return unique.map((email) => ({ email, userId: idByEmail.get(email) ?? null }));
  }

  private async recordAccess(
    shareId: string,
    viewer: ViewerContext,
    action: 'LIST' | 'VIEW' | 'DOWNLOAD',
    nodeId: string | null,
  ): Promise<void> {
    try {
      await this.prisma.shareAccessEvent.create({
        data: {
          shareId,
          nodeId,
          userId: viewer.user?.id ?? null,
          email: viewer.user?.email ?? null,
          action,
          ipAddress: viewer.ipAddress?.slice(0, 64) ?? null,
          userAgent: viewer.userAgent?.slice(0, 500) ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Could not record share access: ${String(error)}`);
    }
  }
}

function generateShareToken(): string {
  return randomBytes(24).toString('base64url');
}

function toShareDto(share: ShareRecord): ShareDto {
  return {
    id: share.id,
    dataRoomId: share.dataRoomId,
    targetType: share.targetType,
    nodeId: share.nodeId,
    targetName: share.node?.name ?? share.dataRoom.name,
    mode: share.mode,
    role: share.role,
    url: `/s/${share.token}`,
    createdAt: share.createdAt.toISOString(),
    expiresAt: share.expiresAt?.toISOString() ?? null,
    revokedAt: share.revokedAt?.toISOString() ?? null,
    accessCount: share._count.accessEvents,
    recipients: share.recipients.map((recipient) => ({
      id: recipient.id,
      email: recipient.email,
      userId: recipient.userId,
      name: null,
      invitedAt: recipient.invitedAt.toISOString(),
      revokedAt: recipient.revokedAt?.toISOString() ?? null,
    })),
  };
}
