'use client';

import type {
  BreadcrumbDto,
  CreateFolderInput,
  DeletePreviewDto,
  MoveNodeInput,
  NodeDto,
  NodeSort,
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
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { FolderTreeNode } from '@/lib/folder-tree';
import { invalidateNodeChange } from '@/lib/node-cache';
import { folderTreeOptions, nodeListOptions, nodeStatsOptions } from '@/lib/node-queries';
import { queryKeys } from '@/lib/query-keys';

export function useNodeList(
  dataRoomId: string,
  parentId: string | null,
  sort: NodeSort,
  direction: SortDirection,
) {
  return useInfiniteQuery(nodeListOptions(dataRoomId, parentId, sort, direction));
}

export function useFolderTree(dataRoomId: string): UseQueryResult<FolderTreeNode[]> {
  return useQuery(folderTreeOptions(dataRoomId));
}

/**
 * Only used when the folder tree cannot answer yet — see `breadcrumbTrail`. On a
 * cold load of a deep URL this renders the trail without waiting for the whole
 * tree; afterwards navigation derives it locally and this never fires.
 */
export function useBreadcrumbs(
  dataRoomId: string,
  folderId: string | null,
  enabled: boolean,
): UseQueryResult<BreadcrumbDto[]> {
  return useQuery({
    queryKey: queryKeys.nodes.breadcrumbs(dataRoomId, folderId),
    queryFn: ({ signal }) =>
      api.get<BreadcrumbDto[]>(`/data-rooms/${dataRoomId}/breadcrumbs`, {
        query: { folderId: folderId ?? undefined },
        signal,
      }),
    enabled,
  });
}

export function useNodeStats(nodeId: string | null): UseQueryResult<SubtreeStatsDto> {
  return useQuery({ ...nodeStatsOptions(nodeId ?? 'root'), enabled: Boolean(nodeId) });
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
    onSuccess: (folder) =>
      invalidateNodeChange(queryClient, {
        dataRoomId,
        parentIds: [folder.parentId],
        treeChanged: true,
      }),
  });
}

export function useRenameNode(
  dataRoomId: string,
): UseMutationResult<NodeDto, Error, { node: NodeDto; input: RenameNodeInput }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ node, input }) => api.patch<NodeDto>(`/nodes/${node.id}`, input),
    onSuccess: (_renamed, { node }) =>
      invalidateNodeChange(queryClient, {
        dataRoomId,
        parentIds: [node.parentId],
        treeChanged: node.type === 'FOLDER',
        nodeIds: [node.id],
      }),
  });
}

export function useMoveNode(
  dataRoomId: string,
): UseMutationResult<NodeDto, Error, { node: NodeDto; input: MoveNodeInput }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ node, input }) => api.patch<NodeDto>(`/nodes/${node.id}/move`, input),
    onSuccess: (_moved, { node, input }) =>
      invalidateNodeChange(queryClient, {
        dataRoomId,
        // Both ends of the move: the folder it left and the one it joined.
        parentIds: [node.parentId, input.parentId],
        treeChanged: node.type === 'FOLDER',
        nodeIds: [node.id],
      }),
  });
}

export function useDeleteNode(dataRoomId: string): UseMutationResult<void, Error, NodeDto> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (node) => api.delete<void>(`/nodes/${node.id}`),
    onSuccess: (_result, node) =>
      invalidateNodeChange(queryClient, {
        dataRoomId,
        parentIds: [node.parentId],
        treeChanged: node.type === 'FOLDER',
      }),
  });
}
