import type {
  AdminCatalogResponse,
  CohortDto,
  RoadmapResponse,
  StudentDetail,
  StudentListResponse,
} from '@app/contracts';
import { Alert, Badge, Button, Card, Dialog, EmptyState, errorMessage, Spinner } from '@app/ui';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader, RoleChip, Table, Td, Th, timeAgo } from '../../components/table';
import { api, queryClient } from '../../lib/api';

const LEVEL_LABEL = ['😶 New', '🙂 Basics', '😎 Comfortable', '🚀 Confident'];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FILTERS = ['q', 'roleId', 'bracketId', 'cohortId', 'onboarding', 'status'] as const;

export function StudentsPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [openId, setOpenId] = useState<string | null>(null);

  // Debounce the search box into the URL (filters are shareable links).
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== q) {
        const next = new URLSearchParams(params);
        if (q) next.set('q', q);
        else next.delete('q');
        next.delete('page');
        setParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, params, setParams]);

  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  for (const k of FILTERS) {
    const v = params.get(k);
    if (v) query.set(k, v);
  }
  const list = useQuery({
    queryKey: ['admin', 'students', query.toString()],
    queryFn: () => api.get<StudentListResponse>(`/students/?${query}`),
    placeholderData: keepPreviousData,
  });
  const catalog = useQuery({
    queryKey: ['admin', 'catalog'],
    queryFn: () => api.get<AdminCatalogResponse>('/catalog/'),
  });
  const cohorts = useQuery({
    queryKey: ['admin', 'cohorts'],
    queryFn: () => api.get<{ items: CohortDto[] }>('/access/cohorts'),
  });

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete('page');
    setParams(next);
  };
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  const sel = 'rounded-[10px] border border-line bg-surface px-3 py-2 text-sm';

  return (
    <div className="grid gap-5 animate-rise">
      <PageHeader
        eyebrow="People"
        title="Students"
        sub="Every student's target and progress. Filter, open a student's track, manage access."
      />
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-[10px] border border-line px-3 focus-within:border-brand">
          <Search className="size-4 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email"
            className="w-full bg-transparent py-2 text-sm outline-none"
            aria-label="Search students"
          />
        </label>
        <select
          aria-label="Role"
          className={sel}
          value={params.get('roleId') ?? ''}
          onChange={(e) => setFilter('roleId', e.target.value)}
        >
          <option value="">All roles</option>
          {catalog.data?.roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Package"
          className={sel}
          value={params.get('bracketId') ?? ''}
          onChange={(e) => setFilter('bracketId', e.target.value)}
        >
          <option value="">All packages</option>
          {catalog.data?.brackets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Cohort"
          className={sel}
          value={params.get('cohortId') ?? ''}
          onChange={(e) => setFilter('cohortId', e.target.value)}
        >
          <option value="">All cohorts</option>
          {cohorts.data?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Onboarding"
          className={sel}
          value={params.get('onboarding') ?? ''}
          onChange={(e) => setFilter('onboarding', e.target.value)}
        >
          <option value="">Any onboarding</option>
          <option value="done">Goal set</option>
          <option value="pending">Not set yet</option>
        </select>
        <select
          aria-label="Status"
          className={sel}
          value={params.get('status') ?? ''}
          onChange={(e) => setFilter('status', e.target.value)}
        >
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </Card>

      <Card>
        {list.isPending && (
          <div className="p-5">
            <Spinner />
          </div>
        )}
        {list.isError && (
          <div className="p-5">
            <Alert tone="bad">{errorMessage(list.error)}</Alert>
          </div>
        )}
        {list.data && list.data.items.length === 0 && (
          <EmptyState title="No students match">Try clearing a filter.</EmptyState>
        )}
        {list.data && list.data.items.length > 0 && (
          <Table minWidth={900}>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Target</Th>
                <Th>Cohorts</Th>
                <Th>Status</Th>
                <Th>Last active</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((s) => (
                <tr
                  key={s.id}
                  className="cursor-pointer hover:bg-surface-2"
                  onClick={() => setOpenId(s.id)}
                >
                  <Td>
                    <button type="button" className="text-left" onClick={() => setOpenId(s.id)}>
                      <b className="block">{s.fullName || '—'}</b>
                      <span className="text-xs text-muted">{s.email}</span>
                    </button>
                  </Td>
                  <Td>
                    {s.role ? (
                      <span className="flex items-center gap-2">
                        <RoleChip code={s.role.shortCode} color={s.role.colorKey} />
                        <span>
                          {s.role.title}
                          <span className="block font-mono text-xs text-muted">
                            {s.bracket?.label}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted">Not set yet</span>
                    )}
                  </Td>
                  <Td className="text-ink-2">{s.cohorts.map((c) => c.name).join(', ') || '–'}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {s.status === 'SUSPENDED' ? (
                        <Badge tone="bad">Suspended</Badge>
                      ) : (
                        <Badge tone="ok">Active</Badge>
                      )}
                      {!s.emailVerified && <Badge tone="warn">Unverified</Badge>}
                    </span>
                  </Td>
                  <Td className="text-ink-2">{timeAgo(s.lastActiveAt)}</Td>
                  <Td className="text-ink-2">
                    {new Date(s.createdAt).toLocaleDateString('en-IN')}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {list.data && list.data.total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted">
            <span>
              {list.data.total.toLocaleString('en-IN')} student{list.data.total === 1 ? '' : 's'}
            </span>
            <span className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setFilter('page', String(page - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="font-mono text-xs">
                {page} / {pages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= pages}
                onClick={() => setFilter('page', String(page + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </span>
          </div>
        )}
      </Card>
      {openId && (
        <StudentDialog
          id={openId}
          cohorts={cohorts.data?.items ?? []}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function StudentDialog({
  id,
  cohorts,
  onClose,
}: {
  id: string;
  cohorts: CohortDto[];
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ['admin', 'student', id],
    queryFn: () => api.get<StudentDetail>(`/students/${id}`),
  });
  const [picked, setPicked] = useState<string[] | null>(null);
  const update = useMutation({
    mutationFn: (body: unknown) => api.patch<StudentDetail>(`/students/${id}`, body),
    onSuccess: (s) => {
      queryClient.setQueryData(['admin', 'student', id], s);
      setPicked(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'cohorts'] });
    },
  });
  const s = detail.data;
  const current = picked ?? s?.cohorts.map((c) => c.id) ?? [];

  return (
    <Dialog open onClose={onClose} title={s ? s.fullName || s.email : 'Student'} wide>
      {detail.isPending && <Spinner />}
      {detail.isError && <Alert tone="bad">{errorMessage(detail.error)}</Alert>}
      {s && (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{s.email}</span>·<span>{s.timezone}</span>·
            <span>joined {new Date(s.createdAt).toLocaleDateString('en-IN')}</span>·
            <span>active {timeAgo(s.lastActiveAt)}</span>
          </div>

          <section className="rounded-xl border border-line p-4">
            <div className="eyebrow">Target</div>
            {s.goal ? (
              <div className="mt-2 grid gap-1 text-sm">
                <span className="flex items-center gap-2">
                  <RoleChip code={s.goal.role.shortCode} color={s.goal.role.colorKey} />
                  <b>{s.goal.role.title}</b> ·{' '}
                  <span className="font-display">{s.goal.bracket.label}</span>
                </span>
                <span className="text-ink-2">
                  {s.goal.dailyMinutes} min on{' '}
                  {s.goal.studyWeekdays.map((d) => WEEKDAY[d]).join(', ')} ·{' '}
                  {s.goal.deadline
                    ? `deadline ${s.goal.deadline} (${s.goal.daysToDeadline} days)`
                    : 'no deadline'}
                </span>
                {s.previousGoals > 0 && (
                  <span className="text-xs text-muted">
                    {s.previousGoals} earlier target(s) in history
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Has not set a goal yet.</p>
            )}
          </section>

          {s.goal && <StudentRoadmap id={id} />}

          {s.skills.length > 0 && (
            <section className="rounded-xl border border-line p-4">
              <div className="eyebrow">Self-check</div>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {s.skills.map((k) => (
                  <li key={k.skillAreaId} className="flex justify-between gap-2 text-sm">
                    <span>{k.name}</span>
                    <span className="text-ink-2">{LEVEL_LABEL[k.level]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-line p-4">
            <div className="eyebrow">Cohorts</div>
            {cohorts.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No cohorts yet. Create them under Access.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {cohorts.map((c) => {
                  const on = current.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setPicked(on ? current.filter((x) => x !== c.id) : [...current, c.id])
                        }
                      />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            )}
            {picked && (
              <Button
                size="sm"
                className="mt-3"
                loading={update.isPending}
                onClick={() => update.mutate({ cohortIds: picked })}
              >
                Save cohorts
              </Button>
            )}
          </section>

          {update.isError && <Alert tone="bad">{errorMessage(update.error)}</Alert>}
          <div className="flex justify-end">
            {s.status === 'SUSPENDED' ? (
              <Button
                variant="secondary"
                loading={update.isPending}
                onClick={() => update.mutate({ status: 'ACTIVE' })}
              >
                Reactivate account
              </Button>
            ) : (
              <Button
                variant="danger"
                loading={update.isPending}
                onClick={() =>
                  window.confirm(
                    `Suspend ${s.email}? They will be signed out and cannot sign in until reactivated.`,
                  ) && update.mutate({ status: 'SUSPENDED' })
                }
              >
                Suspend account
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

const ROADMAP_STATUS: Record<string, string> = {
  DONE: 'Done',
  IN_PROGRESS: 'In progress',
  DELAYED: 'Behind',
  UP_NEXT: 'Up next',
  UPCOMING: 'Upcoming',
};

/** The same roadmap the student sees (read-only), so mentors can talk about the same plan. */
function StudentRoadmap({ id }: { id: string }) {
  const roadmap = useQuery({
    queryKey: ['admin', 'student', id, 'roadmap'],
    queryFn: () => api.get<RoadmapResponse>(`/students/${id}/roadmap`),
  });
  const r = roadmap.data?.roadmap;
  return (
    <section className="rounded-xl border border-line p-4">
      <div className="eyebrow">Roadmap</div>
      {roadmap.isPending && <Spinner />}
      {roadmap.isError && <Alert tone="bad">{errorMessage(roadmap.error)}</Alert>}
      {roadmap.data && !r && (
        <p className="mt-2 text-sm text-muted">
          {roadmap.data.status === 'PENDING_CURRICULUM'
            ? 'Waiting for a published curriculum for this target.'
            : 'No roadmap yet.'}
        </p>
      )}
      {r && (
        <div className="mt-2 grid gap-3 text-sm">
          <p className="text-ink-2">
            Plan v{r.version.versionNumber} · {r.totals.subtopics} subtopics ·{' '}
            {Math.round(r.totals.totalMinutes / 60)} h · ends {r.totals.plannedEndDate ?? '—'} ·{' '}
            {r.totals.percentComplete}% done
            {r.totals.delayed > 0 && <b className="text-warn"> · {r.totals.delayed} behind</b>}
            {r.feasibility && !r.feasibility.feasible && (
              <b className="text-warn"> · misses deadline by {r.feasibility.daysOver} days</b>
            )}
            {roadmap.data?.proposal && <b className="text-brand"> · update waiting</b>}
          </p>
          <ol className="grid gap-1">
            {r.topics.flatMap((t) =>
              t.items.map((i) => (
                <li key={i.subtopicId} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="w-5 font-mono text-xs text-muted">{i.sequence}</span>
                  <span className="min-w-0 flex-1">{i.title}</span>
                  <span className="text-xs text-muted">
                    {i.depth.name} · {ROADMAP_STATUS[i.status]}
                  </span>
                </li>
              )),
            )}
          </ol>
        </div>
      )}
    </section>
  );
}
