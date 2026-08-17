import { LoaderCircle } from 'lucide-react';

export function FullPageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3" role="status">
      <LoaderCircle className="text-muted-foreground size-5 animate-spin" aria-hidden />
      <p className="text-muted-foreground text-sm">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  );
}
