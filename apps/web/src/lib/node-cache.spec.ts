import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import type { FolderTreeNode } from '@/lib/folder-tree';
import { invalidateNodeChange } from '@/lib/node-cache';
import { queryKeys } from '@/lib/query-keys';

const ROOM = 'room-1';
const OTHER_ROOM = 'room-2';

const tree: FolderTreeNode[] = [
  { id: 'legal', name: '03 Legal', parentId: null, depth: 0 },
  { id: 'contracts', name: 'Contracts', parentId: 'legal', depth: 1 },
  { id: 'people', name: '04 People', parentId: null, depth: 0 },
];

/**
 * Every query the browser holds while sitting in one folder. Nothing observes them,
 * so invalidation only marks them stale — no fetching happens in the test.
 */
function seededClient(): QueryClient {
  const queryClient = new QueryClient();

  queryClient.setQueryData(queryKeys.nodes.tree(ROOM), tree);
  queryClient.setQueryData(queryKeys.dataRooms.detail(ROOM), { id: ROOM });
  queryClient.setQueryData(queryKeys.dataRooms.all, []);

  for (const parentId of [null, 'legal', 'contracts', 'people']) {
    queryClient.setQueryData(queryKeys.nodes.list(ROOM, parentId, 'name', 'asc'), { items: [] });
  }
  queryClient.setQueryData(queryKeys.nodes.list(ROOM, 'contracts', 'size', 'desc'), { items: [] });
  queryClient.setQueryData(queryKeys.nodes.list(OTHER_ROOM, null, 'name', 'asc'), { items: [] });

  for (const nodeId of ['legal', 'contracts', 'people']) {
    queryClient.setQueryData(queryKeys.nodes.stats(nodeId), { fileCount: 0 });
  }

  queryClient.setQueryData(queryKeys.nodes.versions('file-1'), []);
  queryClient.setQueryData(queryKeys.nodes.versions('file-2'), []);
  queryClient.setQueryData(queryKeys.nodes.search(ROOM, 'nda'), []);

  return queryClient;
}

function isStale(queryClient: QueryClient, key: readonly unknown[]): boolean {
  return queryClient.getQueryState(key)?.isInvalidated === true;
}

describe('invalidateNodeChange', () => {
  it('refreshes only the folder that changed, not its siblings or the root', () => {
    const queryClient = seededClient();

    invalidateNodeChange(queryClient, { dataRoomId: ROOM, parentIds: ['contracts'] });

    expect(isStale(queryClient, queryKeys.nodes.list(ROOM, 'contracts', 'name', 'asc'))).toBe(true);
    expect(isStale(queryClient, queryKeys.nodes.list(ROOM, 'people', 'name', 'asc'))).toBe(false);
    expect(isStale(queryClient, queryKeys.nodes.list(ROOM, 'legal', 'name', 'asc'))).toBe(false);
    expect(isStale(queryClient, queryKeys.nodes.list(ROOM, null, 'name', 'asc'))).toBe(false);
  });

  it('covers every sort order of the folder that changed', () => {
    const queryClient = seededClient();

    invalidateNodeChange(queryClient, { dataRoomId: ROOM, parentIds: ['contracts'] });

    expect(isStale(queryClient, queryKeys.nodes.list(ROOM, 'contracts', 'size', 'desc'))).toBe(
      true,
    );
  });

  it('leaves another data room alone', () => {
    const queryClient = seededClient();

    invalidateNodeChange(queryClient, { dataRoomId: ROOM, parentIds: [null] });

    expect(isStale(queryClient, queryKeys.nodes.list(OTHER_ROOM, null, 'name', 'asc'))).toBe(false);
  });

  it('rolls subtree totals up the ancestor chain and no further', () => {
    const queryClient = seededClient();

    invalidateNodeChange(queryClient, { dataRoomId: ROOM, parentIds: ['contracts'] });

    expect(isStale(queryClient, queryKeys.nodes.stats('contracts'))).toBe(true);
    expect(isStale(queryClient, queryKeys.nodes.stats('legal'))).toBe(true);
    expect(isStale(queryClient, queryKeys.nodes.stats('people'))).toBe(false);
    // The room's own totals live on its record.
    expect(isStale(queryClient, queryKeys.dataRooms.detail(ROOM))).toBe(true);
  });

  it('keeps the folder tree unless a folder itself changed', () => {
    const queryClient = seededClient();

    invalidateNodeChange(queryClient, { dataRoomId: ROOM, parentIds: ['contracts'] });
    expect(isStale(queryClient, queryKeys.nodes.tree(ROOM))).toBe(false);

    invalidateNodeChange(queryClient, {
      dataRoomId: ROOM,
      parentIds: ['contracts'],
      treeChanged: true,
    });
    expect(isStale(queryClient, queryKeys.nodes.tree(ROOM))).toBe(true);
  });

  it('refreshes both ends of a move', () => {
    const queryClient = seededClient();

    invalidateNodeChange(queryClient, {
      dataRoomId: ROOM,
      parentIds: ['legal', 'people'],
      treeChanged: true,
    });

    expect(isStale(queryClient, queryKeys.nodes.list(ROOM, 'legal', 'name', 'asc'))).toBe(true);
    expect(isStale(queryClient, queryKeys.nodes.list(ROOM, 'people', 'name', 'asc'))).toBe(true);
    expect(isStale(queryClient, queryKeys.nodes.list(ROOM, 'contracts', 'name', 'asc'))).toBe(
      false,
    );
  });

  it('touches version history only for the file that changed', () => {
    const queryClient = seededClient();

    invalidateNodeChange(queryClient, {
      dataRoomId: ROOM,
      parentIds: ['contracts'],
      nodeIds: ['file-1'],
    });

    expect(isStale(queryClient, queryKeys.nodes.versions('file-1'))).toBe(true);
    expect(isStale(queryClient, queryKeys.nodes.versions('file-2'))).toBe(false);
  });

  it('always refreshes search, because results carry names and paths', () => {
    const queryClient = seededClient();

    invalidateNodeChange(queryClient, { dataRoomId: ROOM, parentIds: ['contracts'] });

    expect(isStale(queryClient, queryKeys.nodes.search(ROOM, 'nda'))).toBe(true);
  });
});
