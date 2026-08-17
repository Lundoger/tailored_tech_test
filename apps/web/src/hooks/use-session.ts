'use client';

import type { AuthUserDto } from '@data-room/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export function useSession(): UseQueryResult<AuthUserDto | null> {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: async () => {
      try {
        return await api.get<AuthUserDto>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
