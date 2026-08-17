import { describe, expect, it } from 'vitest';

import {
  can,
  evaluateShareAccess,
  isNodeWithinShare,
  type ShareLike,
  type ViewerLike,
} from './share-access';

const NOW = new Date('2026-08-14T12:00:00.000Z');

const viewer: ViewerLike = { id: 'user-1', email: 'sam@acme.test' };
const stranger: ViewerLike = { id: 'user-2', email: 'nosy@elsewhere.test' };

function share(overrides: Partial<ShareLike> = {}): ShareLike {
  return {
    mode: 'PUBLIC_LINK',
    role: 'VIEWER',
    revokedAt: null,
    expiresAt: null,
    recipients: [],
    ...overrides,
  };
}

const live = { targetIsDeleted: false, now: NOW };

describe('evaluateShareAccess — public links', () => {
  it('lets an anonymous visitor in', () => {
    const access = evaluateShareAccess(share(), null, live);
    expect(access.allowed).toBe(true);
  });

  it('grants read and download, and nothing that writes', () => {
    const access = evaluateShareAccess(share(), null, live);

    expect(can(access, 'node:read')).toBe(true);
    expect(can(access, 'file:download')).toBe(true);
    expect(can(access, 'node:update')).toBe(false);
    expect(can(access, 'node:delete')).toBe(false);
    expect(can(access, 'share:manage')).toBe(false);
  });
});

describe('evaluateShareAccess — restricted links', () => {
  const restricted = share({
    mode: 'RESTRICTED',
    recipients: [{ email: 'sam@acme.test', userId: null, role: null, revokedAt: null }],
  });

  it('asks an anonymous visitor to sign in, and says as whom', () => {
    const access = evaluateShareAccess(restricted, null, live);

    expect(access).toMatchObject({
      allowed: false,
      reason: 'SIGN_IN_REQUIRED',
      invitedEmails: ['sam@acme.test'],
    });
  });

  it('admits an invited person matched by email before they have an account', () => {
    expect(evaluateShareAccess(restricted, viewer, live).allowed).toBe(true);
  });

  it('admits an invited person matched by bound account id', () => {
    const bound = share({
      mode: 'RESTRICTED',
      recipients: [
        { email: 'old-address@acme.test', userId: 'user-1', role: null, revokedAt: null },
      ],
    });

    expect(evaluateShareAccess(bound, viewer, live).allowed).toBe(true);
  });

  it('ignores case when matching the address', () => {
    const upper = share({
      mode: 'RESTRICTED',
      recipients: [{ email: 'SAM@ACME.TEST', userId: null, role: null, revokedAt: null }],
    });

    expect(evaluateShareAccess(upper, viewer, live).allowed).toBe(true);
  });

  it('refuses someone who was never invited', () => {
    expect(evaluateShareAccess(restricted, stranger, live)).toMatchObject({
      allowed: false,
      reason: 'NOT_INVITED',
    });
  });

  it('refuses a recipient whose own invitation was withdrawn', () => {
    const withdrawn = share({
      mode: 'RESTRICTED',
      recipients: [{ email: 'sam@acme.test', userId: 'user-1', role: null, revokedAt: NOW }],
    });

    expect(evaluateShareAccess(withdrawn, viewer, live)).toMatchObject({
      allowed: false,
      reason: 'NOT_INVITED',
    });
  });

  it('does not list withdrawn recipients in the sign-in prompt', () => {
    const mixed = share({
      mode: 'RESTRICTED',
      recipients: [
        { email: 'sam@acme.test', userId: null, role: null, revokedAt: null },
        { email: 'gone@acme.test', userId: null, role: null, revokedAt: NOW },
      ],
    });

    const access = evaluateShareAccess(mixed, null, live);
    expect(access.allowed).toBe(false);
    if (!access.allowed) {
      expect(access.invitedEmails).toEqual(['sam@acme.test']);
    }
  });
});

describe('evaluateShareAccess — the link is dead', () => {
  it('reports a revoked share, for everyone', () => {
    expect(evaluateShareAccess(share({ revokedAt: NOW }), viewer, live)).toMatchObject({
      allowed: false,
      reason: 'REVOKED',
    });
  });

  it('reports an expired share', () => {
    const expired = share({ expiresAt: new Date('2026-08-14T11:59:59.000Z') });

    expect(evaluateShareAccess(expired, null, live)).toMatchObject({
      allowed: false,
      reason: 'EXPIRED',
    });
  });

  it('treats expiry as exclusive at the exact instant', () => {
    const expiring = share({ expiresAt: NOW });
    expect(evaluateShareAccess(expiring, null, live).allowed).toBe(false);
  });

  it('still works a moment before expiry', () => {
    const expiring = share({ expiresAt: new Date('2026-08-14T12:00:01.000Z') });
    expect(evaluateShareAccess(expiring, null, live).allowed).toBe(true);
  });

  it('reports a deleted target', () => {
    expect(evaluateShareAccess(share(), null, { targetIsDeleted: true, now: NOW })).toMatchObject({
      allowed: false,
      reason: 'TARGET_DELETED',
    });
  });

  it('reports revocation ahead of deletion, since the owner acted first', () => {
    expect(
      evaluateShareAccess(share({ revokedAt: NOW }), null, { targetIsDeleted: true, now: NOW }),
    ).toMatchObject({ reason: 'REVOKED' });
  });

  it('does not ask an anonymous visitor to sign in for a link that is already dead', () => {
    const dead = share({
      mode: 'RESTRICTED',
      revokedAt: NOW,
      recipients: [{ email: 'sam@acme.test', userId: null, role: null, revokedAt: null }],
    });

    expect(evaluateShareAccess(dead, null, live)).toMatchObject({ reason: 'REVOKED' });
  });
});

describe('isNodeWithinShare', () => {
  const node = { id: 'node-3', dataRoomId: 'room-1', ancestorIds: ['node-1', 'node-2'] };

  it('a data-room share covers everything in that room', () => {
    expect(isNodeWithinShare({ dataRoomId: 'room-1', nodeId: null }, node)).toBe(true);
  });

  it('never reaches across data rooms', () => {
    expect(isNodeWithinShare({ dataRoomId: 'room-2', nodeId: null }, node)).toBe(false);
  });

  it('covers the shared node itself', () => {
    expect(isNodeWithinShare({ dataRoomId: 'room-1', nodeId: 'node-3' }, node)).toBe(true);
  });

  it('covers a descendant, at any depth', () => {
    expect(isNodeWithinShare({ dataRoomId: 'room-1', nodeId: 'node-1' }, node)).toBe(true);
    expect(isNodeWithinShare({ dataRoomId: 'room-1', nodeId: 'node-2' }, node)).toBe(true);
  });

  it('does not cover a sibling or an unrelated branch', () => {
    expect(isNodeWithinShare({ dataRoomId: 'room-1', nodeId: 'node-9' }, node)).toBe(false);
  });

  it('does not cover the parent of the shared folder', () => {
    const parent = { id: 'node-1', dataRoomId: 'room-1', ancestorIds: [] };
    expect(isNodeWithinShare({ dataRoomId: 'room-1', nodeId: 'node-2' }, parent)).toBe(false);
  });
});
