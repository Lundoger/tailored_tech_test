import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CreateDataRoomInput,
  createDataRoomInputSchema,
  type DataRoomDto,
  type UpdateDataRoomInput,
  updateDataRoomInputSchema,
} from '@data-room/shared';

import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DataRoomsService } from './data-rooms.service';

@ApiTags('data-rooms')
@Controller('data-rooms')
export class DataRoomsController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Get()
  @ApiOperation({ summary: 'Data rooms owned by the signed-in user' })
  list(@CurrentUser() user: SessionUser): Promise<DataRoomDto[]> {
    return this.dataRooms.listOwned(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a data room' })
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createDataRoomInputSchema)) input: CreateDataRoomInput,
  ): Promise<DataRoomDto> {
    return this.dataRooms.create(user.id, input);
  }

  @Get(':dataRoomId')
  @ApiOperation({ summary: 'One data room, with subtree totals' })
  get(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
  ): Promise<DataRoomDto> {
    return this.dataRooms.getOwned(user.id, dataRoomId);
  }

  @Patch(':dataRoomId')
  @ApiOperation({ summary: 'Rename a data room or change its description' })
  update(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body(new ZodValidationPipe(updateDataRoomInputSchema)) input: UpdateDataRoomInput,
  ): Promise<DataRoomDto> {
    return this.dataRooms.update(user.id, dataRoomId, input);
  }

  @Delete(':dataRoomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a data room and everything in it' })
  remove(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
  ): Promise<void> {
    return this.dataRooms.remove(user.id, dataRoomId);
  }
}
