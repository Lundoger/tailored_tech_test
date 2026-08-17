import type { NodeSort, SortDirection } from '@data-room/shared';

export const queryKeys = {
  session: ['session'] as const,

  dataRooms: {
    all: ['data-rooms'] as const,
    detail: (roomId: string) => ['data-rooms', roomId] as const,
  },

  nodes: {
    forRoom: (roomId: string) => ['data-rooms', roomId, 'nodes'] as const,
    list: (roomId: string, parentId: string | null, sort: NodeSort, direction: SortDirection) =>
      ['data-rooms', roomId, 'nodes', { parentId, sort, direction }] as const,
    tree: (roomId: string) => ['data-rooms', roomId, 'tree'] as const,
    breadcrumbs: (roomId: string, folderId: string | null) =>
      ['data-rooms', roomId, 'breadcrumbs', folderId] as const,
    stats: (nodeId: string) => ['nodes', nodeId, 'stats'] as const,
    deletePreview: (nodeId: string) => ['nodes', nodeId, 'delete-preview'] as const,
    versions: (nodeId: string) => ['nodes', nodeId, 'versions'] as const,
    viewUrl: (nodeId: string) => ['nodes', nodeId, 'view-url'] as const,
    searchAll: (roomId: string) => ['data-rooms', roomId, 'search'] as const,
    search: (roomId: string, term: string) => ['data-rooms', roomId, 'search', term] as const,
  },

  shares: {
    forTarget: (roomId: string, nodeId: string | null) =>
      ['data-rooms', roomId, 'shares', nodeId] as const,
    events: (shareId: string) => ['shares', shareId, 'events'] as const,
  },

  sharedView: {
    target: (token: string) => ['shared', token] as const,
    nodes: (token: string, parentId: string | null) =>
      ['shared', token, 'nodes', parentId] as const,
    breadcrumbs: (token: string, folderId: string | null) =>
      ['shared', token, 'breadcrumbs', folderId] as const,
    fileUrl: (token: string, nodeId: string) => ['shared', token, 'file-url', nodeId] as const,
  },
} as const;
