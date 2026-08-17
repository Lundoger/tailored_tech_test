import type { BreadcrumbDto } from '@data-room/shared';

export interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
}

export type FolderIndex = ReadonlyMap<string, FolderTreeNode>;

export function indexFolders(folders: readonly FolderTreeNode[]): FolderIndex {
  return new Map(folders.map((folder) => [folder.id, folder]));
}

/**
 * Ancestors of `folderId`, outermost first. `seen` guards against a cycle that a
 * stale cache could contain — the walk would otherwise never terminate.
 */
export function ancestorIdsOf(index: FolderIndex, folderId: string): string[] {
  const chain: string[] = [];
  const seen = new Set<string>([folderId]);

  let current = index.get(folderId)?.parentId ?? null;
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.unshift(current);
    current = index.get(current)?.parentId ?? null;
  }

  return chain;
}

/**
 * The same trail the API returns from `/breadcrumbs`, built from the folder tree
 * the sidebar already holds. Returns undefined when the tree cannot answer yet,
 * which is the caller's signal to fall back to the endpoint.
 */
export function breadcrumbTrail(
  index: FolderIndex,
  roomName: string,
  folderId: string | null,
): BreadcrumbDto[] | undefined {
  const trail: BreadcrumbDto[] = [{ id: null, name: roomName }];
  if (!folderId) return trail;

  const folder = index.get(folderId);
  if (!folder) return undefined;

  for (const ancestorId of ancestorIdsOf(index, folderId)) {
    const ancestor = index.get(ancestorId);
    if (!ancestor) return undefined;
    trail.push({ id: ancestor.id, name: ancestor.name });
  }

  trail.push({ id: folder.id, name: folder.name });
  return trail;
}
