'use client';

import { type LoginInput, loginInputSchema } from '@data-room/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { describedById, Field } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Input } from '@/components/ui/input';
import { useLogin } from '@/hooks/use-auth-mutations';
import { errorMessage, NetworkError } from '@/lib/api-error';
import { applyServerFieldErrors } from '@/lib/forms';

type LoginValues = z.input<typeof loginInputSchema>;

const FIELDS = ['email', 'password'] as const;

export function LoginForm() {
  const nextPath = useSearchParams().get('next');
  const login = useLogin(nextPath);

  const form = useForm<LoginValues, unknown, LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: LoginInput) => {
    login.mutate(values, {
      onError: (error) => {
        if (applyServerFieldErrors(error, form.setError, FIELDS)) return;

        if (error instanceof NetworkError) {
          toast.error(errorMessage(error));
          return;
        }

        form.setError('password', { type: 'server', message: errorMessage(error) });
      },
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
      <Field htmlFor="email" label="Email" error={form.formState.errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby={describedById('email')}
          {...form.register('email')}
        />
      </Field>

      <Field htmlFor="password" label="Password" error={form.formState.errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={Boolean(form.formState.errors.password)}
          aria-describedby={describedById('password')}
          {...form.register('password')}
        />
      </Field>

      <SubmitButton pending={login.isPending} pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>

      <p className="text-muted-foreground text-center text-sm">
        No account yet?{' '}
        <Link
          href="/register"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
