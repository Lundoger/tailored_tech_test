'use client';

import type {
  BreadcrumbDto,
  CreateFolderInput,
  DeletePreviewDto,
  MoveNodeInput,
  NodeDto,
  NodeSort,
  Page,
  RenameNodeInput,
  SearchResultDto,
  SortDirection,
  SubtreeStatsDto,
} from '@data-room/shared';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
}

export function invalidateRoom(queryClient: QueryClient, dataRoomId: string): void {
  void queryClient.invalidateQueries({ queryKey: ['data-rooms', dataRoomId] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms.all, exact: true });
  // Version history, subtree totals and signed view URLs are keyed by node id, not
  // by room, so they need their own sweep — otherwise an open file keeps showing its
  // previous contents and version count after an upload.
  void queryClient.invalidateQueries({ queryKey: ['nodes'] });
}

export function useNodeList(
  dataRoomId: string,
  parentId: string | null,
  sort: NodeSort,
  direction: SortDirection,
) {
  return useInfiniteQuery({
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

export function useFolderTree(dataRoomId: string): UseQueryResult<FolderTreeNode[]> {
  return useQuery({
    queryKey: queryKeys.nodes.tree(dataRoomId),
    queryFn: () => api.get<FolderTreeNode[]>(`/data-rooms/${dataRoomId}/tree`),
  });
}

export function useBreadcrumbs(
  dataRoomId: string,
  folderId: string | null,
): UseQueryResult<BreadcrumbDto[]> {
  return useQuery({
    queryKey: queryKeys.nodes.breadcrumbs(dataRoomId, folderId),
    queryFn: () =>
      api.get<BreadcrumbDto[]>(`/data-rooms/${dataRoomId}/breadcrumbs`, {
        query: { folderId: folderId ?? undefined },
      }),
  });
}

export function useNodeStats(nodeId: string | null): UseQueryResult<SubtreeStatsDto> {
  return useQuery({
    queryKey: queryKeys.nodes.stats(nodeId ?? 'root'),
    queryFn: () => api.get<SubtreeStatsDto>(`/nodes/${nodeId!}/stats`),
    enabled: Boolean(nodeId),
  });
}

export function useDeletePreview(
  nodeId: string | null,
  enabled: boolean,
): UseQueryResult<DeletePreviewDto> {
  return useQuery({
    queryKey: queryKeys.nodes.deletePreview(nodeId ?? 'none'),
    queryFn: () => api.get<DeletePreviewDto>(`/nodes/${nodeId!}/delete-preview`),
    enabled: enabled && Boolean(nodeId),
    staleTime: 0,
  });
}

export function useSearchNodes(
  dataRoomId: string,
  term: string,
): UseQueryResult<SearchResultDto[]> {
  return useQuery({
    queryKey: queryKeys.nodes.search(dataRoomId, term),
    queryFn: ({ signal }) =>
      api.get<SearchResultDto[]>(`/data-rooms/${dataRoomId}/search`, {
        query: { q: term },
        signal,
      }),
    enabled: term.trim().length > 0,
    staleTime: 10_000,
  });
}

export function useCreateFolder(
  dataRoomId: string,
): UseMutationResult<NodeDto, Error, CreateFolderInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => api.post<NodeDto>(`/data-rooms/${dataRoomId}/folders`, input),
    onSuccess: () => invalidateRoom(queryClient, dataRoomId),
  });
}

export function useRenameNode(
  dataRoomId: string,
): UseMutationResult<NodeDto, Error, { nodeId: string; input: RenameNodeInput }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nodeId, input }) => api.patch<NodeDto>(`/nodes/${nodeId}`, input),
    onSuccess: () => invalidateRoom(queryClient, dataRoomId),
  });
}

export function useMoveNode(
  dataRoomId: string,
): UseMutationResult<NodeDto, Error, { nodeId: string; input: MoveNodeInput }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nodeId, input }) => api.patch<NodeDto>(`/nodes/${nodeId}/move`, input),
    onSuccess: () => invalidateRoom(queryClient, dataRoomId),
  });
}

export function useDeleteNode(dataRoomId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nodeId) => api.delete<void>(`/nodes/${nodeId}`),
    onSuccess: () => invalidateRoom(queryClient, dataRoomId),
  });
}
