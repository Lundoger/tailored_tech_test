// `<dataRoomId>/<nodeId>/v<version>/<safe name>`. Every version gets its own key, so
// an object is written once and never overwritten — which makes an upload safe to
// retry and keeps renaming a database-only change.
export function buildStorageKey(params: {
  dataRoomId: string;
  nodeId: string;
  version: number;
  fileName: string;
}): string {
  return [
    params.dataRoomId,
    params.nodeId,
    `v${params.version}`,
    safeFileName(params.fileName),
  ].join('/');
}

export function safeFileName(fileName: string): string {
  const cleaned = fileName
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+/, '')
    .slice(0, 120);

  return cleaned.length > 0 ? cleaned : 'document';
}
