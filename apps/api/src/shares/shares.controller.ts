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
  type AddShareRecipientsInput,
  addShareRecipientsInputSchema,
  type CreateShareInput,
  createShareInputSchema,
  type ListShareEventsQuery,
  listShareEventsQuerySchema,
  type ReceivedShareDto,
  type ShareAccessEventDto,
  type ShareDto,
} from '@data-room/shared';

import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SharesService } from './shares.service';

@ApiTags('shares')
@Controller()
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Get('shares/received')
  @ApiOperation({ summary: 'Shares other people have granted to you' })
  received(@CurrentUser() user: SessionUser): Promise<ReceivedShareDto[]> {
    return this.shares.receivedShares(user.id, user.email);
  }

  @Post('data-rooms/:dataRoomId/shares')
  @ApiOperation({ summary: 'Share a data room, a folder or a file' })
  create(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body(new ZodValidationPipe(createShareInputSchema)) input: CreateShareInput,
  ): Promise<ShareDto> {
    return this.shares.create(user.id, dataRoomId, input);
  }

  @Get('data-rooms/:dataRoomId/shares')
  @ApiOperation({ summary: 'Live shares for one target (omit nodeId for the room itself)' })
  list(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Query('nodeId') nodeId?: string,
  ): Promise<ShareDto[]> {
    return this.shares.listForTarget(user.id, dataRoomId, nodeId ?? null);
  }

  @Post('shares/:shareId/recipients')
  @ApiOperation({ summary: 'Invite more people to a restricted share' })
  addRecipients(
    @CurrentUser() user: SessionUser,
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @Body(new ZodValidationPipe(addShareRecipientsInputSchema)) input: AddShareRecipientsInput,
  ): Promise<ShareDto> {
    return this.shares.addRecipients(user.id, shareId, input);
  }

  @Delete('shares/:shareId/recipients/:recipientId')
  @ApiOperation({ summary: 'Remove one person’s access' })
  revokeRecipient(
    @CurrentUser() user: SessionUser,
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
  ): Promise<ShareDto> {
    return this.shares.revokeRecipient(user.id, shareId, recipientId);
  }

  @Get('shares/:shareId/events')
  @ApiOperation({ summary: 'Who opened what through this share' })
  events(
    @CurrentUser() user: SessionUser,
    @Param('shareId', ParseUUIDPipe) shareId: string,
    @Query(new ZodValidationPipe(listShareEventsQuerySchema)) query: ListShareEventsQuery,
  ): Promise<ShareAccessEventDto[]> {
    return this.shares.listEvents(user.id, shareId, query.limit);
  }

  @Delete('shares/:shareId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a share' })
  revoke(
    @CurrentUser() user: SessionUser,
    @Param('shareId', ParseUUIDPipe) shareId: string,
  ): Promise<void> {
    return this.shares.revoke(user.id, shareId);
  }
}
