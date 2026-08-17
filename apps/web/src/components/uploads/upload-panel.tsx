'use client';

import { formatBytes } from '@data-room/shared';
import { Check, LoaderCircle, RotateCcw, TriangleAlert, X } from 'lucide-react';

import type { UploadItem } from '@/hooks/use-upload-queue';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadPanelProps {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onClearFinished: () => void;
  onCancelAll: () => void;
}

export function UploadPanel({
  items,
  onRetry,
  onCancel,
  onClearFinished,
  onCancelAll,
}: UploadPanelProps) {
  const visible = items.filter((item) => item.status !== 'conflict');
  if (visible.length === 0) return null;

  const inFlight = visible.filter((item) =>
    ['queued', 'uploading', 'finalising'].includes(item.status),
  ).length;
  const failed = visible.filter((item) => item.status === 'error').length;
  const done = visible.filter((item) => item.status === 'done').length;

  return (
    <aside
      aria-label="Uploads"
      className="bg-card fixed right-4 bottom-4 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-lg"
    >
      <header className="flex items-center justify-between gap-2 border-b px-3.5 py-2.5">
        <p className="text-sm font-medium" aria-live="polite">
          {inFlight > 0
            ? `Uploading ${inFlight} file${inFlight === 1 ? '' : 's'}…`
            : failed > 0
              ? `${done} uploaded, ${failed} failed`
              : `${done} file${done === 1 ? '' : 's'} uploaded`}
        </p>
        <div className="flex items-center gap-1">
          {inFlight > 0 ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCancelAll}>
              Cancel all
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onClearFinished}
              aria-label="Dismiss uploads"
            >
              <X className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </header>

      <ul className="max-h-72 divide-y overflow-y-auto">
        {visible.map((item) => (
          <UploadRow key={item.id} item={item} onRetry={onRetry} onCancel={onCancel} />
        ))}
      </ul>
    </aside>
  );
}

function UploadRow({
  item,
  onRetry,
  onCancel,
}: {
  item: UploadItem;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const isActive = item.status === 'uploading' || item.status === 'finalising';

  return (
    <li className="px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <StatusIcon status={item.status} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            {item.finalName ?? item.fileName}
            {item.finalName && item.finalName !== item.fileName ? (
              <span className="text-muted-foreground ml-1.5 text-xs">(renamed)</span>
            ) : null}
          </p>
          <p
            className={cn(
              'truncate text-xs',
              item.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {describe(item)}
          </p>
        </div>

        {item.status === 'error' ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onRetry(item.id)}
            aria-label={`Retry ${item.fileName}`}
          >
            <RotateCcw className="size-3.5" aria-hidden />
          </Button>
        ) : null}

        {isActive || item.status === 'queued' ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onCancel(item.id)}
            aria-label={`Cancel ${item.fileName}`}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        ) : null}
      </div>

      {isActive ? (
        <Progress
          value={item.status === 'finalising' ? 100 : Math.round(item.progress * 100)}
          className="mt-2 h-1"
          aria-label={`${item.fileName} upload progress`}
        />
      ) : null}
    </li>
  );
}

function StatusIcon({ status }: { status: UploadItem['status'] }) {
  if (status === 'done') {
    return <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500" aria-hidden />;
  }
  if (status === 'error') {
    return <TriangleAlert className="text-destructive size-4 shrink-0" aria-hidden />;
  }
  if (status === 'cancelled') {
    return <X className="text-muted-foreground size-4 shrink-0" aria-hidden />;
  }
  return (
    <LoaderCircle
      className={cn('text-muted-foreground size-4 shrink-0', status !== 'queued' && 'animate-spin')}
      aria-hidden
    />
  );
}

function describe(item: UploadItem): string {
  switch (item.status) {
    case 'queued':
      return 'Waiting…';
    case 'uploading':
      return `${Math.round(item.progress * 100)}% of ${formatBytes(item.sizeBytes)}`;
    case 'finalising':
      return 'Finishing up…';
    case 'done':
      return formatBytes(item.sizeBytes);
    case 'cancelled':
      return 'Cancelled';
    case 'error':
      return item.error ?? 'Upload failed';
    case 'conflict':
      return 'Waiting for your decision';
  }
}
