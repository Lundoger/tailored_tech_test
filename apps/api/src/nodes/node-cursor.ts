import type { NodeSort, NodeTypeValue, SortDirection } from '@data-room/shared';

export interface NodeCursor {
  type: NodeTypeValue;
  name: string;
  updatedAt: string;
  sizeBytes: number;
  id: string;
}

export function encodeNodeCursor(cursor: NodeCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeNodeCursor(raw: string | undefined): NodeCursor | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as NodeCursor).id === 'string' &&
      typeof (parsed as NodeCursor).name === 'string' &&
      typeof (parsed as NodeCursor).updatedAt === 'string' &&
      typeof (parsed as NodeCursor).sizeBytes === 'number' &&
      ((parsed as NodeCursor).type === 'FOLDER' || (parsed as NodeCursor).type === 'FILE')
    ) {
      return parsed as NodeCursor;
    }
  } catch {
    // A malformed cursor just means "start from the first page".
  }

  return null;
}

function sortValue(cursor: NodeCursor, sort: NodeSort): string | number | Date {
  switch (sort) {
    case 'name':
      return cursor.name;
    case 'updatedAt':
      return new Date(cursor.updatedAt);
    case 'size':
      return cursor.sizeBytes;
  }
}

const SORT_FIELD: Record<NodeSort, 'name' | 'updatedAt' | 'sizeBytes'> = {
  name: 'name',
  updatedAt: 'updatedAt',
  size: 'sizeBytes',
};

export function nodeOrderBy(
  sort: NodeSort,
  direction: SortDirection,
): Array<Record<string, SortDirection>> {
  return [{ type: 'asc' }, { [SORT_FIELD[sort]]: direction }, { id: direction }];
}

export function nodeKeysetFilter(
  cursor: NodeCursor,
  sort: NodeSort,
  direction: SortDirection,
): Array<Record<string, unknown>> {
  const field = SORT_FIELD[sort];
  const value = sortValue(cursor, sort);
  const after = direction === 'asc' ? 'gt' : 'lt';

  // `(type, sortKey, id) > (cursor…)` spelled out — Prisma has no row comparison.
  return [
    { type: { gt: cursor.type } },
    { type: cursor.type, [field]: { [after]: value } },
    { type: cursor.type, [field]: value, id: { [after]: cursor.id } },
  ];
}
