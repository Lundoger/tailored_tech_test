import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type BreadcrumbDto,
  type ListNodesQuery,
  listNodesQuerySchema,
  type NodeDto,
  type Page,
  type SharedTargetDto,
  type SignedUrlDto,
} from '@data-room/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { OptionalUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import type { SessionUser } from '../auth/session.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { ViewerContext } from './shares.service';
import { SharesService } from './shares.service';

const dispositionQuerySchema = z.object({
  disposition: z.enum(['inline', 'attachment']).default('inline'),
});

@ApiTags('shared')
@Controller('s')
export class PublicSharesController {
  constructor(private readonly shares: SharesService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Resolve a share link' })
  open(
    @Param('token') token: string,
    @OptionalUser() user: SessionUser | null,
    @Req() request: Request,
  ): Promise<SharedTargetDto> {
    return this.shares.openShare(token, viewerContext(user, request));
  }

  @Public()
  @Get(':token/nodes')
  @ApiOperation({ summary: 'Browse inside a shared data room or folder' })
  list(
    @Param('token') token: string,
    @OptionalUser() user: SessionUser | null,
    @Req() request: Request,
    @Query(new ZodValidationPipe(listNodesQuerySchema)) query: ListNodesQuery,
  ): Promise<Page<NodeDto>> {
    return this.shares.listSharedNodes(token, viewerContext(user, request), query);
  }

  @Public()
  @Get(':token/breadcrumbs')
  @ApiOperation({ summary: 'Path within the shared item' })
  breadcrumbs(
    @Param('token') token: string,
    @OptionalUser() user: SessionUser | null,
    @Req() request: Request,
    @Query('folderId') folderId?: string,
  ): Promise<BreadcrumbDto[]> {
    return this.shares.sharedBreadcrumbs(token, viewerContext(user, request), folderId ?? null);
  }

  @Public()
  @Get(':token/files/:nodeId/download-url')
  @ApiOperation({ summary: 'Short-lived URL for a document inside a share' })
  fileUrl(
    @Param('token') token: string,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
    @OptionalUser() user: SessionUser | null,
    @Req() request: Request,
    @Query(new ZodValidationPipe(dispositionQuerySchema))
    query: z.infer<typeof dispositionQuerySchema>,
  ): Promise<SignedUrlDto> {
    return this.shares.sharedFileUrl(
      token,
      viewerContext(user, request),
      nodeId,
      query.disposition,
    );
  }
}

function viewerContext(user: SessionUser | null, request: Request): ViewerContext {
  return {
    user,
    ipAddress: request.ip,
    userAgent: request.get('user-agent') ?? undefined,
  };
}
