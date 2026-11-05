import { Alert, errorMessage, Spinner } from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, meKey, queryClient, useMe } from '../../lib/api';
import { AuthLayout } from './AuthLayout';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const me = useMe();
  const verify = useMutation({
    mutationFn: () => api.post('/auth/verify-email', { token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meKey }),
  });

  // Run once on load (StrictMode mounts effects twice in development).
  const started = useRef(false);
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      verify.mutate();
    }
  }, [token, verify]);

  const next = me.data ? '/' : '/login';

  return (
    <AuthLayout title="Email verification">
      {!token && (
        <Alert tone="bad">This link is incomplete. Open the link from your email again.</Alert>
      )}
      {verify.isPending && <Spinner label="Verifying" />}
      {verify.isSuccess && (
        <div className="grid gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-ok-bg text-ok">
            <BadgeCheck className="size-6" aria-hidden />
          </div>
          <p className="text-ink-2">Your email is verified. You're all set! 🎉</p>
          <Link to={next} className="font-semibold text-brand hover:underline">
            Continue →
          </Link>
        </div>
      )}
      {verify.isError && (
        <div className="grid gap-4">
          <Alert tone="bad">{errorMessage(verify.error)}</Alert>
          <p className="text-sm text-muted">
            {me.data
              ? 'You can send a fresh link from your home page.'
              : 'Sign in to send a fresh link.'}
          </p>
          <Link to={next} className="font-semibold text-brand hover:underline">
            {me.data ? 'Go to home →' : 'Sign in →'}
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
