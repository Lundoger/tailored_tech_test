'use client';

import { type CreateDataRoomInput, createDataRoomInputSchema } from '@data-room/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDataRoom } from '@/hooks/use-data-rooms';
import { errorMessage } from '@/lib/api-error';
import { applyServerFieldErrors } from '@/lib/forms';

type FormValues = z.input<typeof createDataRoomInputSchema>;

const FIELDS = ['name', 'description'] as const;

export function CreateDataRoomDialog({ variant = 'default' }: { variant?: 'default' | 'outline' }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const create = useCreateDataRoom();

  const form = useForm<FormValues, unknown, CreateDataRoomInput>({
    resolver: zodResolver(createDataRoomInputSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit = (values: CreateDataRoomInput) => {
    create.mutate(values, {
      onSuccess: (room) => {
        setOpen(false);
        form.reset();
        toast.success(`"${room.name}" is ready.`);
        router.push(`/rooms/${room.id}`);
      },
      onError: (error) => {
        if (!applyServerFieldErrors(error, form.setError, FIELDS)) {
          toast.error(errorMessage(error));
        }
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} className="gap-2">
          <Plus className="size-4" aria-hidden />
          New data room
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New data room</DialogTitle>
          <DialogDescription>
            A private space for one deal. Nothing inside is visible to anyone else until you share
            it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <Field htmlFor="room-name" label="Name" error={form.formState.errors.name?.message}>
            <Input
              id="room-name"
              autoFocus
              placeholder="Project Atlas"
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby={describedById('room-name')}
              {...form.register('name')}
            />
          </Field>

          <Field
            htmlFor="room-description"
            label="Description"
            hint="Optional. Useful when several deals are running at once."
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="room-description"
              rows={3}
              placeholder="Acquisition of Northwind Systems Ltd — due diligence materials"
              aria-describedby={describedById('room-description')}
              {...form.register('description')}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pending={create.isPending} pendingLabel="Creating…">
              Create data room
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
