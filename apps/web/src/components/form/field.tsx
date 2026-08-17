import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldProps {
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ htmlFor, label, hint, error, className, children }: FieldProps) {
  const messageId = `${htmlFor}-message`;

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={htmlFor} className={cn(error && 'text-destructive')}>
        {label}
      </Label>
      {children}
      {(error ?? hint) ? (
        <p
          id={messageId}
          className={cn(
            'text-xs leading-snug',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedById(htmlFor: string): string {
  return `${htmlFor}-message`;
}
