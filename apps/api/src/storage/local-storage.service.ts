import { createReadStream } from 'node:fs';
import { type FileHandle, mkdir, open, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { signLocalGrant } from './local-grant';
import {
  type CreateDownloadOptions,
  type CreateUploadTargetOptions,
  type SignedDownload,
  StorageService,
  type StoredObject,
  type UploadTarget,
} from './storage.service';

@Injectable()
export class LocalStorageService extends StorageService {
  readonly driverName = 'local';

  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root: string;
  private readonly secret: string;
  private readonly urlPrefix: string;

  constructor(config: AppConfigService) {
    super();
    this.root = resolve(process.cwd(), config.env.LOCAL_STORAGE_DIR);
    this.secret = config.env.JWT_SECRET;
    // Default to the web app's proxy path so the browser uploads to its own origin.
    // PUBLIC_API_ORIGIN switches to absolute URLs for clients that talk to the API
    // directly.
    this.urlPrefix = config.env.PUBLIC_API_ORIGIN
      ? `${config.env.PUBLIC_API_ORIGIN.replace(/\/+$/, '')}/storage/local`
      : '/api/storage/local';
  }

  async createUploadTarget(key: string, options: CreateUploadTargetOptions): Promise<UploadTarget> {
    const expiresAt = new Date(Date.now() + options.ttlSeconds * 1000);
    const token = signLocalGrant(
      {
        key,
        mode: 'upload',
        exp: Math.floor(expiresAt.getTime() / 1000),
        contentType: options.contentType,
        maxBytes: options.maxBytes,
      },
      this.secret,
    );

    return {
      url: `${this.urlPrefix}/${token}`,
      method: 'PUT',
      headers: { 'Content-Type': options.contentType },
      expiresAt,
    };
  }

  async createDownloadUrl(key: string, options: CreateDownloadOptions): Promise<SignedDownload> {
    const expiresAt = new Date(Date.now() + options.ttlSeconds * 1000);
    const token = signLocalGrant(
      {
        key,
        mode: 'download',
        exp: Math.floor(expiresAt.getTime() / 1000),
        fileName: options.fileName,
        contentType: options.contentType,
        disposition: options.disposition,
      },
      this.secret,
    );

    return { url: `${this.urlPrefix}/${token}`, expiresAt };
  }

  async statObject(key: string): Promise<StoredObject | null> {
    try {
      const stats = await stat(this.pathFor(key));
      return { sizeBytes: stats.size, contentType: null };
    } catch {
      return null;
    }
  }

  async readObjectHead(key: string, byteCount: number): Promise<Buffer | null> {
    let file: FileHandle | undefined;
    try {
      file = await open(this.pathFor(key), 'r');
      const buffer = Buffer.alloc(byteCount);
      const { bytesRead } = await file.read(buffer, 0, byteCount, 0);
      return buffer.subarray(0, bytesRead);
    } catch {
      return null;
    } finally {
      await file?.close();
    }
  }

  async putObject(key: string, body: Buffer, _contentType: string): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async removeObjects(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        try {
          await rm(this.pathFor(key), { force: true });
        } catch (error) {
          this.logger.warn(`Could not remove ${key}: ${String(error)}`);
        }
      }),
    );
  }

  pathFor(key: string): string {
    const path = resolve(join(this.root, key));

    if (path !== this.root && !path.startsWith(this.root + sep)) {
      throw new Error(`Refusing to access a path outside the storage root: ${key}`);
    }

    return path;
  }

  createObjectStream(key: string): NodeJS.ReadableStream {
    return createReadStream(this.pathFor(key));
  }

  async ensureDirectoryFor(key: string): Promise<void> {
    await mkdir(dirname(this.pathFor(key)), { recursive: true });
  }
}
