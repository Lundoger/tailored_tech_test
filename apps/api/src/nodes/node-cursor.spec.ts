import { describe, expect, it } from 'vitest';

import {
  decodeNodeCursor,
  encodeNodeCursor,
  type NodeCursor,
  nodeKeysetFilter,
  nodeOrderBy,
} from './node-cursor';

const cursor: NodeCursor = {
  type: 'FILE',
  name: 'Report.pdf',
  updatedAt: '2026-08-14T12:00:00.000Z',
  sizeBytes: 2048,
  id: 'node-1',
};

describe('cursor encoding', () => {
  it('round-trips', () => {
    expect(decodeNodeCursor(encodeNodeCursor(cursor))).toEqual(cursor);
  });

  it('survives a query string, which is where it lives', () => {
    const encoded = encodeNodeCursor(cursor);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it('returns null for anything malformed, so a stale link starts from page one', () => {
    expect(decodeNodeCursor(undefined)).toBeNull();
    expect(decodeNodeCursor('')).toBeNull();
    expect(decodeNodeCursor('not-base64!!')).toBeNull();
    expect(decodeNodeCursor(Buffer.from('{"id":1}').toString('base64url'))).toBeNull();
  });
});

describe('nodeOrderBy', () => {
  it('always groups folders first, whichever way the sort runs', () => {
    expect(nodeOrderBy('name', 'desc')[0]).toEqual({ type: 'asc' });
    expect(nodeOrderBy('size', 'asc')[0]).toEqual({ type: 'asc' });
  });

  it('orders by the chosen column, then by id to break ties', () => {
    expect(nodeOrderBy('updatedAt', 'desc')).toEqual([
      { type: 'asc' },
      { updatedAt: 'desc' },
      { id: 'desc' },
    ]);
  });
});

describe('nodeKeysetFilter', () => {
  it('expands into the three tuple-comparison branches', () => {
    const filter = nodeKeysetFilter(cursor, 'name', 'asc');

    expect(filter).toEqual([
      { type: { gt: 'FILE' } },
      { type: 'FILE', name: { gt: 'Report.pdf' } },
      { type: 'FILE', name: 'Report.pdf', id: { gt: 'node-1' } },
    ]);
  });

  it('flips the comparison when sorting descending', () => {
    const filter = nodeKeysetFilter(cursor, 'name', 'desc');

    expect(filter[1]).toEqual({ type: 'FILE', name: { lt: 'Report.pdf' } });
    expect(filter[2]).toEqual({ type: 'FILE', name: 'Report.pdf', id: { lt: 'node-1' } });
  });

  it('compares dates as dates, not as strings, when sorting by modified', () => {
    const filter = nodeKeysetFilter(cursor, 'updatedAt', 'asc');
    const branch = filter[1] as { updatedAt: { gt: unknown } };

    expect(branch.updatedAt.gt).toBeInstanceOf(Date);
    expect((branch.updatedAt.gt as Date).toISOString()).toBe(cursor.updatedAt);
  });

  it('uses the denormalised size column when sorting by size', () => {
    const filter = nodeKeysetFilter(cursor, 'size', 'asc');
    expect(filter[1]).toEqual({ type: 'FILE', sizeBytes: { gt: 2048 } });
  });
});
