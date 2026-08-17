import { createHmac, timingSafeEqual } from 'node:crypto';

export interface LocalGrant {
  key: string;
  mode: 'upload' | 'download';
  exp: number;
  contentType?: string;
  maxBytes?: number;
  fileName?: string;
  disposition?: 'inline' | 'attachment';
}

export function signLocalGrant(grant: LocalGrant, secret: string): string {
  const payload = Buffer.from(JSON.stringify(grant), 'utf8').toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyLocalGrant(token: string, secret: string): LocalGrant | null {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  if (!signaturesMatch(sign(payload, secret), signature)) {
    return null;
  }

  try {
    const grant = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as LocalGrant;
    if (typeof grant.key !== 'string' || typeof grant.exp !== 'number') return null;
    if (grant.exp * 1000 < Date.now()) return null;
    if (grant.mode !== 'upload' && grant.mode !== 'download') return null;
    return grant;
  } catch {
    return null;
  }
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function signaturesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
