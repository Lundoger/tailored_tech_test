import { describe, expect, it } from 'vitest';

import { formatBytes, formatItemCounts, formatRelativeTime } from './format';

describe('formatBytes', () => {
  it('reports bytes below a kilobyte', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('uses one decimal for small multiples', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('drops the decimal once the number is large enough to not need it', () => {
    expect(formatBytes(52_428_800)).toBe('50 MB');
  });

  it('treats zero and nonsense as zero rather than NaN', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
    expect(formatBytes(-10)).toBe('0 B');
  });
});

describe('formatItemCounts', () => {
  it('omits a zero count instead of writing "0 folders"', () => {
    expect(formatItemCounts(0, 4)).toBe('4 files');
  });

  it('singularises', () => {
    expect(formatItemCounts(1, 1)).toBe('1 folder, 1 file');
  });

  it('says something when a folder is empty', () => {
    expect(formatItemCounts(0, 0)).toBe('no items');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');

  it('collapses the last minute into "just now"', () => {
    expect(formatRelativeTime(new Date('2026-08-14T11:59:40.000Z'), now)).toBe('just now');
  });

  it('counts minutes within the hour', () => {
    expect(formatRelativeTime(new Date('2026-08-14T11:36:00.000Z'), now)).toBe('24 min ago');
  });

  it('counts hours within the day', () => {
    expect(formatRelativeTime(new Date('2026-08-14T09:00:00.000Z'), now)).toBe('3 hours ago');
  });

  it('counts days within the week', () => {
    expect(formatRelativeTime(new Date('2026-08-12T12:00:00.000Z'), now)).toBe('2 days ago');
  });

  it('falls back to a date once relative time stops being useful', () => {
    expect(formatRelativeTime(new Date('2026-01-04T12:00:00.000Z'), now)).toMatch(/2026/);
  });
});
