import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Data Room"
      className={cn('size-8', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M9 11.5A1.5 1.5 0 0 1 10.5 10h4l1.6 2h5.4A1.5 1.5 0 0 1 23 13.5v7A1.5 1.5 0 0 1 21.5 22h-11A1.5 1.5 0 0 1 9 20.5v-9Z"
        className="fill-background"
      />
      <path
        d="M12 17.25h8M12 19.5h5"
        className="stroke-foreground/45"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="text-foreground size-7" />
      <span className="font-heading text-[0.9375rem] font-semibold tracking-tight">Data Room</span>
    </span>
  );
}
