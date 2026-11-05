import { ForgotPasswordBody } from '@app/contracts';
import {
  Alert,
  Button,
  type FieldErrors,
  formValues,
  fromApiError,
  TextField,
  validate,
} from '@app/ui';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../lib/api';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validate(ForgotPasswordBody, formValues(e.currentTarget));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', v.data);
      setSentTo(v.data.email);
    } catch (err) {
      setMessage(fromApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your inbox">
        <div className="grid gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-ok-bg text-ok">
            <MailCheck className="size-6" aria-hidden />
          </div>
          <p className="text-ink-2">
            If <b>{sentTo}</b> has an account, we just sent a reset link. It works for 1 hour. Check
            spam too.
          </p>
          <Link to="/login" className="font-semibold text-brand hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="No stress. We'll email you a reset link.">
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {message && <Alert tone="bad">{message}</Alert>}
        <TextField
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          error={errors.email}
        />
        <Button type="submit" size="lg" loading={busy} block>
          Send reset link
        </Button>
        <Link to="/login" className="text-center text-sm font-medium text-brand hover:underline">
          ← Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
