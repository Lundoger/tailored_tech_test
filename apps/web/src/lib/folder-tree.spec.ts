import { describe, expect, it } from 'vitest';

import {
  ancestorIdsOf,
  breadcrumbTrail,
  indexFolders,
  type FolderTreeNode,
} from '@/lib/folder-tree';

const folders: FolderTreeNode[] = [
  { id: 'legal', name: '03 Legal', parentId: null, depth: 0 },
  { id: 'contracts', name: 'Contracts', parentId: 'legal', depth: 1 },
  { id: 'nda', name: 'NDAs', parentId: 'contracts', depth: 2 },
  { id: 'people', name: '04 People', parentId: null, depth: 0 },
];

const index = indexFolders(folders);

describe('ancestorIdsOf', () => {
  it('lists ancestors outermost first', () => {
    expect(ancestorIdsOf(index, 'nda')).toEqual(['legal', 'contracts']);
  });

  it('is empty for a root folder', () => {
    expect(ancestorIdsOf(index, 'legal')).toEqual([]);
  });

  it('terminates on a cycle rather than hanging', () => {
    const cyclic = indexFolders([
      { id: 'a', name: 'A', parentId: 'b', depth: 0 },
      { id: 'b', name: 'B', parentId: 'a', depth: 0 },
    ]);

    expect(ancestorIdsOf(cyclic, 'a')).toEqual(['b']);
  });
});

describe('breadcrumbTrail', () => {
  it('matches the shape the API returns: room first, folder last', () => {
    expect(breadcrumbTrail(index, 'Project Atlas', 'nda')).toEqual([
      { id: null, name: 'Project Atlas' },
      { id: 'legal', name: '03 Legal' },
      { id: 'contracts', name: 'Contracts' },
      { id: 'nda', name: 'NDAs' },
    ]);
  });

  it('is just the room at the root', () => {
    expect(breadcrumbTrail(index, 'Project Atlas', null)).toEqual([
      { id: null, name: 'Project Atlas' },
    ]);
  });

  it('declines to answer for a folder the tree has not loaded', () => {
    expect(breadcrumbTrail(index, 'Project Atlas', 'unknown-id')).toBeUndefined();
  });

  it('declines to answer when an ancestor is missing', () => {
    const partial = indexFolders([{ id: 'nda', name: 'NDAs', parentId: 'contracts', depth: 2 }]);

    expect(breadcrumbTrail(partial, 'Project Atlas', 'nda')).toBeUndefined();
  });
});
