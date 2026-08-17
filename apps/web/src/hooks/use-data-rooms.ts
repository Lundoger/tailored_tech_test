'use client';

import type { CreateDataRoomInput, DataRoomDto } from '@data-room/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function useDataRooms(): UseQueryResult<DataRoomDto[]> {
  return useQuery({
    queryKey: queryKeys.dataRooms.all,
    queryFn: () => api.get<DataRoomDto[]>('/data-rooms'),
  });
}

export function useDataRoom(dataRoomId: string): UseQueryResult<DataRoomDto> {
  return useQuery({
    queryKey: queryKeys.dataRooms.detail(dataRoomId),
    queryFn: () => api.get<DataRoomDto>(`/data-rooms/${dataRoomId}`),
  });
}

export function useCreateDataRoom(): UseMutationResult<DataRoomDto, Error, CreateDataRoomInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => api.post<DataRoomDto>('/data-rooms', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms.all }),
  });
}
