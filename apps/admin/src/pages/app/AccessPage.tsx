import type {
  AddAllowlistResponse,
  AllowlistResponse,
  CohortDto,
  RegistrationPolicy,
  RegistrationSettings,
} from '@app/contracts';
import {
  Alert,
  Badge,
  Button,
  Card,
  cn,
  EmptyState,
  errorMessage,
  fromApiError,
  Spinner,
  TextArea,
  TextField,
} from '@app/ui';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, Table, Td, Th } from '../../components/table';
import { api, queryClient, useAdminMe } from '../../lib/api';

const POLICIES: Array<{ value: RegistrationPolicy; title: string; text: string }> = [
  { value: 'OPEN', title: 'Open sign-up', text: 'Anyone can create a student account.' },
  {
    value: 'ALLOWLIST',
    title: 'Enrolled only',
    text: 'Only emails or domains on the enrollment list below can sign up.',
  },
  { value: 'INVITE_ONLY', title: 'Closed', text: 'Nobody can sign up on their own.' },
];

export function AccessPage() {
  return (
    <div className="grid gap-5 animate-rise">
      <PageHeader
        eyebrow="People"
        title="Access"
        sub="Who can join, and which batch they belong to."
      />
      <RegistrationCard />
      <CohortsCard />
      <AllowlistCard />
    </div>
  );
}

function RegistrationCard() {
  const { data: me } = useAdminMe();
  const isSuper = me?.role === 'SUPER_ADMIN';
  const policy = useQuery({
    queryKey: ['admin', 'registration'],
    queryFn: () => api.get<RegistrationSettings>('/access/registration'),
  });
  const save = useMutation({
    mutationFn: (p: RegistrationPolicy) =>
      api.put<RegistrationSettings>('/access/registration', { policy: p }),
    onSuccess: (r) => queryClient.setQueryData(['admin', 'registration'], r),
  });
  return (
    <Card className="p-5">
      <h2 className="text-base">Student sign-up</h2>
      {!isSuper && <p className="mt-1 text-sm text-muted">Only a super admin can change this.</p>}
      {policy.isPending && <Spinner />}
      {policy.data && (
        <div
          className="mt-4 grid gap-3 md:grid-cols-3"
          role="radiogroup"
          aria-label="Registration policy"
        >
          {POLICIES.map((p) => {
            const on = policy.data.policy === p.value;
            return (
              // biome-ignore lint/a11y/useSemanticElements: a described option card cannot be a native radio input
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!isSuper || save.isPending}
                onClick={() => save.mutate(p.value)}
                className={cn(
                  'rounded-xl border-[1.5px] p-4 text-left transition disabled:cursor-not-allowed',
                  on ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-2',
                )}
              >
                <b className="text-sm">{p.title}</b>
                <p className="mt-1 text-[13px] text-ink-2">{p.text}</p>
              </button>
            );
          })}
        </div>
      )}
      {save.isError && (
        <div className="mt-3">
          <Alert tone="bad">{errorMessage(save.error)}</Alert>
        </div>
      )}
    </Card>
  );
}

