'use client';

import {
  formatBytes,
  formatItemCounts,
  type NodeDto,
  type NodeSort,
  type SearchResultDto,
  type SortDirection,
} from '@data-room/shared';
import { FolderPlus, Inbox, Share2, TriangleAlert, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/empty-state';
import { FilePreviewSheet } from '@/components/files/file-preview-sheet';
import { DeleteNodeDialog } from '@/components/nodes/delete-node-dialog';
import { FolderTree } from '@/components/nodes/folder-tree';
import { MoveDialog } from '@/components/nodes/move-dialog';
import { NewFolderDialog } from '@/components/nodes/new-folder-dialog';
import { NodeBreadcrumbs } from '@/components/nodes/node-breadcrumbs';
import { NodeTable } from '@/components/nodes/node-table';
import type { NodeActions } from '@/components/nodes/node-row-actions';
import { RenameDialog } from '@/components/nodes/rename-dialog';
import { SearchCommand } from '@/components/nodes/search-command';
import { ShareDialog, type ShareTarget } from '@/components/shares/share-dialog';
import { UploadConflictDialog } from '@/components/uploads/upload-conflict-dialog';
import { UploadDropzone } from '@/components/uploads/upload-dropzone';
import { UploadPanel } from '@/components/uploads/upload-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadFile } from '@/hooks/use-files';
import { useDataRoom } from '@/hooks/use-data-rooms';
import {
  useBreadcrumbs,
  useFolderTree,
  useMoveNode,
  useNodeList,
  useNodeStats,
} from '@/hooks/use-nodes';
import { useUploadQueue } from '@/hooks/use-upload-queue';
import { ApiError, errorMessage } from '@/lib/api-error';

interface RoomBrowserProps {
  dataRoomId: string;
  folderId: string | null;
}

export function RoomBrowser({ dataRoomId, folderId }: RoomBrowserProps) {
  const router = useRouter();

  const room = useDataRoom(dataRoomId);
  const tree = useFolderTree(dataRoomId);
  const breadcrumbs = useBreadcrumbs(dataRoomId, folderId);

  const [sort, setSort] = useState<NodeSort>('name');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const list = useNodeList(dataRoomId, folderId, sort, direction);

  const uploads = useUploadQueue({ dataRoomId, parentId: folderId });
  const move = useMoveNode(dataRoomId);
  const fileInput = useRef<HTMLInputElement>(null);

  const [isNewFolderOpen, setNewFolderOpen] = useState(false);
  const [renaming, setRenaming] = useState<NodeDto | null>(null);
  const [moving, setMoving] = useState<NodeDto | null>(null);
  const [deleting, setDeleting] = useState<NodeDto | null>(null);
  const [previewing, setPreviewing] = useState<NodeDto | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [dragging, setDragging] = useState<NodeDto | null>(null);

  // Inside a folder, its own subtree totals are what you want to see; at the root
  // they are the room's. Both come from the same indexed `ancestorIds` query.
  const folderStats = useNodeStats(folderId);
  const stats = folderId ? folderStats.data : room.data?.stats;

  const nodes = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);

  const currentFolderName =
    breadcrumbs.data?.[breadcrumbs.data.length - 1]?.name ?? room.data?.name ?? 'this folder';

  const hrefFor = useCallback(
    (target: string | null) =>
      target ? `/rooms/${dataRoomId}/f/${target}` : `/rooms/${dataRoomId}`,
    [dataRoomId],
  );

  const openNode = useCallback(
    (node: NodeDto) => {
      if (node.type === 'FOLDER') {
        router.push(hrefFor(node.id));
      } else {
        setPreviewing(node);
      }
    },
    [hrefFor, router],
  );

  const changeSort = (column: NodeSort) => {
    if (column === sort) {
      setDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSort(column);
    setDirection('asc');
  };

  const moveTo = (node: NodeDto, parentId: string | null) => {
    if (node.parentId === parentId) return;

    move.mutate(
      { nodeId: node.id, input: { parentId, autoResolveConflict: false } },
      {
        onSuccess: () => toast.success(`Moved “${node.name}”.`),
        onError: (error) => {
          if (error instanceof ApiError && error.is('NAME_CONFLICT')) {
            toast.error(`“${node.name}” already exists in that folder.`, {
              description: 'Rename one of them, or use “Move to…” to pick elsewhere.',
            });
            return;
          }
          toast.error(errorMessage(error));
        },
      },
    );
  };

  const actions: NodeActions = {
    onRename: setRenaming,
    onMove: setMoving,
    onDelete: setDeleting,
    onShare: (node) =>
      setShareTarget({
        nodeId: node.id,
        name: node.name,
        kind: node.type === 'FOLDER' ? 'folder' : 'file',
      }),
    onDownload: (node) => {
      void downloadFile(`/nodes/${node.id}/download-url`).catch((error: unknown) =>
        toast.error(errorMessage(error)),
      );
    },
  };

  const openFromSearch = (result: SearchResultDto) => {
    setPreviewing(result);
  };

  return (
    <UploadDropzone onFiles={uploads.addFiles} targetName={currentFolderName}>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <NodeBreadcrumbs
              trail={breadcrumbs.data}
              hrefFor={hrefFor}
              isLoading={breadcrumbs.isPending}
            />

            <div className="flex flex-wrap items-center gap-2">
              <SearchCommand
                dataRoomId={dataRoomId}
                onOpenFolder={(id) => router.push(hrefFor(id))}
                onOpenFile={openFromSearch}
              />

              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  setShareTarget({
                    nodeId: null,
                    name: room.data?.name ?? 'this data room',
                    kind: 'data room',
                  })
                }
              >
                <Share2 className="size-4" aria-hidden />
                <span className="hidden sm:inline">Share</span>
              </Button>

              <Button variant="outline" className="gap-2" onClick={() => setNewFolderOpen(true)}>
                <FolderPlus className="size-4" aria-hidden />
                <span className="hidden sm:inline">New folder</span>
              </Button>

              <Button className="gap-2" onClick={() => fileInput.current?.click()}>
                <Upload className="size-4" aria-hidden />
                Upload
              </Button>

              <input
                ref={fileInput}
                type="file"
                multiple
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) uploads.addFiles(files);
                  event.target.value = '';
                }}
              />
            </div>
          </div>

          <div className="text-muted-foreground text-sm">
            {stats ? (
              <p>
                {formatItemCounts(stats.folderCount, stats.fileCount)} ·{' '}
                {formatBytes(stats.totalSizeBytes)}{' '}
                {folderId ? 'in this folder' : 'in this data room'}
              </p>
            ) : (
              <Skeleton className="h-4 w-48" />
            )}
          </div>
        </header>

        <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <FolderTree
                folders={tree.data}
                isLoading={tree.isPending}
                roomName={room.data?.name ?? 'Data room'}
                currentFolderId={folderId}
                hrefFor={hrefFor}
                isDragging={Boolean(dragging)}
                onDropNode={(targetId) => {
                  if (dragging) moveTo(dragging, targetId);
                  setDragging(null);
                }}
              />
            </div>
          </aside>

          <section className="min-w-0">
            {list.isError ? (
              <div className="rounded-xl border border-dashed">
                <EmptyState
                  icon={TriangleAlert}
                  title="Could not load this folder"
                  description={errorMessage(list.error)}
                  action={
                    <Button variant="outline" onClick={() => void list.refetch()}>
                      Try again
                    </Button>
                  }
                />
              </div>
            ) : (
              <NodeTable
                nodes={nodes}
                actions={actions}
                onOpen={openNode}
                sort={sort}
                direction={direction}
                onSortChange={changeSort}
                isLoading={list.isPending}
                hasNextPage={list.hasNextPage}
                isFetchingNextPage={list.isFetchingNextPage}
                onLoadMore={() => void list.fetchNextPage()}
                drag={{
                  draggingNodeId: dragging?.id ?? null,
                  onDragStart: setDragging,
                  onDragEnd: () => setDragging(null),
                  onDropInto: (folder) => {
                    if (dragging) moveTo(dragging, folder.id);
                    setDragging(null);
                  },
                }}
                emptyState={
                  <div className="rounded-xl border border-dashed">
                    <EmptyState
                      icon={Inbox}
                      title={folderId ? 'This folder is empty' : 'Nothing here yet'}
                      description="Drag PDFs anywhere on this page to upload them, or create a folder to start organising."
                      action={
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button onClick={() => fileInput.current?.click()} className="gap-2">
                            <Upload className="size-4" aria-hidden />
                            Upload files
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setNewFolderOpen(true)}
                            className="gap-2"
                          >
                            <FolderPlus className="size-4" aria-hidden />
                            New folder
                          </Button>
                        </div>
                      }
                    />
                  </div>
                }
              />
            )}
          </section>
        </div>
      </div>

      <NewFolderDialog
        dataRoomId={dataRoomId}
        parentId={folderId}
        parentName={currentFolderName}
        open={isNewFolderOpen}
        onOpenChange={setNewFolderOpen}
      />

      <RenameDialog
        dataRoomId={dataRoomId}
        node={renaming}
        onOpenChange={(open) => !open && setRenaming(null)}
      />

      <MoveDialog
        dataRoomId={dataRoomId}
        roomName={room.data?.name ?? 'Data room'}
        node={moving}
        onOpenChange={(open) => !open && setMoving(null)}
      />

      <DeleteNodeDialog
        dataRoomId={dataRoomId}
        node={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={(node) => {
          if (previewing?.id === node.id) setPreviewing(null);
          if (node.id === folderId) router.replace(hrefFor(node.parentId));
        }}
      />

      <FilePreviewSheet
        node={previewing}
        onOpenChange={(open) => !open && setPreviewing(null)}
        onRename={(node) => {
          setPreviewing(null);
          setRenaming(node);
        }}
        onShare={(node) => {
          setPreviewing(null);
          setShareTarget({ nodeId: node.id, name: node.name, kind: 'file' });
        }}
      />

      <ShareDialog
        dataRoomId={dataRoomId}
        target={shareTarget}
        onOpenChange={(open) => !open && setShareTarget(null)}
      />

      {uploads.conflicts.length > 0 ? (
        <UploadConflictDialog conflicts={uploads.conflicts} onResolve={uploads.resolveConflict} />
      ) : null}

      <UploadPanel
        items={uploads.items}
        onRetry={uploads.retry}
        onCancel={uploads.cancel}
        onCancelAll={uploads.cancelAll}
        onClearFinished={uploads.clearFinished}
      />
    </UploadDropzone>
  );
}
