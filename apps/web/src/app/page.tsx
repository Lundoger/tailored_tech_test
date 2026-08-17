'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { FullPageSpinner } from '@/components/layout/full-page-spinner';
import { useSession } from '@/hooks/use-session';

export default function RootPage() {
  const router = useRouter();
  const { data: user, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    router.replace(user ? '/rooms' : '/login');
  }, [isPending, router, user]);

  return <FullPageSpinner label="Loading your data rooms" />;
}