function CohortsCard() {
  const cohorts = useQuery({
    queryKey: ['admin', 'cohorts'],
    queryFn: () => api.get<{ items: CohortDto[] }>('/access/cohorts'),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    mutationFn: (body: unknown) => api.post('/access/cohorts', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'cohorts'] }),
    onError: (err) => setErrors(fromApiError(err).fields),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/access/cohorts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'cohorts'] }),
  });

  return (
    <Card>
      <div className="border-b border-line p-5">
        <h2 className="text-base">Cohorts</h2>
        <form
          noValidate
          className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_160px_160px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            setErrors({});
            create.mutate(
              {
                name: String(f.get('name')),
                startsOn: String(f.get('startsOn') || '') || null,
                endsOn: String(f.get('endsOn') || '') || null,
              },
              { onSuccess: () => form.reset() },
            );
          }}
        >
          <TextField name="name" label="Name" placeholder="DSML Cohort 8" error={errors.name} />
          <TextField name="startsOn" type="date" label="Starts" />
          <TextField name="endsOn" type="date" label="Ends" />
          <Button type="submit" loading={create.isPending}>
            Add cohort
          </Button>
        </form>
      </div>
      {cohorts.data?.items.length === 0 && <EmptyState title="No cohorts yet" />}
      {cohorts.data && cohorts.data.items.length > 0 && (
        <Table minWidth={560}>
          <thead>
            <tr>
              <Th>Cohort</Th>
              <Th>Dates</Th>
              <Th>Students</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {cohorts.data.items.map((c) => (
              <tr key={c.id}>
                <Td>
                  <b>{c.name}</b>
                </Td>
                <Td className="text-ink-2">
                  {c.startsOn ? `${c.startsOn} → ${c.endsOn ?? '…'}` : '–'}
                </Td>
                <Td className="font-mono">{c.memberCount}</Td>
                <Td className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${c.name}`}
                    onClick={() =>
                      window.confirm(
                        `Delete cohort "${c.name}"? Students stay; only the grouping is removed.`,
                      ) && del.mutate(c.id)
                    }
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function AllowlistCard() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AddAllowlistResponse | null>(null);
  const cohorts = useQuery({
    queryKey: ['admin', 'cohorts'],
    queryFn: () => api.get<{ items: CohortDto[] }>('/access/cohorts'),
  });
  const list = useQuery({
    queryKey: ['admin', 'allowlist', page],
    queryFn: () => api.get<AllowlistResponse>(`/access/allowlist?page=${page}&pageSize=20`),
    placeholderData: keepPreviousData,
  });
  const add = useMutation({
    mutationFn: (body: unknown) => api.post<AddAllowlistResponse>('/access/allowlist', body),
    onSuccess: (r) => {
      setResult(r);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'allowlist'] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/access/allowlist/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'allowlist'] }),
  });
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <Card>
      <div className="border-b border-line p-5">
        <h2 className="text-base">Enrollment list</h2>
        <p className="mt-1 text-sm text-muted">
          Paste emails or whole domains (one per line, or comma separated). Students who sign up
          with them join the chosen cohort automatically.
        </p>
        <form
          noValidate
          className="mt-4 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            const entries = String(f.get('entries') ?? '')
              .split(/[\s,;]+/)
              .map((s) => s.trim())
              .filter(Boolean);
            if (!entries.length) return;
            add.mutate(
              {
                entries,
                cohortId: String(f.get('cohortId') || '') || null,
                note: String(f.get('note') || '') || undefined,
              },
              { onSuccess: () => form.reset() },
            );
          }}
        >
          <TextArea
            name="entries"
            label="Emails or domains"
            rows={4}
            placeholder={'priya@college.edu\n@nxtwave.co.in'}
          />
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="grid gap-1.5">
              <label htmlFor="cohortId" className="text-[13px] font-semibold">
                Add to cohort
              </label>
              <select
                id="cohortId"
                name="cohortId"
                className="rounded-[10px] border border-line-2 bg-surface px-3 py-2.5 text-sm"
              >
                <option value="">No cohort</option>
                {cohorts.data?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <TextField name="note" label="Note (optional)" placeholder="Nov intake" />
            <Button type="submit" loading={add.isPending}>
              Add to list
            </Button>
          </div>
        </form>
        {result && (
          <div className="mt-3">
            <Alert tone={result.invalid.length ? 'warn' : 'ok'}>
              Added {result.added}.{' '}
              {result.alreadyListed > 0 && `${result.alreadyListed} were already listed. `}
              {result.invalid.length > 0 &&
                `Skipped ${result.invalid.length} invalid: ${result.invalid.slice(0, 5).join(', ')}${result.invalid.length > 5 ? '…' : ''}`}
            </Alert>
          </div>
        )}
        {add.isError && (
          <div className="mt-3">
            <Alert tone="bad">{errorMessage(add.error)}</Alert>
          </div>
        )}
      </div>
      {list.data?.items.length === 0 && (
        <EmptyState title="The list is empty">Add emails or domains above.</EmptyState>
      )}
      {list.data && list.data.items.length > 0 && (
        <>
          <Table minWidth={640}>
            <thead>
              <tr>
                <Th>Email or domain</Th>
                <Th>Cohort</Th>
                <Th>Used</Th>
                <Th>Note</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((r) => (
                <tr key={r.id}>
                  <Td className="font-mono text-[13px]">{r.email ?? `@${r.domain}`}</Td>
                  <Td className="text-ink-2">{r.cohort?.name ?? '–'}</Td>
                  <Td>
                    {r.domain ? (
                      <Badge>Domain</Badge>
                    ) : r.usedAt ? (
                      <Badge tone="ok">Signed up</Badge>
                    ) : (
                      <Badge tone="planned">Waiting</Badge>
                    )}
                  </Td>
                  <Td className="text-ink-2">{r.note ?? ''}</Td>
                  <Td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Remove"
                      onClick={() => del.mutate(r.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center justify-end gap-2 px-4 py-3 text-sm">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="font-mono text-xs text-muted">
              {page} / {pages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
