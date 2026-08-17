import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorBody, ApiErrorCode, ValidationDetails } from '@data-room/shared';

export class AppError extends HttpException {
  readonly code: ApiErrorCode;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown>,
  ) {
    const body: ApiErrorBody = {
      statusCode: status,
      code,
      message,
      ...(details ? { details } : {}),
    };
    super(body, status);
    this.code = code;
  }

  static validationFailed(fields: ValidationDetails): AppError {
    return new AppError(
      'VALIDATION_FAILED',
      'Some fields need attention.',
      HttpStatus.BAD_REQUEST,
      { fields },
    );
  }

  static unauthenticated(message = 'Sign in to continue.'): AppError {
    return new AppError('UNAUTHENTICATED', message, HttpStatus.UNAUTHORIZED);
  }

  static accessDenied(message = 'You do not have access to this.'): AppError {
    return new AppError('ACCESS_DENIED', message, HttpStatus.FORBIDDEN);
  }

  static notFound(what = 'That item'): AppError {
    return new AppError('NOT_FOUND', `${what} could not be found.`, HttpStatus.NOT_FOUND);
  }

  static nameConflict(name: string, suggestedName: string): AppError {
    return new AppError(
      'NAME_CONFLICT',
      `"${name}" already exists in this folder.`,
      HttpStatus.CONFLICT,
      { name, suggestedName },
    );
  }

  static invalidMove(message: string): AppError {
    return new AppError('INVALID_MOVE', message, HttpStatus.BAD_REQUEST);
  }

  static folderTooDeep(maxDepth: number): AppError {
    return new AppError(
      'FOLDER_TOO_DEEP',
      `Folders can only be nested ${maxDepth} levels deep.`,
      HttpStatus.BAD_REQUEST,
      { maxDepth },
    );
  }

  static uploadTooLarge(maxBytes: number): AppError {
    return new AppError(
      'UPLOAD_TOO_LARGE',
      'That file is larger than the upload limit.',
      HttpStatus.PAYLOAD_TOO_LARGE,
      { maxBytes },
    );
  }

  static unsupportedFileType(accepted: readonly string[]): AppError {
    return new AppError(
      'UNSUPPORTED_FILE_TYPE',
      'Only PDF files can be uploaded.',
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      { accepted },
    );
  }

  static uploadNotFinished(): AppError {
    return new AppError(
      'UPLOAD_NOT_FINISHED',
      'The file never finished uploading. Try again.',
      HttpStatus.BAD_REQUEST,
    );
  }

  static shareRevoked(): AppError {
    return new AppError(
      'SHARE_REVOKED',
      'The owner has turned off access to this link.',
      HttpStatus.FORBIDDEN,
    );
  }

  static shareExpired(): AppError {
    return new AppError('SHARE_EXPIRED', 'This link has expired.', HttpStatus.FORBIDDEN);
  }

  static shareTargetDeleted(): AppError {
    return new AppError(
      'SHARE_TARGET_DELETED',
      'The shared item has been deleted by its owner.',
      HttpStatus.GONE,
    );
  }

  static shareSignInRequired(invitedEmails: string[]): AppError {
    return new AppError(
      'SHARE_SIGN_IN_REQUIRED',
      'This link is restricted to invited people. Sign in to view it.',
      HttpStatus.UNAUTHORIZED,
      { invitedEmails },
    );
  }

  static emailAlreadyRegistered(): AppError {
    return new AppError(
      'EMAIL_ALREADY_REGISTERED',
      'An account with that email already exists.',
      HttpStatus.CONFLICT,
    );
  }

  static invalidCredentials(): AppError {
    return new AppError(
      'INVALID_CREDENTIALS',
      'That email and password combination is not right.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
