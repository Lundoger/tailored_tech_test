'use client';

import { formatBytes, type NodeDto } from '@data-room/shared';
import { Download, ExternalLink } from 'lucide-react';
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
import { downloadSharedFile, useSharedFileUrl } from '@/hooks/use-shared-view';
import { errorMessage } from '@/lib/api-error';

export function SharedFileSheet({
  token,
  node,
  onOpenChange,
}: {
  token: string;
  node: NodeDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isOpen = Boolean(node);
  const view = useSharedFileUrl(token, node?.id ?? null, isOpen);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-4xl"
      >
        <SheetHeader className="gap-1 border-b px-5 py-4">
          <SheetTitle className="truncate pr-8">{node?.name}</SheetTitle>
          <SheetDescription>
            {node?.file ? formatBytes(node.file.sizeBytes) : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-2.5">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() =>
              node &&
              void downloadSharedFile(token, node.id).catch((error: unknown) =>
                toast.error(errorMessage(error)),
              )
            }
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
        </div>

        <div className="flex min-h-[26rem] min-w-0 flex-1 flex-col p-4">
          <PdfViewer
            url={view.data?.url}
            fileName={node?.name ?? 'document'}
            isLoading={view.isPending}
            error={view.isError ? errorMessage(view.error) : undefined}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
