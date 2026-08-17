import { z } from 'zod';

export const nodeTypeSchema = z.enum(['FOLDER', 'FILE']);
export type NodeTypeValue = z.infer<typeof nodeTypeSchema>;

export const fileVersionStatusSchema = z.enum(['PENDING', 'READY']);
export type FileVersionStatusValue = z.infer<typeof fileVersionStatusSchema>;

export const shareTargetTypeSchema = z.enum(['DATA_ROOM', 'NODE']);
export type ShareTargetTypeValue = z.infer<typeof shareTargetTypeSchema>;

export const shareModeSchema = z.enum(['PUBLIC_LINK', 'RESTRICTED']);
export type ShareModeValue = z.infer<typeof shareModeSchema>;

export const shareRoleSchema = z.enum(['VIEWER']);
export type ShareRoleValue = z.infer<typeof shareRoleSchema>;

export const shareAccessActionSchema = z.enum(['LIST', 'VIEW', 'DOWNLOAD']);
export type ShareAccessActionValue = z.infer<typeof shareAccessActionSchema>;

export const capabilitySchema = z.enum([
  'node:read',
  'node:create',
  'node:update',
  'node:delete',
  'file:download',
  'share:manage',
]);
export type Capability = z.infer<typeof capabilitySchema>;

export const conflictStrategySchema = z.enum(['FAIL', 'RENAME', 'VERSION']);
export type ConflictStrategy = z.infer<typeof conflictStrategySchema>;
