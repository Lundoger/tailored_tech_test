import { LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
  pending?: boolean;
  pendingLabel?: string;
}

export function SubmitButton({
  pending = false,
  pendingLabel,
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled ?? pending}
      aria-busy={pending}
      className={cn('gap-2', className)}
      {...props}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
