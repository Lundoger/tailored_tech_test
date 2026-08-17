import type { ApiErrorBody, ApiErrorCode, ValidationDetails } from '@data-room/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: Record<string, unknown>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.statusCode;
    this.code = body.code;
    this.details = body.details ?? {};
  }

  get fieldErrors(): ValidationDetails | null {
    const fields = this.details.fields;
    return isValidationDetails(fields) ? fields : null;
  }

  get suggestedName(): string | null {
    return typeof this.details.suggestedName === 'string' ? this.details.suggestedName : null;
  }

  is(...codes: ApiErrorCode[]): boolean {
    return codes.includes(this.code);
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Could not reach the server. Check your connection and try again.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

function isValidationDetails(value: unknown): value is ValidationDetails {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === 'string'),
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
