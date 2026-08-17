import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SESSION_COOKIE_NAME } from '@data-room/shared';

import { AppError } from '../common/app-error';
import { AuthService } from './auth.service';
import { IS_PUBLIC_ROUTE } from './public.decorator';
import type { AuthenticatedRequest } from './session.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (token) {
      request.user = (await this.authService.verifySessionToken(token)) ?? undefined;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!request.user) {
      throw AppError.unauthenticated();
    }

    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const cookies = request.cookies as Record<string, string> | undefined;
    const fromCookie = cookies?.[SESSION_COOKIE_NAME];
    if (fromCookie) {
      return fromCookie;
    }

    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }

    return null;
  }
}
