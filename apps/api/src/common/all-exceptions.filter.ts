import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorBody, ApiErrorCode } from '@data-room/shared';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const body = this.toErrorBody(exception);

    if (body.statusCode >= SERVER_ERROR_FROM) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown): ApiErrorBody {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const status = exception.getStatus();

      if (typeof payload === 'object' && payload !== null && 'code' in payload) {
        return payload as ApiErrorBody;
      }

      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string }).message ?? exception.message);

      return {
        statusCode: status,
        code: CODE_BY_STATUS[status] ?? 'VALIDATION_FAILED',
        message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'VALIDATION_FAILED',
      message: 'Something went wrong on our side. Please try again.',
    };
  }
}

const SERVER_ERROR_FROM: number = HttpStatus.INTERNAL_SERVER_ERROR;

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'ACCESS_DENIED',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
};
