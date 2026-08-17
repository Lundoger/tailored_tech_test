import { Compass } from 'lucide-react';
import Link from 'next/link';

import { LogoWordmark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-4 py-4 sm:px-6">
        <Link href="/" className="inline-block">
          <LogoWordmark />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="bg-muted/40 mb-5 flex size-12 items-center justify-center rounded-xl border">
          <Compass className="text-muted-foreground size-5" aria-hidden />
        </span>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm text-balance">
          The address does not lead anywhere. If you followed a share link, it may have been cut
          short in transit — links are long, and mail clients sometimes wrap them.
        </p>
        <Button asChild className="mt-6">
          <Link href="/rooms">Go to your data rooms</Link>
        </Button>
      </main>
    </div>
  );
}
