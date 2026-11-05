import { RegisterBody, type StudentMeResponse } from '@app/contracts';
import {
  Alert,
  Button,
  type FieldErrors,
  formValues,
  fromApiError,
  GoogleButton,
  OrDivider,
  PasswordMeter,
  TextField,
  validate,
} from '@app/ui';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, setMe } from '../../lib/api';
import { googleStartUrl, useProviders } from '../../lib/providers';
import { AuthLayout } from './AuthLayout';

export function SignupPage() {
  const navigate = useNavigate();
  const providers = useProviders();
  const policy = providers.data?.registration;
  const emailHint =
    policy === 'ALLOWLIST'
      ? 'Use the email you enrolled with at NxtWave.'
      : policy === 'INVITE_ONLY'
        ? 'Sign-up is closed right now. Contact your program coordinator.'
        : "Any email works. We'll send a link to confirm it.";
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const v = validate(RegisterBody, formValues(e.currentTarget));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      const { user } = await api.post<StudentMeResponse>('/auth/register', v.data);
      setMe(user);
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
    <AuthLayout
      title="Let's get you interview-ready"
      subtitle="Takes 30 seconds. No credit card, no spam."
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {message && <Alert tone="bad">{message}</Alert>}
        {providers.data?.google && (
          <>
            <GoogleButton href={googleStartUrl(null)} label="Sign up with Google" />
            <OrDivider>or with your email</OrDivider>
          </>
        )}
        <TextField
          name="fullName"
          label="Your name"
          autoComplete="name"
          placeholder="Priya Sharma"
          error={errors.fullName}
        />
        <TextField
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
          hint={emailHint}
        />
        <TextField
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          placeholder="A phrase you'll remember"
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
          hint={<PasswordMeter password={password} />}
        />
        <Button type="submit" size="lg" loading={busy} block>
          Create my account
        </Button>
        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
