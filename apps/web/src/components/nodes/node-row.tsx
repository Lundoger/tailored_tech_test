'use client';

import { formatBytes, formatRelativeTime, type NodeDto } from '@data-room/shared';
import { Link2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { NodeIcon } from '@/components/nodes/node-icon';
import { type NodeActions, NodeRowActions } from '@/components/nodes/node-row-actions';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface RowDragHandlers {
  draggingNodeId: string | null;
  onDragStart: (node: NodeDto) => void;
  onDragEnd: () => void;
  onDropInto: (folder: NodeDto) => void;
}

interface NodeRowProps {
  node: NodeDto;
  onOpen: (node: NodeDto) => void;
  actions?: NodeActions;
  trailing?: React.ReactNode;
  drag?: RowDragHandlers;
  showVersions?: boolean;
  /** Set for folders, so the name is a real link: prefetched, and openable in a new tab. */
  href?: string;
  onPrefetch?: (node: NodeDto) => void;
}

export function NodeRow({
  node,
  onOpen,
  actions,
  trailing,
  drag,
  showVersions = true,
  href,
  onPrefetch,
}: NodeRowProps) {
  const [isOver, setIsOver] = useState(false);

  const isBeingDragged = drag?.draggingNodeId === node.id;
  const acceptsDrop =
    Boolean(drag) && node.type === 'FOLDER' && drag!.draggingNodeId !== null && !isBeingDragged;

  return (
    <TableRow
      tabIndex={0}
      draggable={Boolean(drag)}
      aria-label={`${node.type === 'FOLDER' ? 'Folder' : 'File'} ${node.name}`}
      onClick={() => onOpen(node)}
      onMouseEnter={onPrefetch ? () => onPrefetch(node) : undefined}
      onFocus={onPrefetch ? () => onPrefetch(node) : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(node);
        }
      }}
      onDragStart={
        drag
          ? (event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', node.id);
              drag.onDragStart(node);
            }
          : undefined
      }
      onDragEnd={drag?.onDragEnd}
      onDragOver={
        acceptsDrop
          ? (event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setIsOver(true);
            }
          : undefined
      }
      onDragLeave={acceptsDrop ? () => setIsOver(false) : undefined}
      onDrop={
        acceptsDrop
          ? (event) => {
              event.preventDefault();
              setIsOver(false);
              drag!.onDropInto(node);
            }
          : undefined
      }
      className={cn(
        'group focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
        isBeingDragged && 'opacity-40',
        isOver && 'bg-accent ring-ring ring-2 ring-inset',
      )}
    >
      <TableCell className="max-w-0">
        <div className="flex items-center gap-2.5">
          <NodeIcon node={node} />
          {href ? (
            // The row already navigates on click; this exists so the name behaves like
            // a link — Next prefetches it, and ⌘/middle-click opens a new tab.
            <Link
              href={href}
              onClick={(event) => event.stopPropagation()}
              // Anchors are draggable by default, which would hand the browser a link
              // drag instead of letting the row start a move.
              draggable={false}
              className="focus-visible:ring-ring truncate rounded-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              {node.name}
            </Link>
          ) : (
            <span className="truncate font-medium">{node.name}</span>
          )}
          {node.isShared ? (
            <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[0.6875rem] font-normal">
              <Link2 className="size-3" aria-hidden />
              Shared
            </Badge>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="text-muted-foreground hidden text-sm tabular-nums sm:table-cell">
        {node.type === 'FILE' && node.file ? formatBytes(node.file.sizeBytes) : '—'}
      </TableCell>

      {showVersions ? (
        <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
          {node.type === 'FILE' && node.file && node.file.versionCount > 1 ? (
            <span title={`${node.file.versionCount} versions`}>v{node.file.versionCount}</span>
          ) : (
            '—'
          )}
        </TableCell>
      ) : null}

      <TableCell className="text-muted-foreground hidden text-sm whitespace-nowrap lg:table-cell">
        {formatRelativeTime(node.updatedAt)}
      </TableCell>

      <TableCell className="w-12 text-right">
        {actions ? <NodeRowActions node={node} actions={actions} /> : trailing}
      </TableCell>
    </TableRow>
  );
}
