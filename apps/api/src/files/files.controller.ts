import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type FileVersionDto,
  type InitUploadInput,
  initUploadInputSchema,
  type InitUploadResultDto,
  type NodeDto,
  type SignedUrlDto,
} from '@data-room/shared';
import { z } from 'zod';

import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FilesService } from './files.service';

const dispositionQuerySchema = z.object({
  disposition: z.enum(['inline', 'attachment']).default('inline'),
});
type DispositionQuery = z.infer<typeof dispositionQuerySchema>;

@ApiTags('files')
@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('data-rooms/:dataRoomId/files/init')
  @ApiOperation({
    summary: 'Reserve a file and get a signed upload URL',
    description:
      'Step one of two. The browser then PUTs the bytes straight to blob storage ' +
      'using the returned URL, and calls the complete endpoint afterwards.',
  })
  init(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body(new ZodValidationPipe(initUploadInputSchema)) input: InitUploadInput,
  ): Promise<InitUploadResultDto> {
    return this.files.initUpload(user.id, dataRoomId, input);
  }

  @Post('files/versions/:versionId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish an upload after the bytes have landed',
    description: 'Verifies the object exists in storage before making the file visible.',
  })
  complete(
    @CurrentUser() user: SessionUser,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<NodeDto> {
    return this.files.completeUpload(user.id, versionId);
  }

  @Delete('files/versions/:versionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Abandon an in-flight upload and release its name' })
  abort(
    @CurrentUser() user: SessionUser,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<void> {
    return this.files.abortUpload(user.id, versionId);
  }

  @Get('nodes/:nodeId/versions')
  @ApiOperation({ summary: 'Version history for a file' })
  versions(
    @CurrentUser() user: SessionUser,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
  ): Promise<FileVersionDto[]> {
    return this.files.listVersions(user.id, nodeId);
  }

  @Get('nodes/:nodeId/download-url')
  @ApiOperation({ summary: 'Short-lived URL for the current version of a file' })
  downloadUrl(
    @CurrentUser() user: SessionUser,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
    @Query(new ZodValidationPipe(dispositionQuerySchema)) query: DispositionQuery,
  ): Promise<SignedUrlDto> {
    return this.files.downloadUrlForNode(user.id, nodeId, query.disposition);
  }

  @Get('files/versions/:versionId/download-url')
  @ApiOperation({ summary: 'Short-lived URL for one specific version' })
  versionDownloadUrl(
    @CurrentUser() user: SessionUser,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Query(new ZodValidationPipe(dispositionQuerySchema)) query: DispositionQuery,
  ): Promise<SignedUrlDto> {
    return this.files.downloadUrlForVersion(user.id, versionId, query.disposition);
  }
}
