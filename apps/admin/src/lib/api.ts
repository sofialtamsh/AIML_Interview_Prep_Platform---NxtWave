import type { AdminMe, AdminSessionResponse } from '@app/contracts';
import { ApiError, createApi } from '@app/ui';
import { MutationCache, QueryCache, QueryClient, useQuery } from '@tanstack/react-query';

/** Every admin call goes to the admin namespace (its own cookie and session audience). */
export const api = createApi('/api/v1/admin');

/** Any 401 means the session ended (expired, revoked, signed out elsewhere): drop the cached user. */
function onAuthError(err: unknown) {
  if (err instanceof ApiError && err.status === 401) queryClient.setQueryData(meKey, null);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onAuthError }),
  mutationCache: new MutationCache({ onError: onAuthError }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
    },
  },
});

export const meKey = ['admin-me'] as const;

export function useAdminMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async (): Promise<AdminMe | null> =>
      (await api.get<AdminSessionResponse>('/auth/session')).user,
  });
}

export function setAdminMe(user: AdminMe | null) {
  queryClient.setQueryData(meKey, user);
}
