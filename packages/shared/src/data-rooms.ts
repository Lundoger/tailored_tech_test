import { z } from 'zod';

export const createDataRoomInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(120),
  description: z.string().trim().max(500).optional(),
});
export type CreateDataRoomInput = z.infer<typeof createDataRoomInputSchema>;

export const updateDataRoomInputSchema = createDataRoomInputSchema.partial();
export type UpdateDataRoomInput = z.infer<typeof updateDataRoomInputSchema>;

export interface DataRoomDto {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  stats: SubtreeStatsDto;
}

export interface SubtreeStatsDto {
  folderCount: number;
  fileCount: number;
  totalSizeBytes: number;
}
