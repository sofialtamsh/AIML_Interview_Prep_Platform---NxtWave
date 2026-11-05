import { ChangePasswordBody, type StudentMeResponse, UpdateProfileBody } from '@app/contracts';
import {
  Alert,
  Button,
  Card,
  type FieldErrors,
  formValues,
  fromApiError,
  PasswordMeter,
  TextField,
  validate,
} from '@app/ui';
import { useState } from 'react';
import { api, setMe, useMe } from '../../lib/api';

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
];

export function ProfilePage() {
  return (
    <div className="grid max-w-2xl gap-6 animate-rise">
      <div>
        <h1 className="text-[clamp(24px,2.6vw,30px)]">Profile & security</h1>
        <p className="mt-1.5 text-muted">Keep your details up to date.</p>
      </div>
      <ProfileForm />
      <PasswordForm />
    </div>
  );
}

function ProfileForm() {
  const { data: me } = useMe();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  const zones = TIMEZONES.includes(me.timezone) ? TIMEZONES : [me.timezone, ...TIMEZONES];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const v = validate(UpdateProfileBody, formValues(e.currentTarget));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      const { user } = await api.patch<StudentMeResponse>('/student/profile', v.data);
      setMe(user);
      setStatus({ tone: 'ok', text: 'Saved ✓' });
    } catch (err) {
      const { fields, message } = fromApiError(err);
      setErrors(fields);
      if (message) setStatus({ tone: 'bad', text: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-base">Your details</h2>
      <form noValidate onSubmit={onSubmit} className="mt-4 grid gap-4">
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
        <TextField
          name="fullName"
          label="Name"
          defaultValue={me.fullName}
          autoComplete="name"
          error={errors.fullName}
        />
        <TextField
          label="Email"
          value={me.email}
          readOnly
          disabled
          hint={me.emailVerified ? 'Verified ✓' : 'Not verified yet'}
        />
        <div className="grid gap-1.5">
          <label htmlFor="timezone" className="text-[13px] font-semibold">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={me.timezone}
            className="rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-[15px] focus:border-brand focus:ring-[3px] focus:ring-brand-soft focus:outline-none"
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace('_', ' ')}
              </option>
            ))}
          </select>
          <span className="text-[12.5px] text-muted">
            Your daily plan and streak use this timezone.
          </span>
        </div>
        <div>
          <Button type="submit" loading={busy}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const form = e.currentTarget;
    const v = validate(ChangePasswordBody, formValues(form));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/auth/change-password', v.data);
      form.reset();
      setPw('');
      setStatus({ tone: 'ok', text: 'Password changed. Other devices were signed out.' });
    } catch (err) {
      const { fields, message } = fromApiError(err);
      setErrors(fields);
      if (message) setStatus({ tone: 'bad', text: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-base">Change password</h2>
      <form noValidate onSubmit={onSubmit} className="mt-4 grid gap-4">
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
        <TextField
          name="currentPassword"
          type="password"
          label="Current password"
          autoComplete="current-password"
          error={errors.currentPassword}
        />
        <TextField
          name="newPassword"
          type="password"
          label="New password"
          autoComplete="new-password"
          error={errors.newPassword}
          onChange={(e) => setPw(e.target.value)}
          hint={<PasswordMeter password={pw} />}
        />
        <div>
          <Button type="submit" variant="dark" loading={busy}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}
