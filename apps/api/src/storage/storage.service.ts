export interface UploadTarget {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface SignedDownload {
  url: string;
  expiresAt: Date;
}

export interface StoredObject {
  sizeBytes: number;
  contentType: string | null;
}

export interface CreateUploadTargetOptions {
  contentType: string;
  maxBytes: number;
  ttlSeconds: number;
}

export interface CreateDownloadOptions {
  fileName: string;
  contentType: string;
  ttlSeconds: number;
  disposition: 'inline' | 'attachment';
}

export abstract class StorageService {
  abstract readonly driverName: string;

  abstract createUploadTarget(
    key: string,
    options: CreateUploadTargetOptions,
  ): Promise<UploadTarget>;

  abstract createDownloadUrl(key: string, options: CreateDownloadOptions): Promise<SignedDownload>;

  abstract statObject(key: string): Promise<StoredObject | null>;

  /**
   * First `byteCount` bytes of a stored object, for checking what was actually
   * uploaded. A range read rather than a download so verifying a 50 MB file costs
   * a kilobyte.
   */
  abstract readObjectHead(key: string, byteCount: number): Promise<Buffer | null>;

  abstract putObject(key: string, body: Buffer, contentType: string): Promise<void>;

  abstract removeObjects(keys: string[]): Promise<void>;
}
