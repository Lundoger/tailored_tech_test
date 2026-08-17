'use client';

import type { FileVersionDto, SignedUrlDto } from '@data-room/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function useFileViewUrl(
  nodeId: string | null,
  enabled: boolean,
): UseQueryResult<SignedUrlDto> {
  return useQuery({
    queryKey: queryKeys.nodes.viewUrl(nodeId ?? 'none'),
    queryFn: () =>
      api.get<SignedUrlDto>(`/nodes/${nodeId!}/download-url`, {
        query: { disposition: 'inline' },
      }),
    enabled: enabled && Boolean(nodeId),
    staleTime: 30_000,
    gcTime: 60_000,
  });
}

export function useFileVersions(
  nodeId: string | null,
  enabled: boolean,
): UseQueryResult<FileVersionDto[]> {
  return useQuery({
    queryKey: queryKeys.nodes.versions(nodeId ?? 'none'),
    queryFn: () => api.get<FileVersionDto[]>(`/nodes/${nodeId!}/versions`),
    enabled: enabled && Boolean(nodeId),
  });
}

export async function downloadFile(path: string): Promise<void> {
  const signed = await api.get<SignedUrlDto>(path, { query: { disposition: 'attachment' } });

  const anchor = document.createElement('a');
  anchor.href = signed.url;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
