'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { FullPageSpinner } from '@/components/layout/full-page-spinner';
import { useSession } from '@/hooks/use-session';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isPending, isError } = useSession();

  useEffect(() => {
    if (!isPending && !user) {
      router.replace('/login');
    }
  }, [isPending, router, user]);

  if (isPending) {
    return <FullPageSpinner label="Loading your workspace" />;
  }

  if (!user) {
    return (
      <FullPageSpinner label={isError ? 'Could not reach the server' : 'Taking you to sign in'} />
    );
  }

  return <AppShell user={user}>{children}</AppShell>;
}
