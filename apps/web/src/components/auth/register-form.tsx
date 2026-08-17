'use client';

import { type RegisterInput, registerInputSchema } from '@data-room/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { describedById, Field } from '@/components/form/field';
import { SubmitButton } from '@/components/form/submit-button';
import { Input } from '@/components/ui/input';
import { useRegister } from '@/hooks/use-auth-mutations';
import { errorMessage } from '@/lib/api-error';
import { applyServerFieldErrors } from '@/lib/forms';

type RegisterValues = z.input<typeof registerInputSchema>;

const FIELDS = ['name', 'email', 'password'] as const;

export function RegisterForm() {
  const nextPath = useSearchParams().get('next');
  const register = useRegister(nextPath);

  const form = useForm<RegisterValues, unknown, RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = (values: RegisterInput) => {
    register.mutate(values, {
      onError: (error) => {
        if (!applyServerFieldErrors(error, form.setError, FIELDS)) {
          toast.error(errorMessage(error));
        }
      },
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
      <Field htmlFor="name" label="Full name" error={form.formState.errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Dana Whitfield"
          aria-invalid={Boolean(form.formState.errors.name)}
          aria-describedby={describedById('name')}
          {...form.register('name')}
        />
      </Field>

      <Field htmlFor="email" label="Work email" error={form.formState.errors.email?.message}>
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

      <Field
        htmlFor="password"
        label="Password"
        hint="At least 8 characters. A short phrase beats a short password."
        error={form.formState.errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={Boolean(form.formState.errors.password)}
          aria-describedby={describedById('password')}
          {...form.register('password')}
        />
      </Field>

      <SubmitButton
        pending={register.isPending}
        pendingLabel="Creating account…"
        className="w-full"
      >
        Create account
      </SubmitButton>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
