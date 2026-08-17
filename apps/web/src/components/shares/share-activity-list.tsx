'use client';

import { formatRelativeTime, type ShareAccessEventDto } from '@data-room/shared';
import { Download, Eye, FolderOpen } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useShareEvents } from '@/hooks/use-shares';

export function ShareActivityList({
  isOpen,
  publicShareId,
  restrictedShareId,
}: {
  isOpen: boolean;
  publicShareId: string | null;
  restrictedShareId: string | null;
}) {
  const publicEvents = useShareEvents(publicShareId, isOpen);
  const restrictedEvents = useShareEvents(restrictedShareId, isOpen);

  const isPending =
    (Boolean(publicShareId) && publicEvents.isPending) ||
    (Boolean(restrictedShareId) && restrictedEvents.isPending);

  const events = [...(publicEvents.data ?? []), ...(restrictedEvents.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (!publicShareId && !restrictedShareId) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-5 text-center text-sm">
        Nothing to show yet — this item has not been shared.
      </p>
    );
  }

  if (isPending) {
    return (
      <div className="grid gap-2" aria-hidden>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-5 text-center text-sm">
        No one has opened this link yet.
      </p>
    );
  }

  return (
    <ol className="max-h-72 divide-y overflow-y-auto rounded-lg border">
      {events.map((event) => (
        <li key={event.id} className="flex items-center gap-3 px-3 py-2.5">
          <ActionIcon action={event.action} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{describeActor(event)}</p>
            <p className="text-muted-foreground truncate text-xs">
              {describeAction(event)} · {formatRelativeTime(event.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ActionIcon({ action }: { action: ShareAccessEventDto['action'] }) {
  const className = 'size-4 shrink-0 text-muted-foreground';

  if (action === 'DOWNLOAD') return <Download className={className} aria-hidden />;
  if (action === 'VIEW') return <Eye className={className} aria-hidden />;
  return <FolderOpen className={className} aria-hidden />;
}

function describeActor(event: ShareAccessEventDto): string {
  if (event.actor.name) return event.actor.name;
  if (event.actor.email) return event.actor.email;
  return 'Someone with the link';
}

function describeAction(event: ShareAccessEventDto): string {
  switch (event.action) {
    case 'DOWNLOAD':
      return event.nodeName ? `Downloaded ${event.nodeName}` : 'Downloaded a document';
    case 'VIEW':
      return event.nodeName ? `Opened ${event.nodeName}` : 'Opened a document';
    case 'LIST':
      return 'Opened the shared link';
  }
}
