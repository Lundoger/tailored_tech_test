'use client';

import { FolderOpen, TriangleAlert } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { CreateDataRoomDialog } from '@/components/rooms/create-data-room-dialog';
import { DataRoomCard } from '@/components/rooms/data-room-card';
import { SharedWithYouList } from '@/components/shares/shared-with-you-list';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataRooms } from '@/hooks/use-data-rooms';
import { errorMessage } from '@/lib/api-error';

export default function RoomsPage() {
  const { data: rooms, isPending, isError, error, refetch } = useDataRooms();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Data rooms</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Each room holds the documents for one deal.
          </p>
        </div>
        {rooms && rooms.length > 0 ? <CreateDataRoomDialog /> : null}
      </header>

      <section className="mt-8">
        {isPending ? <RoomGridSkeleton /> : null}

        {isError ? (
          <EmptyState
            icon={TriangleAlert}
            title="Could not load your data rooms"
            description={errorMessage(error)}
            action={
              <Button variant="outline" onClick={() => void refetch()}>
                Try again
              </Button>
            }
          />
        ) : null}

        {rooms && rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed">
            <EmptyState
              icon={FolderOpen}
              title="No data rooms yet"
              description="Create one to start organising documents. You decide who sees it, and when."
              action={<CreateDataRoomDialog />}
            />
          </div>
        ) : null}

        {rooms && rooms.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <li key={room.id}>
                <DataRoomCard room={room} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <SharedWithYouList />
    </div>
  );
}

function RoomGridSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((index) => (
        <li key={index} className="rounded-xl border p-5">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="mt-4 h-5 w-2/3" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-4 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );
}
