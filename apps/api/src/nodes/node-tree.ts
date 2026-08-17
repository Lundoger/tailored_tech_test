import { MAX_FOLDER_DEPTH } from '@data-room/shared';

export interface TreePosition {
  id: string;
  ancestorIds: string[];
}

export function childAncestorIds(parent: TreePosition | null): string[] {
  return parent ? [...parent.ancestorIds, parent.id] : [];
}

export function depthOf(ancestorIds: readonly string[]): number {
  return ancestorIds.length;
}

export function isDescendantOf(candidate: TreePosition, nodeId: string): boolean {
  return candidate.ancestorIds.includes(nodeId);
}

export function isSelfOrDescendant(candidate: TreePosition, nodeId: string): boolean {
  return candidate.id === nodeId || isDescendantOf(candidate, nodeId);
}

export function moveProblem(
  source: TreePosition,
  target: TreePosition | null,
  options: { sourceSubtreeHeight: number },
): string | null {
  if (target && target.id === source.id) {
    return 'A folder cannot be moved into itself.';
  }

  if (target && isDescendantOf(target, source.id)) {
    return 'A folder cannot be moved into one of its own subfolders.';
  }

  const newDepth = depthOf(childAncestorIds(target));
  if (newDepth + options.sourceSubtreeHeight > MAX_FOLDER_DEPTH) {
    return `That would nest folders more than ${MAX_FOLDER_DEPTH} levels deep.`;
  }

  return null;
}

export function rewriteAncestorIds(
  ancestorIds: readonly string[],
  oldRootAncestorCount: number,
  newRootAncestorIds: readonly string[],
): string[] {
  return [...newRootAncestorIds, ...ancestorIds.slice(oldRootAncestorCount)];
}
