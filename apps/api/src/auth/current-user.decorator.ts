import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import { AppError } from '../common/app-error';
import type { AuthenticatedRequest, SessionUser } from './session.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw AppError.unauthenticated();
    }
    return request.user;
  },
);

export const OptionalUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser | null => {
    return context.switchToHttp().getRequest<AuthenticatedRequest>().user ?? null;
  },
);
