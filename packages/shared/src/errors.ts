import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'ACCESS_DENIED',
  'NOT_FOUND',
  'NAME_CONFLICT',
  'INVALID_MOVE',
  'FOLDER_TOO_DEEP',
  'UPLOAD_TOO_LARGE',
  'UNSUPPORTED_FILE_TYPE',
  'UPLOAD_NOT_FINISHED',
  'SHARE_REVOKED',
  'SHARE_EXPIRED',
  'SHARE_TARGET_DELETED',
  'SHARE_SIGN_IN_REQUIRED',
  'EMAIL_ALREADY_REGISTERED',
  'INVALID_CREDENTIALS',
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ValidationDetails = Record<string, string[]>;
