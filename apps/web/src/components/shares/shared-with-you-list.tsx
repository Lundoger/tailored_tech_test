'use client';

import { formatRelativeTime, type ReceivedShareDto } from '@data-room/shared';
import { ArrowRight, FileText, FolderOpen } from 'lucide-react';
import Link from 'next/link';

import { LogoMark } from '@/components/brand/logo';
import { useReceivedShares } from '@/hooks/use-shares';

export function SharedWithYouList() {
  const { data: shares } = useReceivedShares();

  if (!shares || shares.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Shared with you</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Read-only access granted by other people.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shares.map((share) => (
          <li key={share.id}>
            <ReceivedShareCard share={share} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReceivedShareCard({ share }: { share: ReceivedShareDto }) {
  const Icon =
    share.targetType === 'DATA_ROOM'
      ? LogoMark
      : share.targetName.includes('.')
        ? FileText
        : FolderOpen;

  return (
    <Link
      href={share.url}
      className="group bg-card hover:border-foreground/25 focus-visible:ring-ring flex flex-col rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <Icon className="text-foreground/80 size-7" />
        <ArrowRight
          className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </div>

      <p className="mt-3 truncate font-medium">{share.targetName}</p>
      {share.targetType === 'NODE' ? (
        <p className="text-muted-foreground truncate text-xs">in {share.dataRoomName}</p>
      ) : null}
      <p className="text-muted-foreground mt-2 truncate text-xs">
        from {share.sharedBy.name} · {formatRelativeTime(share.createdAt)}
      </p>
    </Link>
  );
}
