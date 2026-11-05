import type { AuthProviders } from '@app/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/** Which sign-in options the server has configured (e.g. Google). */
export const useProviders = () =>
  useQuery({
    queryKey: ['auth-providers'],
    queryFn: () => api.get<AuthProviders>('/auth/providers'),
    staleTime: Number.POSITIVE_INFINITY,
  });

export const googleStartUrl = (next: string | null) =>
  `/api/v1/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ''}`;

/**
 * Demo login for local development only. `import.meta.env.DEV` is replaced with `false` in
 * production builds, so this branch (and the values) are removed from the bundle entirely.
 */
export function demoStudent() {
  if (!import.meta.env.DEV) return null;
  const email = import.meta.env.VITE_DEMO_STUDENT_EMAIL;
  const password = import.meta.env.VITE_DEMO_STUDENT_PASSWORD;
  return email && password ? { label: 'Demo student', email, password } : null;
}
