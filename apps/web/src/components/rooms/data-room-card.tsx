import {
  type DataRoomDto,
  formatBytes,
  formatItemCounts,
  formatRelativeTime,
} from '@data-room/shared';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { LogoMark } from '@/components/brand/logo';

export function DataRoomCard({ room }: { room: DataRoomDto }) {
  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group bg-card hover:border-foreground/25 focus-visible:ring-ring relative flex flex-col rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <LogoMark className="text-foreground/90 size-9" />
        <ArrowRight
          className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </div>

      <h3 className="font-heading mt-4 font-semibold tracking-tight">{room.name}</h3>
      {room.description ? (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{room.description}</p>
      ) : null}

      <dl className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <dt className="sr-only">Contents</dt>
        <dd>{formatItemCounts(room.stats.folderCount, room.stats.fileCount)}</dd>
        <dd aria-hidden>·</dd>
        <dt className="sr-only">Total size</dt>
        <dd>{formatBytes(room.stats.totalSizeBytes)}</dd>
        <dd aria-hidden>·</dd>
        <dt className="sr-only">Last updated</dt>
        <dd>updated {formatRelativeTime(room.updatedAt)}</dd>
      </dl>
    </Link>
  );
}
