'use client';

import { Clock, Lock, LogOut, ShieldCheck, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/use-auth-mutations';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/lib/api-error';

export function ShareErrorScreen({ error }: { error: unknown }) {
  const pathname = usePathname();
  const { data: user } = useSession();
  const logout = useLogout();

  const code = error instanceof ApiError ? error.code : null;
  const invitedEmails =
    error instanceof ApiError && Array.isArray(error.details.invitedEmails)
      ? (error.details.invitedEmails as string[])
      : [];

  if (code === 'SHARE_SIGN_IN_REQUIRED') {
    return (
      <Shell
        icon={Lock}
        title="This link is for specific people"
        description={
          invitedEmails.length > 0
            ? `Sign in as ${invitedEmails.join(' or ')} to view it.`
            : 'Sign in with the address it was sent to.'
        }
      >
        <Button asChild>
          <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
        </Button>
      </Shell>
    );
  }

  if (code === 'ACCESS_DENIED') {
    return (
      <Shell
        icon={ShieldCheck}
        title="This account was not invited"
        description={
          user
            ? `You are signed in as ${user.email}. Ask the owner to invite this address, or switch to the account the link was sent to.`
            : 'Ask the owner to invite your address.'
        }
      >
        {user ? (
          <Button variant="outline" className="gap-2" onClick={() => logout.mutate()}>
            <LogOut className="size-4" aria-hidden />
            Sign in as someone else
          </Button>
        ) : null}
      </Shell>
    );
  }

  if (code === 'SHARE_REVOKED') {
    return (
      <Shell
        icon={Lock}
        title="Access has been turned off"
        description="The owner revoked this link. Anything you had open will stop loading."
      />
    );
  }

  if (code === 'SHARE_EXPIRED') {
    return (
      <Shell
        icon={Clock}
        title="This link has expired"
        description="Ask whoever shared it for a fresh one."
      />
    );
  }

  if (code === 'SHARE_TARGET_DELETED') {
    return (
      <Shell
        icon={TriangleAlert}
        title="This item is no longer available"
        description="The folder or document behind this link was deleted by its owner."
      />
    );
  }

  return (
    <Shell
      icon={TriangleAlert}
      title="This link does not work"
      description="Check that you copied the whole address. Links are long, and mail clients sometimes cut them."
    />
  );
}

function Shell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <span className="bg-muted/40 mb-5 flex size-12 items-center justify-center rounded-xl border">
        <Icon className="text-muted-foreground size-5" aria-hidden />
      </span>
      <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm text-balance">{description}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
