import { FullPageSpinner } from '@app/ui';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useMe } from './api';

/** Only allows same-app relative paths as post-login destinations (no open redirects). */
export function safeNext(next: string | null): string {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <FullPageSpinner />;
  if (!me.data) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

/** The app is built around the student's goal, so new students set it up first. */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const me = useMe();
  if (me.data && !me.data.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** Pages like login/signup bounce signed-in students to their dashboard. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const me = useMe();
  if (me.isPending) return <FullPageSpinner />;
  if (me.data) return <Navigate to="/" replace />;
  return <>{children}</>;
}
