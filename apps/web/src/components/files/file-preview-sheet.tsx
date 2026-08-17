'use client';

import {
  formatBytes,
  formatRelativeTime,
  type FileVersionDto,
  type NodeDto,
} from '@data-room/shared';
import { Download, ExternalLink, Pencil, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { PdfViewer } from '@/components/files/pdf-viewer';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadFile, useFileVersions, useFileViewUrl } from '@/hooks/use-files';
import { errorMessage } from '@/lib/api-error';

interface FilePreviewSheetProps {
  node: NodeDto | null;
  onOpenChange: (open: boolean) => void;
  onRename: (node: NodeDto) => void;
  onShare: (node: NodeDto) => void;
}

export function FilePreviewSheet({ node, onOpenChange, onRename, onShare }: FilePreviewSheetProps) {
  const isOpen = Boolean(node);
  const view = useFileViewUrl(node?.id ?? null, isOpen);
  const versions = useFileVersions(node?.id ?? null, isOpen);

  // `node` was captured when the row was clicked, so its size and version count go
  // stale as soon as a new version is uploaded. The version list is the live source.
  const currentVersion = versions.data?.find((version) => version.isCurrent);
  const sizeBytes = currentVersion?.sizeBytes ?? node?.file?.sizeBytes ?? 0;
  const versionCount = versions.data?.length ?? node?.file?.versionCount ?? 1;

  const download = async (path: string) => {
    try {
      await downloadFile(path);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // The width classes need the same `data-[side=right]:` prefix the sheet's
        // own defaults use. A plain `sm:max-w-5xl` loses on specificity to the
        // built-in `data-[side=right]:sm:max-w-sm` and the panel stays at 384px.
        className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-5xl data-[side=right]:xl:max-w-6xl"
      >
        <SheetHeader className="gap-1 border-b px-5 py-4">
          <SheetTitle className="truncate pr-8">{node?.name}</SheetTitle>
          <SheetDescription>
            {formatBytes(sizeBytes)} ·{' '}
            {versionCount > 1 ? `${versionCount} versions` : 'Single version'}
            {node ? ` · updated ${formatRelativeTime(node.updatedAt)}` : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-2.5">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => node && void download(`/nodes/${node.id}/download-url`)}
          >
            <Download className="size-4" aria-hidden />
            Download
          </Button>

          <Button size="sm" variant="outline" className="gap-2" asChild disabled={!view.data?.url}>
            <a href={view.data?.url ?? '#'} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              Open in a new tab
            </a>
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => node && onShare(node)}
            >
              <Share2 className="size-4" aria-hidden />
              Share
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => node && onRename(node)}
            >
              <Pencil className="size-4" aria-hidden />
              Rename
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <div className="flex min-h-[26rem] min-w-0 flex-1 flex-col p-4">
            <PdfViewer
              url={view.data?.url}
              fileName={node?.name ?? 'document'}
              isLoading={view.isPending}
              error={view.isError ? errorMessage(view.error) : undefined}
            />
          </div>

          <aside className="flex shrink-0 flex-col border-t p-4 lg:w-72 lg:overflow-y-auto lg:border-t-0 lg:border-l">
            <h3 className="text-sm font-medium">Version history</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Uploading a file under this name again keeps the old contents here.
            </p>

            <div className="mt-3">
              {versions.isPending ? (
                <div className="grid gap-2" aria-hidden>
                  {[0, 1].map((index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <ol className="grid gap-1.5">
                  {versions.data?.map((version) => (
                    <VersionRow
                      key={version.id}
                      version={version}
                      onDownload={() => void download(`/files/versions/${version.id}/download-url`)}
                    />
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VersionRow({ version, onDownload }: { version: FileVersionDto; onDownload: () => void }) {
  return (
    <li className="rounded-lg border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Version {version.version}
          {version.isCurrent ? (
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">current</span>
          ) : null}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onDownload}
          aria-label={`Download version ${version.version}`}
        >
          <Download className="size-3.5" aria-hidden />
        </Button>
      </div>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {formatBytes(version.sizeBytes)} · {formatRelativeTime(version.createdAt)}
      </p>
      <p className="text-muted-foreground truncate text-xs">by {version.uploadedBy.name}</p>
    </li>
  );
}
