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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type BreadcrumbDto,
  type CreateFolderInput,
  createFolderInputSchema,
  type DeletePreviewDto,
  type ListNodesQuery,
  listNodesQuerySchema,
  type MoveNodeInput,
  moveNodeInputSchema,
  type NodeDto,
  type Page,
  type RenameNodeInput,
  renameNodeInputSchema,
  type SearchNodesQuery,
  searchNodesQuerySchema,
  type SearchResultDto,
  type SubtreeStatsDto,
} from '@data-room/shared';

import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { NodesService } from './nodes.service';

@ApiTags('nodes')
@Controller()
export class NodesController {
  constructor(private readonly nodes: NodesService) {}

  @Get('data-rooms/:dataRoomId/nodes')
  @ApiOperation({ summary: 'One page of a folder’s contents (cursor-paginated)' })
  list(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Query(new ZodValidationPipe(listNodesQuerySchema)) query: ListNodesQuery,
  ): Promise<Page<NodeDto>> {
    return this.nodes.list(user.id, dataRoomId, query);
  }

  @Get('data-rooms/:dataRoomId/breadcrumbs')
  @ApiOperation({ summary: 'Path from the data room down to a folder' })
  breadcrumbs(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Query('folderId') folderId?: string,
  ): Promise<BreadcrumbDto[]> {
    return this.nodes.breadcrumbs(user.id, dataRoomId, folderId ?? null);
  }

  @Get('data-rooms/:dataRoomId/tree')
  @ApiOperation({ summary: 'Every folder in the room, for the sidebar tree' })
  tree(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
  ): Promise<Array<{ id: string; name: string; parentId: string | null; depth: number }>> {
    return this.nodes.folderTree(user.id, dataRoomId);
  }

  @Get('data-rooms/:dataRoomId/search')
  @ApiOperation({ summary: 'Search names across the whole data room' })
  search(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Query(new ZodValidationPipe(searchNodesQuerySchema)) query: SearchNodesQuery,
  ): Promise<SearchResultDto[]> {
    return this.nodes.search(user.id, dataRoomId, query);
  }

  @Post('data-rooms/:dataRoomId/folders')
  @ApiOperation({ summary: 'Create a folder' })
  createFolder(
    @CurrentUser() user: SessionUser,
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body(new ZodValidationPipe(createFolderInputSchema)) input: CreateFolderInput,
  ): Promise<NodeDto> {
    return this.nodes.createFolder(user.id, dataRoomId, input);
  }

  @Patch('nodes/:nodeId')
  @ApiOperation({ summary: 'Rename a folder or file' })
  rename(
    @CurrentUser() user: SessionUser,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
    @Body(new ZodValidationPipe(renameNodeInputSchema)) input: RenameNodeInput,
  ): Promise<NodeDto> {
    return this.nodes.rename(user.id, nodeId, input);
  }

  @Patch('nodes/:nodeId/move')
  @ApiOperation({ summary: 'Move a folder or file to another folder' })
  move(
    @CurrentUser() user: SessionUser,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
    @Body(new ZodValidationPipe(moveNodeInputSchema)) input: MoveNodeInput,
  ): Promise<NodeDto> {
    return this.nodes.move(user.id, nodeId, input);
  }

  @Get('nodes/:nodeId/stats')
  @ApiOperation({ summary: 'Item counts and total size for a subtree' })
  stats(
    @CurrentUser() user: SessionUser,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
  ): Promise<SubtreeStatsDto> {
    return this.nodes.statsFor(user.id, nodeId);
  }

  @Get('nodes/:nodeId/delete-preview')
  @ApiOperation({ summary: 'What deleting this would remove, for the confirmation' })
  deletePreview(
    @CurrentUser() user: SessionUser,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
  ): Promise<DeletePreviewDto> {
    return this.nodes.deletePreview(user.id, nodeId);
  }

  @Delete('nodes/:nodeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a folder with its whole subtree, or a single file' })
  remove(
    @CurrentUser() user: SessionUser,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
  ): Promise<void> {
    return this.nodes.remove(user.id, nodeId);
  }
}
