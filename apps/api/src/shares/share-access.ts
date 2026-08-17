import type { Capability, ShareModeValue, ShareRoleValue } from '@data-room/shared';

// Permission checks ask `can(access, 'node:update')` rather than comparing roles,
// so adding EDITOR later is one enum value in the schema plus one line here.
export const ROLE_CAPABILITIES: Record<ShareRoleValue, Capability[]> = {
  VIEWER: ['node:read', 'file:download'],
};

export type ShareDenialReason =
  'REVOKED' | 'EXPIRED' | 'TARGET_DELETED' | 'SIGN_IN_REQUIRED' | 'NOT_INVITED';

export interface ShareRecipientLike {
  email: string;
  userId: string | null;
  role: ShareRoleValue | null;
  revokedAt: Date | null;
}

export interface ShareLike {
  mode: ShareModeValue;
  role: ShareRoleValue;
  revokedAt: Date | null;
  expiresAt: Date | null;
  recipients: ShareRecipientLike[];
}

export interface ViewerLike {
  id: string;
  email: string;
}

export type ShareAccess =
  | { allowed: true; role: ShareRoleValue; capabilities: Capability[] }
  | { allowed: false; reason: ShareDenialReason; invitedEmails: string[] };

export function evaluateShareAccess(
  share: ShareLike,
  viewer: ViewerLike | null,
  options: { targetIsDeleted: boolean; now?: Date },
): ShareAccess {
  const now = options.now ?? new Date();
  const invitedEmails = share.recipients
    .filter((recipient) => !recipient.revokedAt)
    .map((recipient) => recipient.email);

  if (share.revokedAt) {
    return { allowed: false, reason: 'REVOKED', invitedEmails: [] };
  }

  if (share.expiresAt && share.expiresAt.getTime() <= now.getTime()) {
    return { allowed: false, reason: 'EXPIRED', invitedEmails: [] };
  }

  if (options.targetIsDeleted) {
    return { allowed: false, reason: 'TARGET_DELETED', invitedEmails: [] };
  }

  if (share.mode === 'PUBLIC_LINK') {
    return grant(share.role);
  }

  if (!viewer) {
    return { allowed: false, reason: 'SIGN_IN_REQUIRED', invitedEmails };
  }

  const recipient = findRecipient(share.recipients, viewer);

  if (!recipient) {
    return { allowed: false, reason: 'NOT_INVITED', invitedEmails };
  }

  return grant(recipient.role ?? share.role);
}

function findRecipient(
  recipients: ShareRecipientLike[],
  viewer: ViewerLike,
): ShareRecipientLike | undefined {
  return recipients.find(
    (recipient) =>
      !recipient.revokedAt &&
      (recipient.userId === viewer.id ||
        recipient.email.toLowerCase() === viewer.email.toLowerCase()),
  );
}

function grant(role: ShareRoleValue): ShareAccess {
  return { allowed: true, role, capabilities: ROLE_CAPABILITIES[role] };
}

export function can(access: ShareAccess, capability: Capability): boolean {
  return access.allowed && access.capabilities.includes(capability);
}

export function isNodeWithinShare(
  share: { dataRoomId: string; nodeId: string | null },
  node: { id: string; dataRoomId: string; ancestorIds: string[] },
): boolean {
  if (node.dataRoomId !== share.dataRoomId) {
    return false;
  }

  if (!share.nodeId) {
    return true;
  }

  return node.id === share.nodeId || node.ancestorIds.includes(share.nodeId);
}
