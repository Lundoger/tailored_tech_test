'use client';

import { emailSchema, formatRelativeTime, type ShareDto } from '@data-room/shared';
import { Check, Copy, Globe, LoaderCircle, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ShareActivityList } from '@/components/shares/share-activity-list';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  absoluteShareUrl,
  useAddRecipients,
  useCreateShare,
  useRevokeRecipient,
  useRevokeShare,
  useSharesForTarget,
} from '@/hooks/use-shares';
import { errorMessage } from '@/lib/api-error';

export interface ShareTarget {
  nodeId: string | null;
  name: string;
  kind: 'data room' | 'folder' | 'file';
}

interface ShareDialogProps {
  dataRoomId: string;
  target: ShareTarget | null;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ dataRoomId, target, onOpenChange }: ShareDialogProps) {
  const isOpen = Boolean(target);
  const shares = useSharesForTarget(dataRoomId, target?.nodeId ?? null, isOpen);

  const publicShare = shares.data?.find((share) => share.mode === 'PUBLIC_LINK') ?? null;
  const restrictedShare = shares.data?.find((share) => share.mode === 'RESTRICTED') ?? null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">Share “{target?.name}”</DialogTitle>
          <DialogDescription>
            {target?.kind === 'file'
              ? 'Recipients get read-only access to this document.'
              : `Recipients get read-only access to this ${target?.kind ?? 'item'} and everything inside it.`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link">
          <TabsList className="w-full">
            <TabsTrigger value="link" className="flex-1 gap-1.5">
              <Globe className="size-3.5" aria-hidden />
              Public link
            </TabsTrigger>
            <TabsTrigger value="people" className="flex-1 gap-1.5">
              <Users className="size-3.5" aria-hidden />
              Invited people
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-4">
            {shares.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <PublicLinkPanel dataRoomId={dataRoomId} target={target} share={publicShare} />
            )}
          </TabsContent>

          <TabsContent value="people" className="mt-4">
            {shares.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <InvitedPeoplePanel dataRoomId={dataRoomId} target={target} share={restrictedShare} />
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ShareActivityList
              isOpen={isOpen}
              publicShareId={publicShare?.id ?? null}
              restrictedShareId={restrictedShare?.id ?? null}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PublicLinkPanel({
  dataRoomId,
  target,
  share,
}: {
  dataRoomId: string;
  target: ShareTarget | null;
  share: ShareDto | null;
}) {
  const createShare = useCreateShare(dataRoomId);
  const revokeShare = useRevokeShare(dataRoomId);
  const [copied, setCopied] = useState(false);

  if (!share) {
    return (
      <div className="rounded-lg border border-dashed p-5 text-center">
        <p className="text-muted-foreground text-sm">
          No public link yet. Anyone who has the link would be able to view this — no sign-in
          needed.
        </p>
        <Button
          className="mt-4 gap-2"
          disabled={createShare.isPending || !target}
          onClick={() =>
            createShare.mutate(
              {
                targetType: target?.nodeId ? 'NODE' : 'DATA_ROOM',
                nodeId: target?.nodeId ?? null,
                mode: 'PUBLIC_LINK',
                role: 'VIEWER',
                recipients: [],
              },
              {
                onSuccess: () => toast.success('Public link created.'),
                onError: (error) => toast.error(errorMessage(error)),
              },
            )
          }
        >
          {createShare.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Globe className="size-4" aria-hidden />
          )}
          Create public link
        </Button>
      </div>
    );
  }

  const url = absoluteShareUrl(share.url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Input readOnly value={url} aria-label="Public share link" className="font-mono text-xs" />
        <Button variant="outline" onClick={() => void copy()} className="shrink-0 gap-2">
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        Anyone with this link can view. Opened {share.accessCount}{' '}
        {share.accessCount === 1 ? 'time' : 'times'} · created {formatRelativeTime(share.createdAt)}
        .
      </p>

      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive gap-2 justify-self-start"
        disabled={revokeShare.isPending}
        onClick={() =>
          revokeShare.mutate(share.id, {
            onSuccess: () => toast.success('Link turned off. It stops working immediately.'),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      >
        <Trash2 className="size-3.5" aria-hidden />
        {revokeShare.isPending ? 'Turning off…' : 'Turn off link'}
      </Button>
    </div>
  );
}

function InvitedPeoplePanel({
  dataRoomId,
  target,
  share,
}: {
  dataRoomId: string;
  target: ShareTarget | null;
  share: ShareDto | null;
}) {
  const createShare = useCreateShare(dataRoomId);
  const addRecipients = useAddRecipients(dataRoomId);
  const revokeRecipient = useRevokeRecipient(dataRoomId);
  const revokeShare = useRevokeShare(dataRoomId);

  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const { emails, invalid } = parseEmails(raw);

    if (invalid.length > 0) {
      setError(`Not a valid email address: ${invalid.join(', ')}`);
      return;
    }
    if (emails.length === 0) {
      setError('Enter at least one email address.');
      return;
    }
    setError(null);

    if (share) {
      addRecipients.mutate(
        { shareId: share.id, input: { recipients: emails } },
        {
          onSuccess: () => {
            setRaw('');
            toast.success(`Invited ${emails.length} ${emails.length === 1 ? 'person' : 'people'}.`);
          },
          onError: (mutationError) => setError(errorMessage(mutationError)),
        },
      );
      return;
    }

    createShare.mutate(
      {
        targetType: target?.nodeId ? 'NODE' : 'DATA_ROOM',
        nodeId: target?.nodeId ?? null,
        mode: 'RESTRICTED',
        role: 'VIEWER',
        recipients: emails,
      },
      {
        onSuccess: () => {
          setRaw('');
          toast.success('Invitations sent.');
        },
        onError: (mutationError) => setError(errorMessage(mutationError)),
      },
    );
  };

  const activeRecipients = share?.recipients.filter((recipient) => !recipient.revokedAt) ?? [];
  const isBusy = createShare.isPending || addRecipients.isPending;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex gap-2">
          <Input
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="name@company.com, another@company.com"
            aria-label="Email addresses to invite"
            aria-invalid={Boolean(error)}
          />
          <Button onClick={submit} disabled={isBusy} className="shrink-0">
            {isBusy ? 'Inviting…' : 'Invite'}
          </Button>
        </div>
        <p className={error ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}>
          {error ??
            'They will need to sign in with this address. An account is not required up front — access is waiting when they register.'}
        </p>
      </div>

      {activeRecipients.length > 0 ? (
        <ul className="grid gap-1.5">
          {activeRecipients.map((recipient) => (
            <li
              key={recipient.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{recipient.email}</p>
                <p className="text-muted-foreground text-xs">
                  {recipient.userId ? 'Has an account' : 'Not registered yet'} · invited{' '}
                  {formatRelativeTime(recipient.invitedAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                aria-label={`Remove ${recipient.email}`}
                disabled={revokeRecipient.isPending}
                onClick={() =>
                  share &&
                  revokeRecipient.mutate(
                    { shareId: share.id, recipientId: recipient.id },
                    {
                      onSuccess: () => toast.success(`${recipient.email} no longer has access.`),
                      onError: (mutationError) => toast.error(errorMessage(mutationError)),
                    },
                  )
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : share ? (
        <p className="text-muted-foreground text-sm">
          Everyone has been removed. The link is inactive until someone is invited again.
        </p>
      ) : null}

      {share ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive gap-2 justify-self-start"
          disabled={revokeShare.isPending}
          onClick={() =>
            revokeShare.mutate(share.id, {
              onSuccess: () => toast.success('Access revoked for everyone invited.'),
              onError: (error_) => toast.error(errorMessage(error_)),
            })
          }
        >
          <Trash2 className="size-3.5" aria-hidden />
          Revoke for everyone
        </Button>
      ) : null}
    </div>
  );
}

function parseEmails(raw: string): { emails: string[]; invalid: string[] } {
  const candidates = raw
    .split(/[,;\s]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const emails: string[] = [];
  const invalid: string[] = [];

  for (const candidate of candidates) {
    const result = emailSchema.safeParse(candidate);
    if (result.success) emails.push(result.data);
    else invalid.push(candidate);
  }

  return { emails: [...new Set(emails)], invalid };
}
