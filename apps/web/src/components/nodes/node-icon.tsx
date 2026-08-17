import type { NodeDto } from '@data-room/shared';
import { FileText, Folder } from 'lucide-react';

import { cn } from '@/lib/utils';

export function NodeIcon({ node, className }: { node: NodeDto; className?: string }) {
  if (node.type === 'FOLDER') {
    return (
      <Folder
        className={cn('fill-foreground/10 text-foreground/70 size-4 shrink-0', className)}
        aria-hidden
      />
    );
  }

  return (
    <FileText className={cn('text-muted-foreground size-4 shrink-0', className)} aria-hidden />
  );
}
