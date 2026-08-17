'use client';

import type { NodeDto } from '@data-room/shared';
import { Download, Ellipsis, FolderInput, Pencil, Share2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface NodeActions {
  onRename: (node: NodeDto) => void;
  onMove: (node: NodeDto) => void;
  onShare: (node: NodeDto) => void;
  onDelete: (node: NodeDto) => void;
  onDownload: (node: NodeDto) => void;
}

export function NodeRowActions({ node, actions }: { node: NodeDto; actions: NodeActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground data-[state=open]:bg-accent size-8"
          aria-label={`Actions for ${node.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Ellipsis className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      {/*
        Radix portals the menu to the body, but React events travel the React tree,
        not the DOM tree — without this, clicking an item also fires the row's
        onClick and opens the file behind the dialog the item just opened.
      */}
      <DropdownMenuContent
        align="end"
        className="w-44"
        onClick={(event) => event.stopPropagation()}
      >
        {node.type === 'FILE' ? (
          <DropdownMenuItem className="gap-2" onSelect={() => actions.onDownload(node)}>
            <Download className="size-4" aria-hidden />
            Download
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem className="gap-2" onSelect={() => actions.onShare(node)}>
          <Share2 className="size-4" aria-hidden />
          Share
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2" onSelect={() => actions.onRename(node)}>
          <Pencil className="size-4" aria-hidden />
          Rename
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2" onSelect={() => actions.onMove(node)}>
          <FolderInput className="size-4" aria-hidden />
          Move to…
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive gap-2"
          onSelect={() => actions.onDelete(node)}
        >
          <Trash2 className="size-4" aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
