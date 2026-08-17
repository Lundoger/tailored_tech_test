'use client';

import {
  formatBytes,
  formatItemCounts,
  type NodeDto,
  type SharedTargetDto,
} from '@data-room/shared';
import { Download, Eye, Inbox, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { LogoWordmark } from '@/components/brand/logo';
import { EmptyState } from '@/components/common/empty-state';
import { NodeBreadcrumbs } from '@/components/nodes/node-breadcrumbs';
import { NodeTable } from '@/components/nodes/node-table';
import { ShareErrorScreen } from '@/components/shares/share-error-screen';
import { SharedFileSheet } from '@/components/shares/shared-file-sheet';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/layout/full-page-spinner';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  downloadSharedFile,
  useSharedBreadcrumbs,
  useSharedNodes,
  useSharedTarget,
} from '@/hooks/use-shared-view';
import { errorMessage } from '@/lib/api-error';

export function SharedBrowser({ token, folderId }: { token: string; folderId: string | null }) {
  const router = useRouter();
  const target = useSharedTarget(token);
  const [previewing, setPreviewing] = useState<NodeDto | null>(null);

  const isSingleFile = target.data?.rootNode?.type === 'FILE';

  const list = useSharedNodes(token, folderId, Boolean(target.data) && !isSingleFile);
  const breadcrumbs = useSharedBreadcrumbs(token, folderId, Boolean(target.data));

  const nodes = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);

  if (target.isPending) {
    return <FullPageSpinner label="Opening the shared link" />;
  }

  if (target.isError) {
    return (
      <SharedShell sharedBy={null}>
        <ShareErrorScreen error={target.error} />
      </SharedShell>
    );
  }

  const share = target.data;

  const hrefFor = (id: string | null) => (id ? `/s/${token}/f/${id}` : `/s/${token}`);

  const download = (node: NodeDto) => {
    void downloadSharedFile(token, node.id).catch((error: unknown) =>
      toast.error(errorMessage(error)),
    );
  };

  return (
    <SharedShell sharedBy={share}>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          {isSingleFile ? (
            <h1 className="font-heading text-lg font-semibold tracking-tight">
              {share.rootNode?.name}
            </h1>
          ) : (
            <NodeBreadcrumbs
              trail={breadcrumbs.data}
              hrefFor={hrefFor}
              isLoading={breadcrumbs.isPending}
            />
          )}

          <p className="text-muted-foreground text-sm">
            {formatItemCounts(share.stats.folderCount, share.stats.fileCount)} ·{' '}
            {formatBytes(share.stats.totalSizeBytes)}
          </p>
        </header>

        <section className="mt-6">
          {isSingleFile && share.rootNode ? (
            <SingleFileCard node={share.rootNode} onOpen={setPreviewing} onDownload={download} />
          ) : list.isError ? (
            <SharedShellError error={list.error} />
          ) : (
            <NodeTable
              nodes={nodes}
              onOpen={(node) => {
                if (node.type === 'FOLDER') router.push(hrefFor(node.id));
                else setPreviewing(node);
              }}
              isLoading={list.isPending}
              hasNextPage={list.hasNextPage}
              isFetchingNextPage={list.isFetchingNextPage}
              onLoadMore={() => void list.fetchNextPage()}
              showVersions={false}
              renderTrailing={(node) =>
                node.type === 'FILE' ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-8"
                    aria-label={`Download ${node.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      download(node);
                    }}
                  >
                    <Download className="size-4" aria-hidden />
                  </Button>
                ) : null
              }
              emptyState={
                <div className="rounded-xl border border-dashed">
                  <EmptyState
                    icon={Inbox}
                    title="Nothing in this folder"
                    description="The owner has not put any documents here yet."
                  />
                </div>
              }
            />
          )}
        </section>
      </div>

      <SharedFileSheet
        token={token}
        node={previewing}
        onOpenChange={(open) => !open && setPreviewing(null)}
      />
    </SharedShell>
  );
}

function SharedShell({
  sharedBy,
  children,
}: {
  sharedBy: SharedTargetDto | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <LogoWordmark />
            {sharedBy ? (
              <>
                <span className="bg-border hidden h-4 w-px sm:block" aria-hidden />
                <p className="text-muted-foreground hidden min-w-0 truncate text-sm sm:block">
                  Shared by {sharedBy.sharedBy.name}
                </p>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:inline-flex">
              <Lock className="size-3" aria-hidden />
              Read-only
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

function SharedShellError({ error }: { error: unknown }) {
  return (
    <div className="rounded-xl border border-dashed">
      <EmptyState
        icon={Inbox}
        title="Could not load this folder"
        description={errorMessage(error)}
      />
    </div>
  );
}

function SingleFileCard({
  node,
  onOpen,
  onDownload,
}: {
  node: NodeDto;
  onOpen: (node: NodeDto) => void;
  onDownload: (node: NodeDto) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
      <div className="min-w-0">
        <p className="truncate font-medium">{node.name}</p>
        <p className="text-muted-foreground text-sm">
          {node.file ? formatBytes(node.file.sizeBytes) : ''}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2" onClick={() => onDownload(node)}>
          <Download className="size-4" aria-hidden />
          Download
        </Button>
        <Button className="gap-2" onClick={() => onOpen(node)}>
          <Eye className="size-4" aria-hidden />
          View document
        </Button>
      </div>
    </div>
  );
}
