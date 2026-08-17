import type { QueryClient } from '@tanstack/react-query';

import { ancestorIdsOf, indexFolders, type FolderTreeNode } from '@/lib/folder-tree';
import { queryKeys } from '@/lib/query-keys';

export interface NodeChange {
  dataRoomId: string;
  /** Folders whose listing changed. `null` is the room root. */
  parentIds: (string | null)[];
  /** Set when a folder was created, renamed, moved or deleted. */
  treeChanged?: boolean;
  /** Nodes whose own detail changed — a new version, a new name. */
  nodeIds?: string[];
}

/**
 * Invalidates exactly what a change touched. The blunt version of this — sweeping
 * the whole `['data-rooms', id]` subtree — made every rename refetch every folder
 * listing, both breadcrumb trails and each open file's version history.
 */
export function invalidateNodeChange(queryClient: QueryClient, change: NodeChange): void {
  const { dataRoomId, parentIds, treeChanged = false, nodeIds = [] } = change;

  // A list key carries its filters in an object, so a prefix match cannot single
  // out one parent — hence the predicate.
  void queryClient.invalidateQueries({
    queryKey: queryKeys.nodes.forRoom(dataRoomId),
    predicate: (query) => {
      const filters = query.queryKey[3];
      return isListFilters(filters) && parentIds.includes(filters.parentId);
    },
  });

  // Subtree totals roll up, so every ancestor of a changed folder is stale too.
  for (const folderId of foldersWithStaleTotals(queryClient, dataRoomId, parentIds)) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.nodes.stats(folderId), exact: true });
  }

  // The room's own totals live on its record, and the rooms index shows them too.
  void queryClient.invalidateQueries({
    queryKey: queryKeys.dataRooms.detail(dataRoomId),
    exact: true,
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dataRooms.all, exact: true });

  // Results carry names and paths, and a rename or a move changes both.
  void queryClient.invalidateQueries({ queryKey: queryKeys.nodes.searchAll(dataRoomId) });

  if (treeChanged) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.nodes.tree(dataRoomId) });
  }

  for (const nodeId of nodeIds) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.nodes.versions(nodeId), exact: true });
    void queryClient.invalidateQueries({ queryKey: queryKeys.nodes.viewUrl(nodeId), exact: true });
  }
}

function foldersWithStaleTotals(
  queryClient: QueryClient,
  dataRoomId: string,
  parentIds: (string | null)[],
): string[] {
  const folders = queryClient.getQueryData<FolderTreeNode[]>(queryKeys.nodes.tree(dataRoomId));
  const index = indexFolders(folders ?? []);
  const stale = new Set<string>();

  for (const parentId of parentIds) {
    if (!parentId) continue;
    stale.add(parentId);
    for (const ancestorId of ancestorIdsOf(index, parentId)) {
      stale.add(ancestorId);
    }
  }

  return [...stale];
}

function isListFilters(value: unknown): value is { parentId: string | null } {
  return typeof value === 'object' && value !== null && 'parentId' in value;
}
