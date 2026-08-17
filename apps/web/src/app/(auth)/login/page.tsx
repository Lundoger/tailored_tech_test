import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoginForm } from '@/components/auth/login-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div>
      <header className="mb-8">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Sign in to reach your data rooms and anything shared with you.
        </p>
      </header>

      <Suspense fallback={<FormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-5" aria-hidden>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
