import { z } from 'zod';

import type { SubtreeStatsDto } from './data-rooms';
import {
  type Capability,
  shareAccessActionSchema,
  shareModeSchema,
  shareRoleSchema,
  shareTargetTypeSchema,
  type ShareModeValue,
  type ShareRoleValue,
  type ShareTargetTypeValue,
} from './enums';
import type { BreadcrumbDto, NodeDto } from './nodes';
import { emailSchema } from './primitives';

export const createShareInputSchema = z
  .object({
    targetType: shareTargetTypeSchema,
    nodeId: z.uuid().nullish(),
    mode: shareModeSchema,
    role: shareRoleSchema.default('VIEWER'),
    recipients: z.array(emailSchema).max(50).default([]),
    expiresAt: z.iso.datetime({ offset: true }).nullish(),
  })
  .superRefine((value, ctx) => {
    if (value.targetType === 'NODE' && !value.nodeId) {
      ctx.addIssue({ code: 'custom', path: ['nodeId'], message: 'Pick something to share.' });
    }
    if (value.targetType === 'DATA_ROOM' && value.nodeId) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodeId'],
        message: 'A data room share cannot also target a node.',
      });
    }
    if (value.mode === 'RESTRICTED' && value.recipients.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['recipients'],
        message: 'Invite at least one person, or switch to a public link.',
      });
    }
  });
export type CreateShareInput = z.infer<typeof createShareInputSchema>;

export const addShareRecipientsInputSchema = z.object({
  recipients: z.array(emailSchema).min(1).max(50),
});
export type AddShareRecipientsInput = z.infer<typeof addShareRecipientsInputSchema>;

export const listShareEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListShareEventsQuery = z.infer<typeof listShareEventsQuerySchema>;

export interface ShareRecipientDto {
  id: string;
  email: string;
  userId: string | null;
  name: string | null;
  invitedAt: string;
  revokedAt: string | null;
}

export interface ShareDto {
  id: string;
  dataRoomId: string;
  targetType: ShareTargetTypeValue;
  nodeId: string | null;
  targetName: string;
  mode: ShareModeValue;
  role: ShareRoleValue;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  recipients: ShareRecipientDto[];
  accessCount: number;
}

export interface ShareAccessEventDto {
  id: string;
  action: z.infer<typeof shareAccessActionSchema>;
  actor: { id: string | null; name: string | null; email: string | null };
  nodeName: string | null;
  createdAt: string;
}

export interface ReceivedShareDto {
  id: string;
  token: string;
  url: string;
  dataRoomName: string;
  targetName: string;
  targetType: ShareTargetTypeValue;
  sharedBy: { name: string; email: string };
  createdAt: string;
  expiresAt: string | null;
}

export interface SharedTargetDto {
  token: string;
  mode: ShareModeValue;
  dataRoomName: string;
  targetType: ShareTargetTypeValue;
  rootNode: NodeDto | null;
  breadcrumbs: BreadcrumbDto[];
  capabilities: Capability[];
  stats: SubtreeStatsDto;
  sharedBy: { name: string; email: string };
  expiresAt: string | null;
}
