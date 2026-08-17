import type { Request } from 'express';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface SessionTokenPayload {
  sub: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}
