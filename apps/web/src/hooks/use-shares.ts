'use client';

import type {
  AddShareRecipientsInput,
  CreateShareInput,
  ReceivedShareDto,
  ShareAccessEventDto,
  ShareDto,
} from '@data-room/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function useSharesForTarget(
  dataRoomId: string,
  nodeId: string | null,
  enabled: boolean,
): UseQueryResult<ShareDto[]> {
  return useQuery({
    queryKey: queryKeys.shares.forTarget(dataRoomId, nodeId),
    queryFn: () =>
      api.get<ShareDto[]>(`/data-rooms/${dataRoomId}/shares`, {
        query: { nodeId: nodeId ?? undefined },
      }),
    enabled,
  });
}

export function useReceivedShares(): UseQueryResult<ReceivedShareDto[]> {
  return useQuery({
    queryKey: ['shares', 'received'],
    queryFn: () => api.get<ReceivedShareDto[]>('/shares/received'),
  });
}

export function useShareEvents(
  shareId: string | null,
  enabled: boolean,
): UseQueryResult<ShareAccessEventDto[]> {
  return useQuery({
    queryKey: queryKeys.shares.events(shareId ?? 'none'),
    queryFn: () => api.get<ShareAccessEventDto[]>(`/shares/${shareId!}/events`),
    enabled: enabled && Boolean(shareId),
  });
}

function invalidateShares(
  queryClient: ReturnType<typeof useQueryClient>,
  dataRoomId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: ['data-rooms', dataRoomId] });
  void queryClient.invalidateQueries({ queryKey: ['shares'] });
}

export function useCreateShare(
  dataRoomId: string,
): UseMutationResult<ShareDto, Error, CreateShareInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => api.post<ShareDto>(`/data-rooms/${dataRoomId}/shares`, input),
    onSuccess: () => invalidateShares(queryClient, dataRoomId),
  });
}

export function useRevokeShare(dataRoomId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shareId) => api.delete<void>(`/shares/${shareId}`),
    onSuccess: () => invalidateShares(queryClient, dataRoomId),
  });
}

export function useAddRecipients(
  dataRoomId: string,
): UseMutationResult<ShareDto, Error, { shareId: string; input: AddShareRecipientsInput }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shareId, input }) => api.post<ShareDto>(`/shares/${shareId}/recipients`, input),
    onSuccess: () => invalidateShares(queryClient, dataRoomId),
  });
}

export function useRevokeRecipient(
  dataRoomId: string,
): UseMutationResult<ShareDto, Error, { shareId: string; recipientId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shareId, recipientId }) =>
      api.delete<ShareDto>(`/shares/${shareId}/recipients/${recipientId}`),
    onSuccess: () => invalidateShares(queryClient, dataRoomId),
  });
}

export function absoluteShareUrl(url: string): string {
  if (typeof window === 'undefined') return url;
  return new URL(url, window.location.origin).toString();
}
