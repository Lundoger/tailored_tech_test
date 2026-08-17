import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@data-room/db';
import {
  type BreadcrumbDto,
  type CreateFolderInput,
  type DeletePreviewDto,
  type ListNodesQuery,
  MAX_FOLDER_DEPTH,
  type MoveNodeInput,
  type NodeDto,
  type Page,
  type RenameNodeInput,
  type SearchNodesQuery,
  type SearchResultDto,
  type SubtreeStatsDto,
} from '@data-room/shared';

import { AppError } from '../common/app-error';
import { DataRoomsService } from '../data-rooms/data-rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { decodeNodeCursor, encodeNodeCursor, nodeKeysetFilter, nodeOrderBy } from './node-cursor';
import { type NodeRow, nodeSelect, toNodeCursor, toNodeDto } from './node-mapper';
import { withResolvedName } from './node-naming';
import { childAncestorIds, depthOf, moveProblem } from './node-tree';

const MAX_TREE_FOLDERS = 2000;

@Injectable()
export class NodesService {
  private readonly logger = new Logger(NodesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataRooms: DataRoomsService,
    private readonly storage: StorageService,
  ) {}

  async list(userId: string, dataRoomId: string, query: ListNodesQuery): Promise<Page<NodeDto>> {
    await this.dataRooms.requireOwned(userId, dataRoomId);

    const parentId = query.parentId ?? null;
    if (parentId) {
      await this.requireFolder(dataRoomId, parentId);
    }

    return this.listChildren({
      dataRoomId,
      parentId,
      sort: query.sort,
      direction: query.direction,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async listChildren(params: {
    dataRoomId: string;
    parentId: string | null;
    sort: ListNodesQuery['sort'];
    direction: ListNodesQuery['direction'];
    cursor?: string;
    limit: number;
  }): Promise<Page<NodeDto>> {
    const cursor = decodeNodeCursor(params.cursor);

    const rows = await this.prisma.node.findMany({
      where: {
        dataRoomId: params.dataRoomId,
        parentId: params.parentId,
        deletedAt: null,
        AND: [
          { OR: [{ type: 'FOLDER' }, { currentVersionId: { not: null } }] },
          ...(cursor ? [{ OR: nodeKeysetFilter(cursor, params.sort, params.direction) }] : []),
        ],
      },
      orderBy: nodeOrderBy(params.sort, params.direction),
      take: params.limit + 1,
      select: nodeSelect,
    });

    const hasMore = rows.length > params.limit;
    const items = hasMore ? rows.slice(0, params.limit) : rows;
    const sharedIds = await this.directlySharedIds(items.map((row) => row.id));

    return {
      items: items.map((row) => toNodeDto(row, { isShared: sharedIds.has(row.id) })),
      nextCursor:
        hasMore && items.length > 0
          ? encodeNodeCursor(toNodeCursor(items[items.length - 1] as NodeRow))
          : null,
    };
  }

  async breadcrumbs(
    userId: string,
    dataRoomId: string,
    folderId: string | null,
  ): Promise<BreadcrumbDto[]> {
    const room = await this.dataRooms.requireOwned(userId, dataRoomId);
    return this.breadcrumbsFor(room.name, dataRoomId, folderId);
  }

  async breadcrumbsFor(
    rootName: string,
    dataRoomId: string,
    folderId: string | null,
    stopAtNodeId?: string,
  ): Promise<BreadcrumbDto[]> {
    const root: BreadcrumbDto = { id: null, name: rootName };
    if (!folderId) return [root];

    const folder = await this.prisma.node.findFirst({
      where: { id: folderId, dataRoomId, deletedAt: null },
      select: { id: true, name: true, ancestorIds: true },
    });

    if (!folder) {
      throw AppError.notFound('That folder');
    }

    const stopIndex = stopAtNodeId ? folder.ancestorIds.indexOf(stopAtNodeId) : -1;
    const visibleAncestorIds =
      stopIndex >= 0
        ? folder.ancestorIds.slice(stopIndex + 1)
        : stopAtNodeId
          ? []
          : folder.ancestorIds;

    const ancestors = await this.prisma.node.findMany({
      where: { id: { in: visibleAncestorIds } },
      select: { id: true, name: true },
    });

    const nameById = new Map(ancestors.map((node) => [node.id, node.name]));

    return [
      root,
      ...visibleAncestorIds.map((id) => ({ id, name: nameById.get(id) ?? 'Unknown folder' })),
      { id: folder.id, name: folder.name },
    ];
  }

  async subtreeStats(dataRoomId: string, nodeId: string | null): Promise<SubtreeStatsDto> {
    const grouped = await this.prisma.node.groupBy({
      by: ['type'],
      where: {
        dataRoomId,
        deletedAt: null,
        ...(nodeId ? { ancestorIds: { has: nodeId } } : {}),
      },
      _count: { _all: true },
      _sum: { sizeBytes: true },
    });

    const stats: SubtreeStatsDto = { folderCount: 0, fileCount: 0, totalSizeBytes: 0 };

    for (const group of grouped) {
      if (group.type === 'FOLDER') {
        stats.folderCount += group._count._all;
      } else {
        stats.fileCount += group._count._all;
        stats.totalSizeBytes += group._sum.sizeBytes ?? 0;
      }
    }

    return stats;
  }

  async statsFor(userId: string, nodeId: string): Promise<SubtreeStatsDto> {
    const node = await this.requireOwnedNode(userId, nodeId);
    return this.subtreeStats(node.dataRoomId, node.id);
  }

  async deletePreview(userId: string, nodeId: string): Promise<DeletePreviewDto> {
    const node = await this.requireOwnedNode(userId, nodeId);

    const [stats, affectedShareCount] = await Promise.all([
      this.subtreeStats(node.dataRoomId, node.id),
      this.prisma.share.count({
        where: {
          revokedAt: null,
          OR: [{ nodeId: node.id }, { node: { ancestorIds: { has: node.id } } }],
        },
      }),
    ]);

    return {
      name: node.name,
      type: node.type,
      folderCount: stats.folderCount,
      fileCount: node.type === 'FILE' ? 1 : stats.fileCount,
      totalSizeBytes: node.type === 'FILE' ? node.sizeBytes : stats.totalSizeBytes,
      affectedShareCount,
    };
  }

  async folderTree(
    userId: string,
    dataRoomId: string,
  ): Promise<Array<{ id: string; name: string; parentId: string | null; depth: number }>> {
    await this.dataRooms.requireOwned(userId, dataRoomId);

    return this.prisma.node.findMany({
      where: { dataRoomId, type: 'FOLDER', deletedAt: null },
      orderBy: [{ depth: 'asc' }, { name: 'asc' }],
      take: MAX_TREE_FOLDERS,
      select: { id: true, name: true, parentId: true, depth: true },
    });
  }

  // Raw SQL because the trigram index is on `lower("name")`. Prisma's `contains`
  // with `mode: 'insensitive'` emits `name ILIKE …`, which cannot use an index built
  // on an expression and falls back to a sequential scan.
  async search(
    userId: string,
    dataRoomId: string,
    query: SearchNodesQuery,
  ): Promise<SearchResultDto[]> {
    await this.dataRooms.requireOwned(userId, dataRoomId);

    const term = query.q.toLowerCase();
    const typeFilter =
      query.type === 'ANY' ? Prisma.empty : Prisma.sql`AND n."type" = ${query.type}::"NodeType"`;

    const rows = await this.prisma.$queryRaw<RawNodeRow[]>(Prisma.sql`
      SELECT n."id", n."dataRoomId", n."parentId", n."type"::text AS "type", n."name",
             n."depth", n."ancestorIds", n."sizeBytes", n."mimeType", n."versionCount",
             n."currentVersionId", n."createdAt", n."updatedAt"
      FROM "Node" n
      WHERE n."dataRoomId" = ${dataRoomId}::uuid
        AND n."deletedAt" IS NULL
        AND (n."type" = 'FOLDER' OR n."currentVersionId" IS NOT NULL)
        ${typeFilter}
        AND lower(n."name") LIKE ${`%${term}%`}
      ORDER BY similarity(lower(n."name"), ${term}) DESC, n."name" ASC
      LIMIT ${query.limit}
    `);

    if (rows.length === 0) return [];

    const pathNames = await this.namesFor(rows.flatMap((row) => row.ancestorIds));
    const sharedIds = await this.directlySharedIds(rows.map((row) => row.id));

    return rows.map((row) => ({
      ...toNodeDto(row as unknown as NodeRow, { isShared: sharedIds.has(row.id) }),
      path: row.ancestorIds.map((id) => ({ id, name: pathNames.get(id) ?? 'Unknown folder' })),
    }));
  }

  async createFolder(
    userId: string,
    dataRoomId: string,
    input: CreateFolderInput,
  ): Promise<NodeDto> {
    await this.dataRooms.requireOwned(userId, dataRoomId);

    const parent = input.parentId ? await this.requireFolder(dataRoomId, input.parentId) : null;
    const ancestorIds = childAncestorIds(parent);

    if (depthOf(ancestorIds) >= MAX_FOLDER_DEPTH) {
      throw AppError.folderTooDeep(MAX_FOLDER_DEPTH);
    }

    const row = await withResolvedName(
      this.prisma,
      {
        dataRoomId,
        parentId: input.parentId,
        desiredName: input.name,
        strategy: 'FAIL',
      },
      (resolved, tx) =>
        tx.node.create({
          data: {
            dataRoomId,
            parentId: input.parentId,
            type: 'FOLDER',
            name: resolved.name,
            ancestorIds,
            depth: depthOf(ancestorIds),
            createdById: userId,
          },
          select: nodeSelect,
        }),
    );

    return toNodeDto(row);
  }

  async rename(userId: string, nodeId: string, input: RenameNodeInput): Promise<NodeDto> {
    const node = await this.requireOwnedNode(userId, nodeId);

    if (node.name === input.name) {
      return toNodeDto(node);
    }

    const row = await withResolvedName(
      this.prisma,
      {
        dataRoomId: node.dataRoomId,
        parentId: node.parentId,
        desiredName: input.name,
        strategy: input.autoResolveConflict ? 'RENAME' : 'FAIL',
        excludeNodeId: node.id,
      },
      (resolved, tx) =>
        tx.node.update({
          where: { id: node.id },
          data: { name: resolved.name },
          select: nodeSelect,
        }),
    );

    return toNodeDto(row);
  }

  async move(userId: string, nodeId: string, input: MoveNodeInput): Promise<NodeDto> {
    const node = await this.requireOwnedNode(userId, nodeId);

    if (node.parentId === input.parentId) {
      return toNodeDto(node);
    }

    const target = input.parentId
      ? await this.requireFolder(node.dataRoomId, input.parentId)
      : null;

    const problem = moveProblem(node, target, {
      sourceSubtreeHeight: await this.subtreeHeight(node),
    });
    if (problem) {
      throw AppError.invalidMove(problem);
    }

    const newAncestorIds = childAncestorIds(target);
    const oldAncestorCount = node.ancestorIds.length;

    const row = await withResolvedName(
      this.prisma,
      {
        dataRoomId: node.dataRoomId,
        parentId: input.parentId,
        desiredName: node.name,
        strategy: input.autoResolveConflict ? 'RENAME' : 'FAIL',
        excludeNodeId: node.id,
      },
      async (resolved, tx) => {
        const moved = await tx.node.update({
          where: { id: node.id },
          data: {
            parentId: input.parentId,
            name: resolved.name,
            ancestorIds: newAncestorIds,
            depth: depthOf(newAncestorIds),
          },
          select: nodeSelect,
        });

        // Re-base the whole subtree in one statement: swap the leading segment of
        // every descendant's ancestor chain and keep the rest. `rewriteAncestorIds`
        // is the same operation in readable form, and what the tests assert.
        await tx.$executeRaw`
          UPDATE "Node"
          SET "ancestorIds" = ${newAncestorIds}::uuid[] || "ancestorIds"[${oldAncestorCount + 1}:],
              "depth" = coalesce(
                array_length(${newAncestorIds}::uuid[] || "ancestorIds"[${oldAncestorCount + 1}:], 1),
                0
              ),
              "updatedAt" = now()
          WHERE "dataRoomId" = ${node.dataRoomId}::uuid
            AND ${node.id}::uuid = ANY("ancestorIds")
        `;

        return moved;
      },
    );

    return toNodeDto(row);
  }

  async remove(userId: string, nodeId: string): Promise<void> {
    const node = await this.requireOwnedNode(userId, nodeId);
    const deletedAt = new Date();

    const subtreeFilter = {
      dataRoomId: node.dataRoomId,
      deletedAt: null,
      OR: [{ id: node.id }, { ancestorIds: { has: node.id } }],
    } satisfies Prisma.NodeWhereInput;

    const storageKeys = await this.prisma.fileVersion.findMany({
      where: { node: subtreeFilter },
      select: { storageKey: true },
    });

    await this.prisma.node.updateMany({ where: subtreeFilter, data: { deletedAt } });

    if (storageKeys.length > 0) {
      try {
        await this.storage.removeObjects(storageKeys.map((version) => version.storageKey));
      } catch (error) {
        this.logger.warn(`Deleted ${node.id} but could not clean up storage: ${String(error)}`);
      }
    }
  }

  async requireOwnedNode(userId: string, nodeId: string): Promise<NodeRow> {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, deletedAt: null, dataRoom: { ownerId: userId, deletedAt: null } },
      select: nodeSelect,
    });

    if (!node) {
      throw AppError.notFound('That item');
    }

    return node;
  }

