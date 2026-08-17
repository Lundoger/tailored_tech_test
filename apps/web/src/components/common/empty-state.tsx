import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  variant?: 'inline' | 'page';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'inline',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'page' ? 'min-h-[60vh] px-6 py-16' : 'px-6 py-14',
        className,
      )}
    >
      <span className="bg-muted/40 mb-4 flex size-11 items-center justify-center rounded-xl border">
        <Icon className="text-muted-foreground size-5" aria-hidden />
      </span>
      <h3 className="font-heading text-base font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm text-balance">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
