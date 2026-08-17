'use client';

import { type NodeDto, splitFileName, validateNodeName } from '@data-room/shared';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { useRenameNode } from '@/hooks/use-nodes';
import { ApiError, errorMessage } from '@/lib/api-error';

interface RenameDialogProps {
  dataRoomId: string;
  node: NodeDto | null;
  onOpenChange: (open: boolean) => void;
}

export function RenameDialog({ dataRoomId, node, onOpenChange }: RenameDialogProps) {
  return (
    <Dialog open={Boolean(node)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {node ? (
          <RenameForm
            // Keyed so the form's state is initialised from props on mount instead of
            // being synchronised by an effect afterwards.
            key={node.id}
            dataRoomId={dataRoomId}
            node={node}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  dataRoomId,
  node,
  onDone,
}: {
  dataRoomId: string;
  node: NodeDto;
  onDone: () => void;
}) {
  const rename = useRenameNode(dataRoomId);
  const [name, setName] = useState(node.name);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const problem = validateNodeName(name);
    if (problem) {
      setError(problem);
      return;
    }

    rename.mutate(
      { nodeId: node.id, input: { name: name.trim(), autoResolveConflict: false } },
      {
        onSuccess: (updated) => {
          onDone();
          toast.success(`Renamed to "${updated.name}".`);
        },
        onError: (mutationError) => {
          if (mutationError instanceof ApiError && mutationError.is('NAME_CONFLICT')) {
            setError(mutationError.message);
            setSuggestion(mutationError.suggestedName);
            return;
          }
          setError(errorMessage(mutationError));
        },
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rename {node.type === 'FOLDER' ? 'folder' : 'file'}</DialogTitle>
        <DialogDescription>
          {node.type === 'FILE'
            ? 'The extension is part of the name — the stored file itself is untouched.'
            : 'Everything inside keeps its place.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="grid gap-5" noValidate>
        <Field htmlFor="rename-input" label="Name" error={error ?? undefined}>
          <Input
            id="rename-input"
            value={name}
            autoFocus
            autoComplete="off"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
              setSuggestion(null);
            }}
            onFocus={(event) => {
              const { stem } = splitFileName(event.target.value);
              event.target.setSelectionRange(0, stem.length);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={describedById('rename-input')}
          />
        </Field>

        {suggestion ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => {
              setName(suggestion);
              setError(null);
              setSuggestion(null);
            }}
          >
            Use “{suggestion}” instead
          </Button>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <SubmitButton
            pending={rename.isPending}
            pendingLabel="Renaming…"
            disabled={!name.trim() || name === node.name}
          >
            Rename
          </SubmitButton>
        </DialogFooter>
      </form>
    </>
  );
}
