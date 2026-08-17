'use client';

import type {
  BreadcrumbDto,
  NodeDto,
  Page,
  SharedTargetDto,
  SignedUrlDto,
} from '@data-room/shared';
import { useInfiniteQuery, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function useSharedTarget(token: string): UseQueryResult<SharedTargetDto> {
  return useQuery({
    queryKey: queryKeys.sharedView.target(token),
    queryFn: () => api.get<SharedTargetDto>(`/s/${token}`),
    retry: false,
  });
}

export function useSharedNodes(token: string, parentId: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.sharedView.nodes(token, parentId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api.get<Page<NodeDto>>(`/s/${token}/nodes`, {
        query: { parentId: parentId ?? undefined, cursor: pageParam },
        signal,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    retry: false,
  });
}

export function useSharedBreadcrumbs(
  token: string,
  folderId: string | null,
  enabled: boolean,
): UseQueryResult<BreadcrumbDto[]> {
  return useQuery({
    queryKey: queryKeys.sharedView.breadcrumbs(token, folderId),
    queryFn: () =>
      api.get<BreadcrumbDto[]>(`/s/${token}/breadcrumbs`, {
        query: { folderId: folderId ?? undefined },
      }),
    enabled,
    retry: false,
  });
}

export function useSharedFileUrl(
  token: string,
  nodeId: string | null,
  enabled: boolean,
): UseQueryResult<SignedUrlDto> {
  return useQuery({
    queryKey: queryKeys.sharedView.fileUrl(token, nodeId ?? 'none'),
    queryFn: () => api.get<SignedUrlDto>(`/s/${token}/files/${nodeId!}/download-url`),
    enabled: enabled && Boolean(nodeId),
    staleTime: 30_000,
    gcTime: 60_000,
    retry: false,
  });
}

export async function downloadSharedFile(token: string, nodeId: string): Promise<void> {
  const signed = await api.get<SignedUrlDto>(`/s/${token}/files/${nodeId}/download-url`, {
    query: { disposition: 'attachment' },
  });

  const anchor = document.createElement('a');
  anchor.href = signed.url;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
