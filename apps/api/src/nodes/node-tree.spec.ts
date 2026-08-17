import { MAX_FOLDER_DEPTH } from '@data-room/shared';
import { describe, expect, it } from 'vitest';

import {
  childAncestorIds,
  depthOf,
  isDescendantOf,
  isSelfOrDescendant,
  moveProblem,
  rewriteAncestorIds,
} from './node-tree';

describe('childAncestorIds', () => {
  it('is empty at the data room root', () => {
    expect(childAncestorIds(null)).toEqual([]);
  });

  it('appends the parent to the parent’s own chain', () => {
    expect(childAncestorIds({ id: 'b', ancestorIds: ['a'] })).toEqual(['a', 'b']);
  });
});

describe('depthOf', () => {
  it('counts root-level nodes as depth zero', () => {
    expect(depthOf([])).toBe(0);
    expect(depthOf(['a', 'b'])).toBe(2);
  });
});

describe('isDescendantOf / isSelfOrDescendant', () => {
  const node = { id: 'c', ancestorIds: ['a', 'b'] };

  it('recognises an ancestor at any level', () => {
    expect(isDescendantOf(node, 'a')).toBe(true);
    expect(isDescendantOf(node, 'b')).toBe(true);
  });

  it('does not consider a node its own descendant', () => {
    expect(isDescendantOf(node, 'c')).toBe(false);
    expect(isSelfOrDescendant(node, 'c')).toBe(true);
  });

  it('rejects unrelated nodes', () => {
    expect(isSelfOrDescendant(node, 'z')).toBe(false);
  });
});

describe('moveProblem', () => {
  const source = { id: 'folder', ancestorIds: ['root'] };
  const flat = { sourceSubtreeHeight: 0 };

  it('allows a move to another branch', () => {
    expect(moveProblem(source, { id: 'other', ancestorIds: [] }, flat)).toBeNull();
  });

  it('allows a move to the data room root', () => {
    expect(moveProblem(source, null, flat)).toBeNull();
  });

  it('refuses moving a folder into itself', () => {
    expect(moveProblem(source, { id: 'folder', ancestorIds: ['root'] }, flat)).toMatch(/itself/i);
  });

  it('refuses moving a folder into its own descendant', () => {
    const descendant = { id: 'child', ancestorIds: ['root', 'folder'] };
    expect(moveProblem(source, descendant, flat)).toMatch(/subfolder/i);
  });

  it('refuses a move that would push the subtree past the depth limit', () => {
    const deepTarget = {
      id: 'deep',
      ancestorIds: Array.from({ length: MAX_FOLDER_DEPTH - 1 }, (_, i) => `a${i}`),
    };

    expect(moveProblem(source, deepTarget, { sourceSubtreeHeight: 5 })).toMatch(/levels deep/i);
  });

  it('allows a move that lands exactly on the depth limit', () => {
    const target = {
      id: 'deep',
      ancestorIds: Array.from({ length: MAX_FOLDER_DEPTH - 3 }, (_, i) => `a${i}`),
    };

    expect(moveProblem(source, target, { sourceSubtreeHeight: 2 })).toBeNull();
  });
});

describe('rewriteAncestorIds', () => {
  it('re-bases a direct child of the moved folder', () => {
    expect(rewriteAncestorIds(['old-parent', 'folder'], 1, ['new-parent'])).toEqual([
      'new-parent',
      'folder',
    ]);
  });

  it('preserves the shape of a deeper subtree', () => {
    expect(rewriteAncestorIds(['old', 'folder', 'mid'], 1, ['new-a', 'new-b'])).toEqual([
      'new-a',
      'new-b',
      'folder',
      'mid',
    ]);
  });

  it('handles a move to the root, where the new chain is empty', () => {
    expect(rewriteAncestorIds(['old', 'folder'], 1, [])).toEqual(['folder']);
  });

  it('handles a move out of the root, where the old chain was empty', () => {
    expect(rewriteAncestorIds(['folder'], 0, ['new-parent'])).toEqual(['new-parent', 'folder']);
  });
});