  async requireFolder(dataRoomId: string, folderId: string): Promise<NodeRow> {
    const folder = await this.prisma.node.findFirst({
      where: { id: folderId, dataRoomId, type: 'FOLDER', deletedAt: null },
      select: nodeSelect,
    });

    if (!folder) {
      throw AppError.notFound('That folder');
    }

    return folder;
  }

  private async subtreeHeight(node: NodeRow): Promise<number> {
    const deepest = await this.prisma.node.aggregate({
      where: { dataRoomId: node.dataRoomId, deletedAt: null, ancestorIds: { has: node.id } },
      _max: { depth: true },
    });

    return Math.max(0, (deepest._max.depth ?? node.depth) - node.depth);
  }

  private async directlySharedIds(nodeIds: string[]): Promise<Set<string>> {
    if (nodeIds.length === 0) return new Set();

    const shares = await this.prisma.share.findMany({
      where: { nodeId: { in: nodeIds }, revokedAt: null },
      select: { nodeId: true },
      distinct: ['nodeId'],
    });

    return new Set(shares.map((share) => share.nodeId).filter((id): id is string => id !== null));
  }

  private async namesFor(nodeIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(nodeIds)];
    if (unique.length === 0) return new Map();

    const nodes = await this.prisma.node.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });

    return new Map(nodes.map((node) => [node.id, node.name]));
  }
}

interface RawNodeRow {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  type: 'FOLDER' | 'FILE';
  name: string;
  depth: number;
  ancestorIds: string[];
  sizeBytes: number;
  mimeType: string | null;
  versionCount: number;
  currentVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
