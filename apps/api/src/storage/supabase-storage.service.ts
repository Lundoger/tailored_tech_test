import { Injectable, Logger } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { AppConfigService } from '../config/app-config.service';
import {
  type CreateDownloadOptions,
  type CreateUploadTargetOptions,
  type SignedDownload,
  StorageService,
  type StoredObject,
  type UploadTarget,
} from './storage.service';

@Injectable()
export class SupabaseStorageService extends StorageService {
  readonly driverName = 'supabase';

  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(config: AppConfigService) {
    super();

    const url = config.env.SUPABASE_URL;
    const serviceRoleKey = config.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error('Supabase storage selected but SUPABASE_URL/SERVICE_ROLE_KEY are missing.');
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.bucket = config.env.SUPABASE_STORAGE_BUCKET;
  }

  private get files() {
    return this.client.storage.from(this.bucket);
  }

  async createUploadTarget(key: string, options: CreateUploadTargetOptions): Promise<UploadTarget> {
    const { data, error } = await this.files.createSignedUploadUrl(key);

    if (error || !data) {
      throw new Error(`Could not create an upload URL: ${error?.message ?? 'unknown error'}`);
    }

    return {
      url: data.signedUrl,
      method: 'PUT',
      headers: { 'Content-Type': options.contentType },
      expiresAt: new Date(Date.now() + options.ttlSeconds * 1000),
    };
  }

  async createDownloadUrl(key: string, options: CreateDownloadOptions): Promise<SignedDownload> {
    const { data, error } = await this.files.createSignedUrl(
      key,
      options.ttlSeconds,
      options.disposition === 'attachment' ? { download: options.fileName } : undefined,
    );

    if (error || !data) {
      throw new Error(`Could not create a download URL: ${error?.message ?? 'unknown error'}`);
    }

    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + options.ttlSeconds * 1000),
    };
  }

  async statObject(key: string): Promise<StoredObject | null> {
    const { data, error } = await this.files.info(key);

    if (error || !data) {
      return null;
    }

    return {
      sizeBytes: typeof data.size === 'number' ? data.size : 0,
      contentType: typeof data.contentType === 'string' ? data.contentType : null,
    };
  }

  async readObjectHead(key: string, byteCount: number): Promise<Buffer | null> {
    // A signed URL with a Range header: the storage SDK's `download` would pull the
    // whole object, which defeats the point of only needing the header bytes.
    const { data, error } = await this.files.createSignedUrl(key, 60);
    if (error || !data) {
      return null;
    }

    try {
      const response = await fetch(data.signedUrl, {
        headers: { Range: `bytes=0-${byteCount - 1}` },
      });
      if (!response.ok) {
        return null;
      }
      return Buffer.from(await response.arrayBuffer()).subarray(0, byteCount);
    } catch (cause) {
      this.logger.warn(`Could not read the head of ${key}: ${String(cause)}`);
      return null;
    }
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const { error } = await this.files.upload(key, body, { contentType, upsert: true });

    if (error) {
      throw new Error(`Could not upload ${key}: ${error.message}`);
    }
  }

  async removeObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const { error } = await this.files.remove(keys);

    if (error) {
      this.logger.warn(`Could not remove ${keys.length} object(s): ${error.message}`);
    }
  }
}
