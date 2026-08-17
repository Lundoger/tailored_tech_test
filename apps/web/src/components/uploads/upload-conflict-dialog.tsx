'use client';

import type { ConflictStrategy } from '@data-room/shared';
import { Copy, History, SkipForward } from 'lucide-react';
import { useState } from 'react';

import type { UploadItem } from '@/hooks/use-upload-queue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type Choice = ConflictStrategy | 'SKIP';

interface UploadConflictDialogProps {
  conflicts: UploadItem[];
  onResolve: (id: string, choice: Choice) => void;
}

const OPTIONS: Array<{
  choice: Exclude<Choice, 'FAIL'>;
  icon: typeof Copy;
  title: string;
  description: (item: UploadItem) => string;
}> = [
  {
    choice: 'VERSION',
    icon: History,
    title: 'Upload as a new version',
    description: () => 'Keeps one file in the folder. The current contents stay in its history.',
  },
  {
    choice: 'RENAME',
    icon: Copy,
    title: 'Keep both',
    description: (item) => `Uploads it as “${item.suggestedName ?? `${item.fileName} (2)`}”.`,
  },
  {
    choice: 'SKIP',
    icon: SkipForward,
    title: 'Skip this file',
    description: () => 'Leaves the existing file exactly as it is.',
  },
];

export function UploadConflictDialog({ conflicts, onResolve }: UploadConflictDialogProps) {
  const [applyToAll, setApplyToAll] = useState(false);
  const current = conflicts[0];

  if (!current) return null;

  const resolve = (choice: Choice) => {
    const targets = applyToAll ? conflicts : [current];
    for (const item of targets) {
      onResolve(item.id, choice);
    }
  };

  return (
    <Dialog open onOpenChange={() => resolve('SKIP')}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>“{current.fileName}” is already here</DialogTitle>
          <DialogDescription>
            A file with that name already exists in this folder.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {OPTIONS.map(({ choice, icon: Icon, title, description }) => (
            <button
              key={choice}
              type="button"
              onClick={() => resolve(choice)}
              className="hover:border-foreground/25 hover:bg-accent/50 focus-visible:ring-ring flex items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-muted/40 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{title}</span>
                <span className="text-muted-foreground block text-xs">{description(current)}</span>
              </span>
            </button>
          ))}
        </div>

        {conflicts.length > 1 ? (
          <div className="flex items-center gap-2 border-t pt-3">
            <Checkbox
              id="apply-to-all"
              checked={applyToAll}
              onCheckedChange={(checked) => setApplyToAll(checked === true)}
            />
            <Label htmlFor="apply-to-all" className="text-sm font-normal">
              Do the same for the other {conflicts.length - 1} clashing file
              {conflicts.length - 1 === 1 ? '' : 's'}
            </Label>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => resolve('SKIP')}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
