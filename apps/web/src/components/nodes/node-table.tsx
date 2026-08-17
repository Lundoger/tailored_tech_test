'use client';

import type { NodeDto, NodeSort, SortDirection } from '@data-room/shared';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { NodeRow, type RowDragHandlers } from '@/components/nodes/node-row';
import type { NodeActions } from '@/components/nodes/node-row-actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface NodeTableProps {
  nodes: NodeDto[];
  onOpen: (node: NodeDto) => void;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  emptyState: React.ReactNode;

  actions?: NodeActions;
  renderTrailing?: (node: NodeDto) => React.ReactNode;
  drag?: RowDragHandlers;

  sort?: NodeSort;
  direction?: SortDirection;
  onSortChange?: (sort: NodeSort) => void;
  showVersions?: boolean;

  folderHref?: (node: NodeDto) => string;
  onPrefetch?: (node: NodeDto) => void;
}

export function NodeTable({
  nodes,
  onOpen,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  emptyState,
  actions,
  renderTrailing,
  drag,
  sort = 'name',
  direction = 'asc',
  onSortChange,
  showVersions = true,
  folderHref,
  onPrefetch,
}: NodeTableProps) {
  if (isLoading) {
    return <NodeTableSkeleton showVersions={showVersions} />;
  }

  if (nodes.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead
              column="name"
              label="Name"
              sort={sort}
              direction={direction}
              onSortChange={onSortChange}
            />
            <SortableHead
              column="size"
              label="Size"
              sort={sort}
              direction={direction}
              onSortChange={onSortChange}
              className="hidden w-28 sm:table-cell"
            />
            {showVersions ? (
              <TableHead className="hidden w-24 md:table-cell">Versions</TableHead>
            ) : null}
            <SortableHead
              column="updatedAt"
              label="Modified"
              sort={sort}
              direction={direction}
              onSortChange={onSortChange}
              className="hidden w-36 lg:table-cell"
            />
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {nodes.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              onOpen={onOpen}
              actions={actions}
              trailing={renderTrailing?.(node)}
              drag={drag}
              showVersions={showVersions}
              href={node.type === 'FOLDER' ? folderHref?.(node) : undefined}
              onPrefetch={node.type === 'FOLDER' ? onPrefetch : undefined}
            />
          ))}
        </TableBody>
      </Table>

      {hasNextPage ? <LoadMore onLoadMore={onLoadMore} isFetching={isFetchingNextPage} /> : null}
    </div>
  );
}

function SortableHead({
  column,
  label,
  sort,
  direction,
  onSortChange,
  className,
}: {
  column: NodeSort;
  label: string;
  sort: NodeSort;
  direction: SortDirection;
  onSortChange?: (sort: NodeSort) => void;
  className?: string;
}) {
  const isActive = sort === column;

  if (!onSortChange) {
    return <TableHead className={className}>{label}</TableHead>;
  }

  return (
    <TableHead
      className={className}
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSortChange(column)}
        className="group hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {label}
        <ChevronDown
          className={cn(
            'size-3.5 transition-all',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
            isActive && direction === 'asc' && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}

function LoadMore({ onLoadMore, isFetching }: { onLoadMore: () => void; isFetching: boolean }) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetching) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isFetching, onLoadMore]);

  return (
    <div ref={sentinel} className="flex justify-center border-t p-3">
      <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={isFetching}>
        {isFetching ? 'Loading…' : 'Load more'}
        {!isFetching ? <ChevronRight className="size-4" aria-hidden /> : null}
      </Button>
    </div>
  );
}

export function NodeTableSkeleton({ showVersions = true }: { showVersions?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border" aria-hidden>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead className="hidden w-28 sm:table-cell">Size</TableHead>
            {showVersions ? (
              <TableHead className="hidden w-24 md:table-cell">Versions</TableHead>
            ) : null}
            <TableHead className="hidden w-36 lg:table-cell">Modified</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <TableRow key={index} className="hover:bg-transparent">
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-14" />
              </TableCell>
              {showVersions ? (
                <TableCell className="hidden md:table-cell">
                  <Skeleton className="h-4 w-8" />
                </TableCell>
              ) : null}
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
