import { ForgotPasswordBody, Password } from '@app/contracts';
import {
  Alert,
  Button,
  type FieldErrors,
  formValues,
  fromApiError,
  PasswordMeter,
  TextField,
  validate,
} from '@app/ui';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { api, setAdminMe } from '../../lib/api';
import { AdminAuthLayout } from './AdminAuthLayout';

export function ForgotPasswordPage() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validate(ForgotPasswordBody, formValues(e.currentTarget));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', v.data);
      setSent(true);
    } catch (err) {
      setMessage(fromApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminAuthLayout title="Reset your password">
      {sent ? (
        <div className="grid gap-4">
          <Alert tone="ok">
            If that email belongs to an admin, a reset link is on its way. It works for 1 hour.
          </Alert>
          <Link to="/login" className="text-sm font-semibold text-brand hover:underline">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          {message && <Alert tone="bad">{message}</Alert>}
          <TextField name="email" type="email" label="Work email" error={errors.email} />
          <Button type="submit" loading={busy} block>
            Send reset link
          </Button>
          <Link to="/login" className="text-center text-sm font-medium text-brand hover:underline">
            ← Back to sign in
          </Link>
        </form>
      )}
    </AdminAuthLayout>
  );
}

const ResetForm = z.object({ password: Password });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validate(ResetForm, formValues(e.currentTarget));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password: v.data.password });
      setAdminMe(null);
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      const { fields, message } = fromApiError(err);
      setErrors(fields);
      setMessage(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminAuthLayout title="Choose a new password">
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {!token && (
          <Alert tone="bad">This link is incomplete. Open it from your email again.</Alert>
        )}
        {message && <Alert tone="bad">{message}</Alert>}
        <TextField
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          error={errors.password}
          onChange={(e) => setPw(e.target.value)}
          hint={<PasswordMeter password={pw} />}
        />
        <Button type="submit" loading={busy} disabled={!token} block>
          Update password
        </Button>
      </form>
    </AdminAuthLayout>
  );
}
