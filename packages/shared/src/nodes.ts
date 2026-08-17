import { z } from 'zod';

import { MAX_UPLOAD_BYTES } from './constants';
import type { SubtreeStatsDto } from './data-rooms';
import { conflictStrategySchema, type NodeTypeValue } from './enums';
import { validateNodeName } from './naming';
import { cursorQuerySchema } from './pagination';

export const nodeNameSchema = z
  .string()
  .transform((value) => value.trim())
  .superRefine((value, ctx) => {
    const problem = validateNodeName(value);
    if (problem) {
      ctx.addIssue({ code: 'custom', message: problem });
    }
  });

const parentIdSchema = z.uuid().nullable();

export const createFolderInputSchema = z.object({
  name: nodeNameSchema,
  parentId: parentIdSchema.default(null),
});
export type CreateFolderInput = z.infer<typeof createFolderInputSchema>;

export const renameNodeInputSchema = z.object({
  name: nodeNameSchema,
  autoResolveConflict: z.boolean().default(false),
});
export type RenameNodeInput = z.infer<typeof renameNodeInputSchema>;

export const moveNodeInputSchema = z.object({
  parentId: parentIdSchema,
  autoResolveConflict: z.boolean().default(false),
});
export type MoveNodeInput = z.infer<typeof moveNodeInputSchema>;

export const nodeSortSchema = z.enum(['name', 'updatedAt', 'size']);
export type NodeSort = z.infer<typeof nodeSortSchema>;

export const sortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

export const listNodesQuerySchema = cursorQuerySchema.extend({
  parentId: z.uuid().optional(),
  sort: nodeSortSchema.default('name'),
  direction: sortDirectionSchema.default('asc'),
});
export type ListNodesQuery = z.infer<typeof listNodesQuerySchema>;

export const searchNodesQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  type: z.enum(['FOLDER', 'FILE', 'ANY']).default('ANY'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchNodesQuery = z.infer<typeof searchNodesQuerySchema>;

export const initUploadInputSchema = z.object({
  name: nodeNameSchema,
  parentId: parentIdSchema.default(null),
  mimeType: z.string().max(200),
  sizeBytes: z
    .number()
    .int()
    .positive('The file is empty.')
    .max(MAX_UPLOAD_BYTES, 'That file is larger than the 50 MB limit.'),
  conflictStrategy: conflictStrategySchema.default('FAIL'),
});
export type InitUploadInput = z.infer<typeof initUploadInputSchema>;

export interface FileSummaryDto {
  versionId: string;
  version: number;
  versionCount: number;
  sizeBytes: number;
  mimeType: string;
}

export interface NodeDto {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  type: NodeTypeValue;
  name: string;
  depth: number;
  createdAt: string;
  updatedAt: string;
  file: FileSummaryDto | null;
  isShared: boolean;
}

export interface BreadcrumbDto {
  id: string | null;
  name: string;
}

export interface FileVersionDto {
  id: string;
  version: number;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  isCurrent: boolean;
  uploadedBy: { id: string; name: string; email: string };
}

export interface InitUploadResultDto {
  nodeId: string;
  versionId: string;
  name: string;
  version: number;
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface SignedUrlDto {
  url: string;
  expiresAt: string;
}

export interface DeletePreviewDto extends SubtreeStatsDto {
  name: string;
  type: NodeTypeValue;
  affectedShareCount: number;
}

export interface SearchResultDto extends NodeDto {
  path: BreadcrumbDto[];
}
