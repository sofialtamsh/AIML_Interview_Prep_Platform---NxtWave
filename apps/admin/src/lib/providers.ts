import type { AuthProviders } from '@app/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export const useProviders = () =>
  useQuery({
    queryKey: ['admin-auth-providers'],
    queryFn: () => api.get<AuthProviders>('/auth/providers'),
    staleTime: Number.POSITIVE_INFINITY,
  });

export const googleStartUrl = (next: string | null) =>
  `/api/v1/admin/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ''}`;

/**
 * Demo admin login for local development only. `import.meta.env.DEV` is `false` in
 * production builds, so this branch and its values are removed from the bundle.
 */
export function demoAdmin() {
  if (!import.meta.env.DEV) return null;
  const email = import.meta.env.VITE_DEMO_ADMIN_EMAIL;
  const password = import.meta.env.VITE_DEMO_ADMIN_PASSWORD;
  return email && password ? { label: 'Demo super admin', email, password } : null;
}
