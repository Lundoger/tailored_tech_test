import { Injectable, Logger } from '@nestjs/common';
import {
  ACCEPTED_FILE_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  DOWNLOAD_URL_TTL_SECONDS,
  type FileVersionDto,
  type InitUploadInput,
  type InitUploadResultDto,
  MAX_FOLDER_DEPTH,
  type NodeDto,
  type SignedUrlDto,
  UPLOAD_URL_TTL_SECONDS,
} from '@data-room/shared';

import { AppError } from '../common/app-error';
import { AppConfigService } from '../config/app-config.service';
import { DataRoomsService } from '../data-rooms/data-rooms.service';
import { nodeSelect, toNodeDto } from '../nodes/node-mapper';
import { withResolvedName } from '../nodes/node-naming';
import { childAncestorIds, depthOf } from '../nodes/node-tree';
import { NodesService } from '../nodes/nodes.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildStorageKey } from '../storage/storage-keys';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly nodes: NodesService,
    private readonly dataRooms: DataRoomsService,
    private readonly config: AppConfigService,
  ) {}

  async initUpload(
    userId: string,
    dataRoomId: string,
    input: InitUploadInput,
  ): Promise<InitUploadResultDto> {
    await this.dataRooms.requireOwned(userId, dataRoomId);

    const parent = input.parentId
      ? await this.nodes.requireFolder(dataRoomId, input.parentId)
      : null;

    const ancestorIds = childAncestorIds(parent);
    if (depthOf(ancestorIds) >= MAX_FOLDER_DEPTH) {
      throw AppError.folderTooDeep(MAX_FOLDER_DEPTH);
    }

    const mimeType = this.assertSupported(input.name, input.mimeType);
    if (input.sizeBytes > this.config.env.MAX_UPLOAD_BYTES) {
      throw AppError.uploadTooLarge(this.config.env.MAX_UPLOAD_BYTES);
    }

    const prepared = await withResolvedName(
      this.prisma,
      {
        dataRoomId,
        parentId: input.parentId,
        desiredName: input.name,
        strategy: input.conflictStrategy,
      },
      async (resolved, tx) => {
        let node =
          resolved.conflictingNodeId && input.conflictStrategy === 'VERSION'
            ? await tx.node.findUnique({
                where: { id: resolved.conflictingNodeId },
                select: nodeSelect,
              })
            : null;

        if (node && node.type === 'FOLDER') {
          throw AppError.nameConflict(input.name, `${input.name} (2)`);
        }

        node ??= await tx.node.create({
          data: {
            dataRoomId,
            parentId: input.parentId,
            type: 'FILE',
            name: resolved.name,
            ancestorIds,
            depth: depthOf(ancestorIds),
            createdById: userId,
            versionCount: 0,
          },
          select: nodeSelect,
        });

        const highest = await tx.fileVersion.aggregate({
          where: { nodeId: node.id },
          _max: { version: true },
        });
        const version = (highest._max.version ?? 0) + 1;

        const storageKey = buildStorageKey({
          dataRoomId,
          nodeId: node.id,
          version,
          fileName: resolved.name,
        });

        const fileVersion = await tx.fileVersion.create({
          data: {
            nodeId: node.id,
            version,
            storageKey,
            mimeType,
            sizeBytes: 0,
            status: 'PENDING',
            uploadedById: userId,
          },
          select: { id: true, version: true, storageKey: true },
        });

        return { node, fileVersion };
      },
    );

    const target = await this.storage.createUploadTarget(prepared.fileVersion.storageKey, {
      contentType: mimeType,
      maxBytes: this.config.env.MAX_UPLOAD_BYTES,
      ttlSeconds: UPLOAD_URL_TTL_SECONDS,
    });

    return {
      nodeId: prepared.node.id,
      versionId: prepared.fileVersion.id,
      name: prepared.node.name,
      version: prepared.fileVersion.version,
      storageKey: prepared.fileVersion.storageKey,
      uploadUrl: target.url,
      expiresAt: target.expiresAt.toISOString(),
    };
  }

  async completeUpload(userId: string, versionId: string): Promise<NodeDto> {
    const version = await this.requireOwnedVersion(userId, versionId);

    if (version.status === 'READY') {
      const node = await this.nodes.requireOwnedNode(userId, version.nodeId);
      return toNodeDto(node);
    }

    // Ask storage how many bytes arrived rather than trusting the client's claim.
    const object = await this.storage.statObject(version.storageKey);
    if (!object || object.sizeBytes === 0) {
      throw AppError.uploadNotFinished();
    }

    if (object.sizeBytes > this.config.env.MAX_UPLOAD_BYTES) {
      await this.discardVersion(version.id, version.nodeId, version.storageKey);
      throw AppError.uploadTooLarge(this.config.env.MAX_UPLOAD_BYTES);
    }

    // The extension and the browser-reported type are both the client's word for it.
    // This is the only check that looks at what was actually stored.
    const head = await this.storage.readObjectHead(version.storageKey, PDF_HEADER_SEARCH_BYTES);
    if (!head || !looksLikePdf(head)) {
      await this.discardVersion(version.id, version.nodeId, version.storageKey);
      throw AppError.unsupportedFileType(ACCEPTED_MIME_TYPES);
    }

    const node = await this.prisma.$transaction(async (tx) => {
      await tx.fileVersion.update({
        where: { id: version.id },
        data: { status: 'READY', sizeBytes: object.sizeBytes },
      });

      const readyCount = await tx.fileVersion.count({
        where: { nodeId: version.nodeId, status: 'READY' },
      });

      return tx.node.update({
        where: { id: version.nodeId },
        data: {
          currentVersionId: version.id,
          sizeBytes: object.sizeBytes,
          mimeType: version.mimeType,
          versionCount: readyCount,
        },
        select: nodeSelect,
      });
    });

    return toNodeDto(node);
  }

  async abortUpload(userId: string, versionId: string): Promise<void> {
    const version = await this.requireOwnedVersion(userId, versionId);

    if (version.status === 'READY') {
      return;
    }

    await this.discardVersion(version.id, version.nodeId, version.storageKey);
  }

  async importFile(params: {
    userId: string;
    dataRoomId: string;
    parentId: string | null;
    name: string;
    bytes: Buffer;
  }): Promise<NodeDto> {
    const reservation = await this.initUpload(params.userId, params.dataRoomId, {
      name: params.name,
      parentId: params.parentId,
      mimeType: ACCEPTED_MIME_TYPES[0],
      sizeBytes: params.bytes.length,
      conflictStrategy: 'RENAME',
    });

    await this.storage.putObject(reservation.storageKey, params.bytes, ACCEPTED_MIME_TYPES[0]);

    return this.completeUpload(params.userId, reservation.versionId);
  }

  async listVersions(userId: string, nodeId: string): Promise<FileVersionDto[]> {
    const node = await this.nodes.requireOwnedNode(userId, nodeId);

    const versions = await this.prisma.fileVersion.findMany({
      where: { nodeId: node.id, status: 'READY' },
      orderBy: { version: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });

    return versions.map((version) => ({
      id: version.id,
      version: version.version,
      sizeBytes: version.sizeBytes,
      mimeType: version.mimeType,
      createdAt: version.createdAt.toISOString(),
      isCurrent: version.id === node.currentVersionId,
      uploadedBy: version.uploadedBy,
    }));
  }

  async downloadUrlForNode(
    userId: string,
    nodeId: string,
    disposition: 'inline' | 'attachment',
  ): Promise<SignedUrlDto> {
    const node = await this.nodes.requireOwnedNode(userId, nodeId);

    if (node.type !== 'FILE' || !node.currentVersionId) {
      throw AppError.notFound('That file');
    }

    return this.signVersion(node.currentVersionId, node.name, disposition);
  }

  async downloadUrlForVersion(
    userId: string,
    versionId: string,
    disposition: 'inline' | 'attachment',
  ): Promise<SignedUrlDto> {
    const version = await this.requireOwnedVersion(userId, versionId);
    const node = await this.nodes.requireOwnedNode(userId, version.nodeId);

    return this.signVersion(version.id, node.name, disposition);
  }

  async signVersion(
    versionId: string,
    displayName: string,
    disposition: 'inline' | 'attachment',
  ): Promise<SignedUrlDto> {
    const version = await this.prisma.fileVersion.findUnique({
      where: { id: versionId },
      select: { storageKey: true, mimeType: true, status: true },
    });

    if (!version || version.status !== 'READY') {
      throw AppError.notFound('That file');
    }

    const signed = await this.storage.createDownloadUrl(version.storageKey, {
      fileName: displayName,
      contentType: version.mimeType,
      ttlSeconds: DOWNLOAD_URL_TTL_SECONDS,
      disposition,
    });

    return { url: signed.url, expiresAt: signed.expiresAt.toISOString() };
  }

  private async requireOwnedVersion(userId: string, versionId: string) {
    const version = await this.prisma.fileVersion.findFirst({
      where: {
        id: versionId,
        node: { deletedAt: null, dataRoom: { ownerId: userId, deletedAt: null } },
      },
      select: {
        id: true,
        nodeId: true,
        version: true,
        storageKey: true,
        mimeType: true,
        status: true,
      },
    });

    if (!version) {
      throw AppError.notFound('That upload');
    }

    return version;
  }

  private async discardVersion(
    versionId: string,
    nodeId: string,
    storageKey: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.fileVersion.delete({ where: { id: versionId } });

      const remaining = await tx.fileVersion.count({ where: { nodeId, status: 'READY' } });
      if (remaining === 0) {
        await tx.node.delete({ where: { id: nodeId } });
      }
    });

    try {
      await this.storage.removeObjects([storageKey]);
    } catch (error) {
      this.logger.warn(`Could not remove abandoned upload ${storageKey}: ${String(error)}`);
    }
  }

  private assertSupported(fileName: string, mimeType: string): string {
    const hasAcceptedExtension = ACCEPTED_FILE_EXTENSIONS.some((extension) =>
      fileName.toLowerCase().endsWith(extension),
    );

    const normalisedMime = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
    const mimeIsAcceptable =
      normalisedMime === '' ||
      normalisedMime === 'application/octet-stream' ||
      (ACCEPTED_MIME_TYPES as readonly string[]).includes(normalisedMime);

    if (!hasAcceptedExtension || !mimeIsAcceptable) {
      throw AppError.unsupportedFileType(ACCEPTED_MIME_TYPES);
    }

    return ACCEPTED_MIME_TYPES[0];
  }
}

/**
 * Readers accept a `%PDF-` header that is not quite at byte zero, so search a
 * window rather than comparing the first five bytes and rejecting valid files.
 */
const PDF_HEADER_SEARCH_BYTES = 1024;

function looksLikePdf(head: Buffer): boolean {
  return head.includes(Buffer.from('%PDF-', 'latin1'));
}
