'use client';

import { type CreateFolderInput, createFolderInputSchema } from '@data-room/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { describedById, Field } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCreateFolder } from '@/hooks/use-nodes';
import { ApiError, errorMessage } from '@/lib/api-error';

type FormValues = z.input<typeof createFolderInputSchema>;

interface NewFolderDialogProps {
  dataRoomId: string;
  parentId: string | null;
  parentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewFolderDialog({
  dataRoomId,
  parentId,
  parentName,
  open,
  onOpenChange,
}: NewFolderDialogProps) {
  const createFolder = useCreateFolder(dataRoomId);

  const form = useForm<FormValues, unknown, CreateFolderInput>({
    resolver: zodResolver(createFolderInputSchema),
    defaultValues: { name: '', parentId },
  });

  useEffect(() => {
    form.setValue('parentId', parentId);
  }, [form, parentId]);

  const onSubmit = (values: CreateFolderInput) => {
    createFolder.mutate(values, {
      onSuccess: (folder) => {
        onOpenChange(false);
        form.reset({ name: '', parentId });
        toast.success(`Folder "${folder.name}" created.`);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.is('NAME_CONFLICT')) {
          form.setError('name', { type: 'server', message: error.message });
          return;
        }
        toast.error(errorMessage(error));
      },
    });
  };

  const suggested =
    createFolder.error instanceof ApiError ? createFolder.error.suggestedName : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          form.reset({ name: '', parentId });
          createFolder.reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            Creating in <span className="text-foreground font-medium">{parentName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <Field
            htmlFor="folder-name"
            label="Folder name"
            error={form.formState.errors.name?.message}
          >
            <Input
              id="folder-name"
              autoFocus
              autoComplete="off"
              placeholder="03 Legal"
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby={describedById('folder-name')}
              {...form.register('name')}
            />
          </Field>

          {suggested && form.formState.errors.name ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => {
                form.setValue('name', suggested, { shouldValidate: true });
                form.clearErrors('name');
              }}
            >
              Use “{suggested}” instead
            </Button>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton pending={createFolder.isPending} pendingLabel="Creating…">
              Create folder
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
