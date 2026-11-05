import { type ReactNode, useState } from 'react';
import { cn } from './cn';

/** Google's multi-colour "G" mark, as required by Google's sign-in branding guidelines. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** Full-page navigation to the server-side OAuth start endpoint (never a fetch). */
export function GoogleButton({
  href,
  label = 'Continue with Google',
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-line-2 bg-surface px-5 py-3 text-[15px] font-semibold text-ink transition hover:border-ink-2 hover:bg-surface-2"
    >
      <GoogleMark />
      {label}
    </a>
  );
}

export function OrDivider({ children = 'or' }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs font-medium text-muted">
      <span className="h-px flex-1 bg-line" aria-hidden />
      {children}
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  );
}

const OAUTH_ERRORS: Record<string, string> = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_expired: 'That sign-in attempt expired. Please try again.',
  google_failed: 'We could not sign you in with Google. Please try again.',
  google_unverified: 'Your Google email address is not verified yet.',
  not_student: 'That email belongs to a staff account. Please use the admin console.',
  not_admin: 'No admin account uses this Google email. Ask a super admin to invite you.',
  domain_not_allowed: 'Please use your NxtWave work Google account.',
  suspended: 'This account is not active. Contact your program coordinator.',
  registration_closed: 'Sign-up is limited to enrolled students. Use the email you enrolled with.',
};

/** Turns a `?error=` code from the OAuth callback into a friendly sentence. */
export function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return OAUTH_ERRORS[code] ?? 'Sign-in did not complete. Please try again.';
}

/**
 * Local-development helper: shows demo credentials with a one-click fill.
 * Callers pass `null` outside development, so production builds contain nothing.
 */
export function DemoCredentials({
  creds,
  onFill,
}: {
  creds: { label: string; email: string; password: string } | null;
  onFill: (email: string, password: string) => void;
}) {
  const [filled, setFilled] = useState(false);
  if (!creds) return null;
  return (
    <div className="rounded-[10px] border border-dashed border-line-2 bg-surface-2 px-3.5 py-3 text-[13px] text-ink-2">
      <b className="text-ink">{creds.label}</b> · local development only
      <div className="mt-1 font-mono text-xs break-all">{creds.email}</div>
      <div className="font-mono text-xs break-all">{creds.password}</div>
      <button
        type="button"
        onClick={() => {
          onFill(creds.email, creds.password);
          setFilled(true);
        }}
        className={cn(
          'mt-2 rounded-lg border border-line-2 bg-surface px-2.5 py-1 text-xs font-semibold hover:border-ink-2',
          filled && 'border-ok text-ok',
        )}
      >
        {filled ? 'Filled ✓' : 'Fill demo details'}
      </button>
    </div>
  );
}
