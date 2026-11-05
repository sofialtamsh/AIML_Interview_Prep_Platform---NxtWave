import type { StudentMe, StudentSessionResponse } from '@app/contracts';
import { ApiError, createApi } from '@app/ui';
import { MutationCache, QueryCache, QueryClient, useQuery } from '@tanstack/react-query';

export const api = createApi('/api/v1');

/** Any 401 means the session ended (expired, revoked, signed out elsewhere): drop the cached user. */
function onAuthError(err: unknown) {
  if (err instanceof ApiError && err.status === 401) queryClient.setQueryData(meKey, null);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onAuthError }),
  mutationCache: new MutationCache({ onError: onAuthError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Never retry auth/validation failures; retry transient ones once.
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
    },
  },
});

export const meKey = ['me'] as const;

/** The signed-in student, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async (): Promise<StudentMe | null> =>
      (await api.get<StudentSessionResponse>('/auth/session')).user,
    staleTime: 60_000,
  });
}

export function setMe(user: StudentMe | null) {
  queryClient.setQueryData(meKey, user);
}
