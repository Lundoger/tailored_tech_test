import type { NodeDto, NodeSort, Page, SortDirection, SubtreeStatsDto } from '@data-room/shared';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { FolderTreeNode } from '@/lib/folder-tree';
import { queryKeys } from '@/lib/query-keys';

// Shared so that a hook and a prefetch of the same data cannot drift apart: a
// prefetch under a different key or fetcher warms a cache nobody reads.

// The tree only changes when a folder is added, renamed, moved or removed, and
// each of those invalidates it by name — so it can outlive the default staleness.
const TREE_STALE_TIME = 5 * 60_000;

export function folderTreeOptions(dataRoomId: string) {
  return queryOptions({
    queryKey: queryKeys.nodes.tree(dataRoomId),
    queryFn: ({ signal }) =>
      api.get<FolderTreeNode[]>(`/data-rooms/${dataRoomId}/tree`, { signal }),
    staleTime: TREE_STALE_TIME,
  });
}

export function nodeListOptions(
  dataRoomId: string,
  parentId: string | null,
  sort: NodeSort,
  direction: SortDirection,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.nodes.list(dataRoomId, parentId, sort, direction),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      api.get<Page<NodeDto>>(`/data-rooms/${dataRoomId}/nodes`, {
        query: { parentId: parentId ?? undefined, sort, direction, cursor: pageParam },
        signal,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function nodeStatsOptions(nodeId: string) {
  return queryOptions({
    queryKey: queryKeys.nodes.stats(nodeId),
    queryFn: ({ signal }) => api.get<SubtreeStatsDto>(`/nodes/${nodeId}/stats`, { signal }),
  });
}
