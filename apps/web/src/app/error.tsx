'use client';

import { TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Unhandled error while rendering:', error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <span className="bg-muted/40 mb-5 flex size-12 items-center justify-center rounded-xl border">
        <TriangleAlert className="text-muted-foreground size-5" aria-hidden />
      </span>
      <h1 className="font-heading text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm text-balance">
        The page could not be displayed. Nothing you uploaded has been affected.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground mt-2 font-mono text-xs">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => router.push('/rooms')}>
          Back to data rooms
        </Button>
      </div>
    </div>
  );
}
