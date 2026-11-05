import { type AdminListResponse, InviteAdminBody, type InviteAdminResponse } from '@app/contracts';
import {
  Alert,
  Button,
  Card,
  errorMessage,
  type FieldErrors,
  formValues,
  fromApiError,
  Spinner,
  TextField,
  validate,
} from '@app/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { api, queryClient } from '../../lib/api';

const listKey = ['admin', 'admins'] as const;

export function AdminsPage() {
  const admins = useQuery({
    queryKey: listKey,
    queryFn: () => api.get<AdminListResponse>('/admins'),
  });

  return (
    <div className="grid gap-6 animate-rise">
      <header>
        <span className="eyebrow">Platform</span>
        <h1 className="mt-1.5 text-[clamp(22px,2.4vw,28px)]">Admins</h1>
        <p className="mt-1 text-sm text-muted">
          Invite teammates. Admins manage content and students; super admins also manage admins and
          settings.
        </p>
      </header>

      <InviteForm />

      <Card className="overflow-x-auto">
        {admins.isPending && (
          <div className="p-5">
            <Spinner />
          </div>
        )}
        {admins.isError && (
          <div className="p-5">
            <Alert tone="bad">{errorMessage(admins.error)}</Alert>
          </div>
        )}
        {admins.data && (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] tracking-wider text-muted uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {admins.data.items.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{a.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-2">{a.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.role.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        a.status === 'ACTIVE'
                          ? 'rounded-full bg-ok-bg px-2 py-0.5 text-xs font-semibold text-ok'
                          : 'rounded-full bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn'
                      }
                    >
                      {a.status === 'INVITED' ? 'Invite pending' : a.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString('en-IN') : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function InviteForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<InviteAdminResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const invite = useMutation({
    mutationFn: (body: unknown) => api.post<InviteAdminResponse>('/admins/invites', body),
    onSuccess: (r) => {
      setResult(r);
      queryClient.invalidateQueries({ queryKey: listKey });
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const v = validate(InviteAdminBody, formValues(e.currentTarget));
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    invite.mutate(v.data);
  }

  return (
    <Card className="p-5">
      <h2 className="text-base">Invite an admin</h2>
      <form
        noValidate
        onSubmit={onSubmit}
        className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_180px_auto]"
      >
        <TextField
          name="email"
          type="email"
          label="Work email"
          placeholder="teammate@nxtwave.co.in"
          error={errors.email}
        />
        <div className="grid gap-1.5">
          <label htmlFor="role" className="text-[13px] font-semibold">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="ADMIN"
            className="rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-[15px]"
          >
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </select>
        </div>
        <Button type="submit" loading={invite.isPending}>
          Send invite
        </Button>
      </form>
      {invite.isError && !Object.keys(errors).length && (
        <div className="mt-3">
          <Alert tone="bad">{errorMessage(invite.error)}</Alert>
        </div>
      )}
      {result && (
        <div className="mt-4">
          <Alert
            tone="ok"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.inviteUrl);
                  setCopied(true);
                }}
              >
                <Copy className="size-3.5" aria-hidden /> {copied ? 'Copied' : 'Copy link'}
              </Button>
            }
          >
            Invite emailed to {result.email}. You can also share the link directly. It expires{' '}
            {new Date(result.expiresAt).toLocaleString('en-IN')}.
          </Alert>
        </div>
      )}
    </Card>
  );
}
