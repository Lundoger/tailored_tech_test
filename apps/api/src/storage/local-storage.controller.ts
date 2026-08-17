import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform, type TransformCallback } from 'node:stream';

import { Controller, Get, Param, Put, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Public } from '../auth/public.decorator';
import { AppError } from '../common/app-error';
import { AppConfigService } from '../config/app-config.service';
import { verifyLocalGrant } from './local-grant';
import { LocalStorageService } from './local-storage.service';

@ApiExcludeController()
@Controller('storage')
export class LocalStorageController {
  constructor(
    private readonly storage: LocalStorageService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Put('local/:token')
  async upload(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const grant = verifyLocalGrant(token, this.config.env.JWT_SECRET);
    if (!grant || grant.mode !== 'upload') {
      throw AppError.accessDenied('This upload link has expired. Start the upload again.');
    }

    await this.storage.ensureDirectoryFor(grant.key);

    try {
      await pipeline(
        request,
        new ByteLimit(grant.maxBytes ?? this.config.env.MAX_UPLOAD_BYTES),
        createWriteStream(this.storage.pathFor(grant.key)),
      );
    } catch (error) {
      await this.storage.removeObjects([grant.key]);

      if (error instanceof PayloadTooLarge) {
        throw AppError.uploadTooLarge(grant.maxBytes ?? this.config.env.MAX_UPLOAD_BYTES);
      }
      throw error;
    }

    response.status(204).send();
  }

  @Public()
  @Get('local/:token')
  async download(@Param('token') token: string, @Res() response: Response): Promise<void> {
    const grant = verifyLocalGrant(token, this.config.env.JWT_SECRET);
    if (!grant || grant.mode !== 'download') {
      throw AppError.accessDenied('This link has expired. Reopen the document to get a fresh one.');
    }

    const object = await this.storage.statObject(grant.key);
    if (!object) {
      throw AppError.notFound('That file');
    }

    response.setHeader('Content-Type', grant.contentType ?? 'application/octet-stream');
    response.setHeader('Content-Length', object.sizeBytes);
    response.setHeader(
      'Content-Disposition',
      contentDisposition(grant.disposition ?? 'inline', grant.fileName ?? 'document'),
    );
    response.setHeader('Cache-Control', 'private, no-store');

    await pipeline(this.storage.createObjectStream(grant.key), response);
  }
}

class PayloadTooLarge extends Error {}

class ByteLimit extends Transform {
  private written = 0;

  constructor(private readonly maxBytes: number) {
    super();
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback): void {
    this.written += chunk.length;

    if (this.written > this.maxBytes) {
      done(new PayloadTooLarge());
      return;
    }

    done(null, chunk);
  }
}

function contentDisposition(disposition: 'inline' | 'attachment', fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
