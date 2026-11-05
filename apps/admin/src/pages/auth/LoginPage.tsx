import { type AdminMeResponse, LoginBody } from '@app/contracts';
import {
  Alert,
  Button,
  DemoCredentials,
  type FieldErrors,
  formValues,
  fromApiError,
  GoogleButton,
  OrDivider,
  oauthErrorMessage,
  TextField,
  validate,
} from '@app/ui';
import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, setAdminMe } from '../../lib/api';
import { safeNext } from '../../lib/auth';
import { demoAdmin, googleStartUrl, useProviders } from '../../lib/providers';
import { AdminAuthLayout } from './AdminAuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const providers = useProviders();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(oauthErrorMessage(params.get('error')));
  const [busy, setBusy] = useState(false);
  const next = params.get('next');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const v = validate(LoginBody, formValues(e.currentTarget));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      const { user } = await api.post<AdminMeResponse>('/auth/login', v.data);
      setAdminMe(user);
      navigate(safeNext(next), { replace: true });
    } catch (err) {
      const { fields, message } = fromApiError(err);
      setErrors(fields);
      setMessage(message);
    } finally {
      setBusy(false);
    }
  }

  function fill(email: string, password: string) {
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem('email') as HTMLInputElement).value = email;
    (form.elements.namedItem('password') as HTMLInputElement).value = password;
  }

  return (
    <AdminAuthLayout title="Sign in to the admin console">
      <div className="grid gap-4">
        {params.get('reset') === '1' && (
          <Alert tone="ok">Password updated. Sign in with your new password.</Alert>
        )}
        {message && <Alert tone="bad">{message}</Alert>}
        {providers.data?.google && (
          <>
            <GoogleButton href={googleStartUrl(next)} label="Continue with Google (work account)" />
            <OrDivider>or use your password</OrDivider>
          </>
        )}
        <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-4">
          <TextField
            name="email"
            type="email"
            label="Work email"
            autoComplete="username"
            error={errors.email}
          />
          <TextField
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            error={errors.password}
          />
          <Button type="submit" size="lg" loading={busy} block>
            Sign in
          </Button>
        </form>
        <Link
          to="/forgot-password"
          className="text-center text-sm font-medium text-brand hover:underline"
        >
          Forgot password?
        </Link>
        <DemoCredentials creds={demoAdmin()} onFill={fill} />
      </div>
    </AdminAuthLayout>
  );
}
