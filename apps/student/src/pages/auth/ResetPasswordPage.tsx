import { Password } from '@app/contracts';
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
import { api, setMe } from '../../lib/api';
import { AuthLayout } from './AuthLayout';

const Form = z.object({ password: Password });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validate(Form, formValues(e.currentTarget));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password: v.data.password });
      setMe(null); // every session was signed out
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      const { fields, message } = fromApiError(err);
      setErrors(fields);
      setMessage(message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="This link is incomplete">
        <p className="text-ink-2">Open the link from your email again, or request a new one.</p>
        <Link
          to="/forgot-password"
          className="mt-4 inline-block font-semibold text-brand hover:underline"
        >
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="You'll be signed out on other devices.">
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {message && (
          <Alert
            tone="bad"
            action={
              <Link to="/forgot-password" className="font-semibold underline">
                New link
              </Link>
            }
          >
            {message}
          </Alert>
        )}
        <TextField
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
          hint={<PasswordMeter password={password} />}
        />
        <Button type="submit" size="lg" loading={busy} block>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
