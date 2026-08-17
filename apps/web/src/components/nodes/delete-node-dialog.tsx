'use client';

import { formatBytes, formatItemCounts, type NodeDto } from '@data-room/shared';
import { Link2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteNode, useDeletePreview } from '@/hooks/use-nodes';
import { errorMessage } from '@/lib/api-error';

interface DeleteNodeDialogProps {
  dataRoomId: string;
  node: NodeDto | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (node: NodeDto) => void;
}

export function DeleteNodeDialog({
  dataRoomId,
  node,
  onOpenChange,
  onDeleted,
}: DeleteNodeDialogProps) {
  const preview = useDeletePreview(node?.id ?? null, Boolean(node));
  const remove = useDeleteNode(dataRoomId);

  const isFolder = node?.type === 'FOLDER';

  const confirm = () => {
    if (!node) return;

    remove.mutate(node, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted?.(node);
        toast.success(`"${node.name}" deleted.`);
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  };

  return (
    <AlertDialog open={Boolean(node)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="text-destructive size-4" aria-hidden />
            Delete “{node?.name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isFolder
              ? 'This removes the folder and everything inside it. It cannot be undone.'
              : 'This removes the file and all of its versions. It cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-muted/40 rounded-lg border p-3.5 text-sm">
          {preview.isPending ? (
            <div className="grid gap-2" aria-hidden>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : preview.data ? (
            <dl className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Will be deleted</dt>
                <dd className="font-medium">
                  {isFolder
                    ? formatItemCounts(preview.data.folderCount, preview.data.fileCount)
                    : '1 file'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Total size</dt>
                <dd className="font-medium tabular-nums">
                  {formatBytes(preview.data.totalSizeBytes)}
                </dd>
              </div>
              {preview.data.affectedShareCount > 0 ? (
                <div className="text-destructive mt-1 flex items-start gap-2 border-t pt-2.5">
                  <Link2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <p>
                    {preview.data.affectedShareCount === 1
                      ? '1 share link points here and will stop working.'
                      : `${preview.data.affectedShareCount} share links point here and will stop working.`}
                  </p>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-muted-foreground">Could not load the contents summary.</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              confirm();
            }}
            disabled={remove.isPending}
            className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/30 text-white"
          >
            {remove.isPending ? 'Deleting…' : `Delete ${isFolder ? 'folder' : 'file'}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
