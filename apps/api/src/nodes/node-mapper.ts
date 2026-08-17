import { Prisma } from '@data-room/db';
import type { NodeDto } from '@data-room/shared';

import type { NodeCursor } from './node-cursor';

export const nodeSelect = {
  id: true,
  dataRoomId: true,
  parentId: true,
  type: true,
  name: true,
  depth: true,
  ancestorIds: true,
  sizeBytes: true,
  mimeType: true,
  versionCount: true,
  currentVersionId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.NodeSelect;

export type NodeRow = Prisma.NodeGetPayload<{ select: typeof nodeSelect }>;

export function toNodeDto(row: NodeRow, options: { isShared?: boolean } = {}): NodeDto {
  return {
    id: row.id,
    dataRoomId: row.dataRoomId,
    parentId: row.parentId,
    type: row.type,
    name: row.name,
    depth: row.depth,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    file:
      row.type === 'FILE' && row.currentVersionId
        ? {
            versionId: row.currentVersionId,
            version: row.versionCount,
            versionCount: row.versionCount,
            sizeBytes: row.sizeBytes,
            mimeType: row.mimeType ?? 'application/octet-stream',
          }
        : null,
    isShared: options.isShared ?? false,
  };
}

export function toNodeCursor(row: NodeRow): NodeCursor {
  return {
    type: row.type,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    sizeBytes: row.sizeBytes,
    id: row.id,
  };
}
