import { FullPageSpinner } from '@app/ui';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAdminMe } from './api';

export function safeNext(next: string | null): string {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const me = useAdminMe();
  const location = useLocation();
  if (me.isPending) return <FullPageSpinner />;
  if (!me.data) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const me = useAdminMe();
  if (me.data?.role !== 'SUPER_ADMIN') {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-ink-2">
        This section is for super admins. Ask a super admin if you need access.
      </div>
    );
  }
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const me = useAdminMe();
  if (me.isPending) return <FullPageSpinner />;
  if (me.data) return <Navigate to="/" replace />;
  return <>{children}</>;
}
