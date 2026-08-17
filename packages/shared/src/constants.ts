export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = ['application/pdf'] as const;

export const ACCEPTED_FILE_EXTENSIONS = ['.pdf'] as const;

export const MAX_NAME_LENGTH = 255;

export const MAX_FOLDER_DEPTH = 32;

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export const DOWNLOAD_URL_TTL_SECONDS = 60;

export const UPLOAD_URL_TTL_SECONDS = 15 * 60;

const ILLEGAL_NAME_CODE_POINTS = new Set([0x2f, 0x5c, 0x3c, 0x3e, 0x3a, 0x22, 0x7c, 0x3f, 0x2a]);

export function containsIllegalNameChar(value: string): boolean {
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    if (codePoint < 0x20 || codePoint === 0x7f || ILLEGAL_NAME_CODE_POINTS.has(codePoint)) {
      return true;
    }
  }
  return false;
}

export const SESSION_COOKIE_NAME = 'data_room_session';
