import type { Metadata } from 'next';
import { Suspense } from 'react';

import { RegisterForm } from '@/components/auth/register-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <div>
      <header className="mb-8">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Create your account</h2>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Set up a data room in under a minute. Nothing you upload is visible to anyone until you
          share it.
        </p>
      </header>

      <Suspense fallback={<FormSkeleton />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-5" aria-hidden>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
