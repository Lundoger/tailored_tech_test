import { Injectable } from '@nestjs/common';
import type { DataRoom } from '@data-room/db';
import type {
  CreateDataRoomInput,
  DataRoomDto,
  SubtreeStatsDto,
  UpdateDataRoomInput,
} from '@data-room/shared';

import { AppError } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // 404 rather than 403 for someone else's room: a 403 confirms the id is real,
  // which is the one thing an enumeration attempt is after. Share recipients never
  // come through here — they reach content by token.
  async requireOwned(userId: string, dataRoomId: string): Promise<DataRoom> {
    const room = await this.prisma.dataRoom.findFirst({
      where: { id: dataRoomId, ownerId: userId, deletedAt: null },
    });

    if (!room) {
      throw AppError.notFound('That data room');
    }

    return room;
  }

  async listOwned(userId: string): Promise<DataRoomDto[]> {
    const rooms = await this.prisma.dataRoom.findMany({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const stats = await this.statsForRooms(rooms.map((room) => room.id));

    return rooms.map((room) =>
      toDataRoomDto(room, { isOwner: true, stats: stats.get(room.id) ?? emptyStats() }),
    );
  }

  async getOwned(userId: string, dataRoomId: string): Promise<DataRoomDto> {
    const room = await this.requireOwned(userId, dataRoomId);
    const stats = await this.statsForRooms([room.id]);

    return toDataRoomDto(room, { isOwner: true, stats: stats.get(room.id) ?? emptyStats() });
  }

  async create(userId: string, input: CreateDataRoomInput): Promise<DataRoomDto> {
    const room = await this.prisma.dataRoom.create({
      data: { name: input.name, description: input.description ?? null, ownerId: userId },
    });

    return toDataRoomDto(room, { isOwner: true, stats: emptyStats() });
  }

  async update(
    userId: string,
    dataRoomId: string,
    input: UpdateDataRoomInput,
  ): Promise<DataRoomDto> {
    await this.requireOwned(userId, dataRoomId);

    const room = await this.prisma.dataRoom.update({
      where: { id: dataRoomId },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined ? {} : { description: input.description || null }),
      },
    });

    const stats = await this.statsForRooms([room.id]);
    return toDataRoomDto(room, { isOwner: true, stats: stats.get(room.id) ?? emptyStats() });
  }

  async remove(userId: string, dataRoomId: string): Promise<void> {
    await this.requireOwned(userId, dataRoomId);

    await this.prisma.dataRoom.update({
      where: { id: dataRoomId },
      data: { deletedAt: new Date() },
    });
  }

  private async statsForRooms(roomIds: string[]): Promise<Map<string, SubtreeStatsDto>> {
    const result = new Map<string, SubtreeStatsDto>();
    if (roomIds.length === 0) return result;

    const grouped = await this.prisma.node.groupBy({
      by: ['dataRoomId', 'type'],
      where: { dataRoomId: { in: roomIds }, deletedAt: null },
      _count: { _all: true },
      _sum: { sizeBytes: true },
    });

    for (const group of grouped) {
      const entry = result.get(group.dataRoomId) ?? emptyStats();

      if (group.type === 'FOLDER') {
        entry.folderCount += group._count._all;
      } else {
        entry.fileCount += group._count._all;
        entry.totalSizeBytes += group._sum.sizeBytes ?? 0;
      }

      result.set(group.dataRoomId, entry);
    }

    return result;
  }
}

function emptyStats(): SubtreeStatsDto {
  return { folderCount: 0, fileCount: 0, totalSizeBytes: 0 };
}

function toDataRoomDto(
  room: DataRoom,
  extra: { isOwner: boolean; stats: SubtreeStatsDto },
): DataRoomDto {
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    ownerId: room.ownerId,
    isOwner: extra.isOwner,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
    stats: extra.stats,
  };
}
