const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
  const unit = SIZE_UNITS[exponent] ?? 'B';
  const value = bytes / 1024 ** exponent;

  return `${exponent === 0 ? value : Number(value.toFixed(value < 10 ? 1 : 0))} ${unit}`;
}

export function formatItemCounts(folderCount: number, fileCount: number): string {
  const parts: string[] = [];
  if (folderCount > 0) {
    parts.push(`${folderCount} ${folderCount === 1 ? 'folder' : 'folders'}`);
  }
  if (fileCount > 0) {
    parts.push(`${fileCount} ${fileCount === 1 ? 'file' : 'files'}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'no items';
}

export function formatRelativeTime(value: Date | string, now: Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) {
    const hours = Math.round(seconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (seconds < 7 * 86_400) {
    const days = Math.round(seconds / 86_400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
