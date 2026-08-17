'use client';

import { ExternalLink, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

// Sizes itself as a flex child, so the parent must be `flex flex-col`. A
// percentage height collapses the iframe to its intrinsic 300x150 as soon as an
// ancestor's height comes from its content.
export function PdfViewer({
  url,
  fileName,
  isLoading,
  error,
}: {
  url: string | undefined;
  fileName: string;
  isLoading: boolean;
  error?: string;
}) {
  const [failedToRender, setFailedToRender] = useState(false);

  if (isLoading) {
    return (
      <Placeholder>
        <LoaderCircle className="text-muted-foreground size-5 animate-spin" aria-hidden />
        <p className="text-muted-foreground text-sm">Preparing the document…</p>
      </Placeholder>
    );
  }

  if (error || !url) {
    return (
      <Placeholder>
        <TriangleAlert className="text-muted-foreground size-5" aria-hidden />
        <p className="text-muted-foreground text-sm">{error ?? 'This document is unavailable.'}</p>
      </Placeholder>
    );
  }

  if (failedToRender) {
    return (
      <Placeholder>
        <p className="text-muted-foreground text-sm">
          Your browser did not display this PDF inline.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden />
            Open in a new tab
          </a>
        </Button>
      </Placeholder>
    );
  }

  return (
    <iframe
      key={url}
      src={url}
      title={`Preview of ${fileName}`}
      className="bg-muted/30 min-h-0 w-full flex-1 rounded-lg border"
      onError={() => setFailedToRender(true)}
    />
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center">
      {children}
    </div>
  );
}
