'use client';

import type { AuthUserDto, LoginInput, RegisterInput } from '@data-room/shared';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

function safeRedirect(target: string | null | undefined): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) {
    return '/rooms';
  }
  return target;
}

export function useLogin(
  redirectTo?: string | null,
): UseMutationResult<AuthUserDto, Error, LoginInput> {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) => api.post<AuthUserDto>('/auth/login', input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.session, user);
      router.replace(safeRedirect(redirectTo));
    },
  });
}

export function useRegister(
  redirectTo?: string | null,
): UseMutationResult<AuthUserDto, Error, RegisterInput> {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<AuthUserDto>('/auth/register', input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.session, user);
      router.replace(safeRedirect(redirectTo));
    },
  });
}

export function useLogout(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });
}
