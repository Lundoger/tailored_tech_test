'use client';

import type { NodeDto } from '@data-room/shared';
import { Check, Folder, FolderOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useFolderTree, useMoveNode } from '@/hooks/use-nodes';
import type { FolderTreeNode } from '@/lib/folder-tree';
import { ApiError, errorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

interface MoveDialogProps {
  dataRoomId: string;
  roomName: string;
  node: NodeDto | null;
  onOpenChange: (open: boolean) => void;
}

export function MoveDialog({ dataRoomId, roomName, node, onOpenChange }: MoveDialogProps) {
  return (
    <Dialog open={Boolean(node)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {node ? (
          <MovePicker
            key={node.id}
            dataRoomId={dataRoomId}
            roomName={roomName}
            node={node}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MovePicker({
  dataRoomId,
  roomName,
  node,
  onDone,
}: {
  dataRoomId: string;
  roomName: string;
  node: NodeDto;
  onDone: () => void;
}) {
  const { data: folders, isPending } = useFolderTree(dataRoomId);
  const move = useMoveNode(dataRoomId);
  const [target, setTarget] = useState<string | null>(node.parentId);

  const blocked = useMemo(() => {
    if (node.type !== 'FOLDER' || !folders) return new Set<string>();

    const childrenOf = new Map<string, FolderTreeNode[]>();
    for (const folder of folders) {
      const siblings = childrenOf.get(folder.parentId ?? 'root') ?? [];
      siblings.push(folder);
      childrenOf.set(folder.parentId ?? 'root', siblings);
    }

    const excluded = new Set<string>([node.id]);
    const queue = [node.id];
    while (queue.length > 0) {
      const current = queue.pop()!;
      for (const child of childrenOf.get(current) ?? []) {
        excluded.add(child.id);
        queue.push(child.id);
      }
    }

    return excluded;
  }, [folders, node.id, node.type]);

  const submit = () => {
    move.mutate(
      { node, input: { parentId: target, autoResolveConflict: false } },
      {
        onSuccess: () => {
          onDone();
          toast.success(`Moved "${node.name}".`);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.is('NAME_CONFLICT')) {
            toast.error(`Something named "${node.name}" is already in that folder.`, {
              description: 'Rename one of them first, or pick another destination.',
            });
            return;
          }
          toast.error(errorMessage(error));
        },
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="truncate pr-8">Move “{node.name}”</DialogTitle>
        <DialogDescription>Choose where it should go.</DialogDescription>
      </DialogHeader>

      <ScrollArea className="h-72 rounded-lg border">
        <div className="p-1.5">
          <TargetOption
            label={roomName}
            depth={0}
            isSelected={target === null}
            isCurrent={node.parentId === null}
            onSelect={() => setTarget(null)}
          />

          {isPending ? (
            <div className="grid gap-1.5 p-1.5" aria-hidden>
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : null}

          {folders?.map((folder) => (
            <TargetOption
              key={folder.id}
              label={folder.name}
              depth={folder.depth + 1}
              isSelected={target === folder.id}
              isCurrent={node.parentId === folder.id}
              isDisabled={blocked.has(folder.id)}
              onSelect={() => setTarget(folder.id)}
            />
          ))}
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={move.isPending || target === node.parentId}>
          {move.isPending ? 'Moving…' : 'Move here'}
        </Button>
      </DialogFooter>
    </>
  );
}

function TargetOption({
  label,
  depth,
  isSelected,
  isCurrent,
  isDisabled,
  onSelect,
}: {
  label: string;
  depth: number;
  isSelected: boolean;
  isCurrent?: boolean;
  isDisabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onSelect}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors',
        isSelected ? 'bg-accent font-medium' : 'hover:bg-accent/60',
        isDisabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
      )}
    >
      {isSelected ? (
        <FolderOpen className="size-4 shrink-0" aria-hidden />
      ) : (
        <Folder className="text-muted-foreground size-4 shrink-0" aria-hidden />
      )}
      <span className="truncate">{label}</span>
      {isCurrent ? (
        <span className="text-muted-foreground ml-auto shrink-0 text-xs">current</span>
      ) : null}
      {isSelected ? <Check className="ml-auto size-4 shrink-0" aria-hidden /> : null}
    </button>
  );
}
