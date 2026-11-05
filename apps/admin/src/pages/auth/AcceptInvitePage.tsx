import { type AdminMeResponse, FullName, Password } from '@app/contracts';
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
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { api, setAdminMe } from '../../lib/api';
import { AdminAuthLayout } from './AdminAuthLayout';

const Form = z.object({ fullName: FullName, password: Password });

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validate(Form, formValues(e.currentTarget));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      const { user } = await api.post<AdminMeResponse>('/auth/accept-invite', { token, ...v.data });
      setAdminMe(user);
      navigate('/', { replace: true });
    } catch (err) {
      const { fields, message } = fromApiError(err);
      setErrors(fields);
      setMessage(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminAuthLayout
      title="Activate your admin account"
      subtitle="Set your name and a strong password."
    >
      {!token ? (
        <Alert tone="bad">This invite link is incomplete. Open it from your email again.</Alert>
      ) : (
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          {message && <Alert tone="bad">{message}</Alert>}
          <TextField
            name="fullName"
            label="Full name"
            autoComplete="name"
            error={errors.fullName}
          />
          <TextField
            name="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            error={errors.password}
            onChange={(e) => setPw(e.target.value)}
            hint={<PasswordMeter password={pw} />}
          />
          <Button type="submit" size="lg" loading={busy} block>
            Activate account
          </Button>
        </form>
      )}
    </AdminAuthLayout>
  );
}
