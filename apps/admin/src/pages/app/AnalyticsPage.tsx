import type {
  AnalyticsDay,
  AnalyticsResponse,
  AnalyticsStudent,
  CohortDto,
  StudentAnalyticsResponse,
} from '@app/contracts';
import { Alert, Card, cn, Dialog, EmptyState, errorMessage, Spinner } from '@app/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDownUp, Download, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader, Table, Td, Th, timeAgo } from '../../components/table';
import { api } from '../../lib/api';

/** The quick ranges; a custom range comes from the two date fields. */
const RANGES = [
  { id: '1', label: 'Today' },
  { id: '7', label: '7 days' },
  { id: '14', label: '14 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
] as const;

const ACTIVITY = [
  { id: 'all', label: 'All students' },
  { id: 'active', label: 'Active in range' },
  { id: 'today', label: 'Active today' },
  { id: 'inactive', label: 'Not active in range' },
  { id: 'never', label: 'Never active' },
] as const;
type ActivityFilter = (typeof ACTIVITY)[number]['id'];

const SORTS = {
  lastActive: 'Last active',
  activeDays: 'Active days',
  learnMinutes: 'Learning time',
  unitsDone: 'Units done',
  practiceSolves: 'Practice opened',
  joined: 'Joined',
  name: 'Name',
} as const;
type SortKey = keyof typeof SORTS;

const DAY = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const WEEKDAY = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const fmtDay = (iso: string) => DAY.format(new Date(`${iso}T00:00:00Z`));
const fmtWeekday = (iso: string) => WEEKDAY.format(new Date(`${iso}T00:00:00Z`));
const num = (n: number) => n.toLocaleString('en-IN');
function minutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Analytics: who uses the platform, on which days, for how long and doing what. Every number is
 * counted from the activity log the API keeps (pages opened, lesson steps and their study time,
 * quiz answers, practice links opened, units finished), in days in India.
 */
export function AnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const range = params.get('range') ?? '14';
  const custom = range === 'custom';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const [activity, setActivity] = useState<ActivityFilter>('all');
  const [sort, setSort] = useState<SortKey>('lastActive');
  const [openId, setOpenId] = useState<string | null>(null);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  // The server works out "today" in India; quick ranges are counted back from the latest answer.
  const [today, setToday] = useState<string | null>(null);
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (custom) {
      const from = params.get('from');
      const to = params.get('to');
      if (from) p.set('from', from);
      if (to) p.set('to', to);
    } else if (today) {
      p.set('from', addDays(today, -(Number(range) - 1)));
      p.set('to', today);
    }
    if (debounced) p.set('q', debounced);
    const cohort = params.get('cohortId');
    if (cohort) p.set('cohortId', cohort);
    return p.toString();
  }, [custom, params, today, range, debounced]);

  const data = useQuery({
    queryKey: ['admin', 'analytics', query],
    queryFn: () => api.get<AnalyticsResponse>(`/analytics${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  useEffect(() => {
    if (data.data && data.data.range.today !== today) setToday(data.data.range.today);
  }, [data.data, today]);
  const cohorts = useQuery({
    queryKey: ['admin', 'cohorts'],
    queryFn: () => api.get<{ items: CohortDto[] }>('/access/cohorts'),
  });

  const a = data.data;
  const students = useMemo(() => {
    if (!a) return [];
    const rows = a.students.filter((s) => {
      switch (activity) {
        case 'active':
          return s.activeDays > 0;
        case 'today':
          return s.days.includes(a.range.today);
        case 'inactive':
          return s.activeDays === 0;
        case 'never':
          return s.lastActiveAt === null;
        default:
          return true;
      }
    });
    const by: Record<SortKey, (s: AnalyticsStudent) => number | string> = {
      lastActive: (s) => (s.lastActiveAt ? Date.parse(s.lastActiveAt) : 0),
      activeDays: (s) => s.activeDays,
      learnMinutes: (s) => s.learnMinutes,
      unitsDone: (s) => s.unitsDone,
      practiceSolves: (s) => s.practiceSolves,
      joined: (s) => Date.parse(s.joinedAt),
      name: (s) => (s.fullName || s.email).toLowerCase(),
    };
    const key = by[sort];
    return [...rows].sort((x, y) => {
      const kx = key(x);
      const ky = key(y);
      if (sort === 'name') return String(kx).localeCompare(String(ky));
      return Number(ky) - Number(kx);
    });
  }, [a, activity, sort]);

  const sel = 'rounded-[10px] border border-line bg-surface px-3 py-2 text-sm';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 animate-rise">
      <PageHeader
        eyebrow="People"
        title="Analytics"
        sub="Who uses the platform, on which days, for how long and doing what. Days are days in India; the numbers refresh every minute."
        action={
          a && (
            <button
              type="button"
              onClick={() => downloadCsv(a, students)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-sm font-semibold hover:border-ink-2"
            >
              <Download className="size-4" aria-hidden /> Download CSV
            </button>
          )
        }
      />

      {/* Filters: one row above everything they change. */}
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <fieldset className="m-0 flex flex-wrap gap-1 border-0 p-0">
          <legend className="sr-only">Date range</legend>
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={range === r.id}
              onClick={() => set({ range: r.id, from: null, to: null })}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold',
                range === r.id
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line bg-surface text-ink-2 hover:border-line-2',
              )}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={custom}
            onClick={() =>
              set({
                range: 'custom',
                from: params.get('from') ?? a?.range.from ?? null,
                to: params.get('to') ?? a?.range.to ?? null,
              })
            }
            className={cn(
              'rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold',
              custom
                ? 'border-ink bg-ink text-surface'
                : 'border-line bg-surface text-ink-2 hover:border-line-2',
            )}
          >
            Custom
          </button>
        </fieldset>
        {custom && (
          <div className="flex items-center gap-1.5 text-sm">
            <input
              type="date"
              aria-label="From"
              className={sel}
              value={params.get('from') ?? ''}
              max={today ?? undefined}
              onChange={(e) => set({ from: e.target.value || null })}
            />
            <span className="text-muted">to</span>
            <input
              type="date"
              aria-label="To"
              className={sel}
              value={params.get('to') ?? ''}
              max={today ?? undefined}
              onChange={(e) => set({ to: e.target.value || null })}
            />
          </div>
        )}
        <label className="flex min-w-52 flex-1 items-center gap-2 rounded-[10px] border border-line px-3 focus-within:border-brand">
          <Search className="size-4 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              set({ q: e.target.value.trim() || null });
            }}
            placeholder="Search name or email"
            className="w-full bg-transparent py-2 text-sm outline-none"
            aria-label="Search students"
          />
        </label>
        <select
          aria-label="Cohort"
          className={sel}
          value={params.get('cohortId') ?? ''}
          onChange={(e) => set({ cohortId: e.target.value || null })}
        >
          <option value="">All cohorts</option>
          {cohorts.data?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Card>

      {data.isPending && <Spinner />}
      {data.isError && <Alert tone="bad">{errorMessage(data.error)}</Alert>}
      {a && (
        <>
          <p className="-mt-2 text-[12.5px] text-muted">
            {fmtWeekday(a.range.from)} to {fmtWeekday(a.range.to)} · {a.range.days}{' '}
            {a.range.days === 1 ? 'day' : 'days'}
            {a.summary.trackingSince
              ? ` · activity is recorded from ${fmtDay(a.summary.trackingSince)}`
              : ' · no activity recorded yet'}
          </p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Students" value={num(a.summary.students)} />
            <Kpi
              label="Active today"
              value={num(a.summary.activeToday)}
              sub={share(a.summary.activeToday, a.summary.students)}
            />
            <Kpi
              label="Active in last 7 days"
              value={num(a.summary.activeLast7Days)}
              sub={share(a.summary.activeLast7Days, a.summary.students)}
            />
            <Kpi
              label="Active in range"
              value={num(a.summary.activeInRange)}
              sub={`${num(a.summary.joinedInRange)} joined in range`}
            />
            <Kpi
              label="Learning time"
              value={minutes(a.summary.learnMinutes)}
              sub={`${num(a.summary.lessonsCompleted)} units finished`}
            />
            <Kpi
              label="Practice opened"
              value={num(a.summary.practiceSolves)}
              sub="Solve Question clicks"
            />
          </div>

          <DailyChart daily={a.daily} />

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-line border-b px-4 py-3">
              <div>
                <h2 className="text-[15px]">Students</h2>
                <p className="text-[12.5px] text-muted">
                  {num(students.length)} of {num(a.students.length)} shown. Open a student for their
                  day-by-day detail.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Activity"
                  className={sel}
                  value={activity}
                  onChange={(e) => setActivity(e.target.value as ActivityFilter)}
                >
                  {ACTIVITY.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-sm text-muted">
                  <ArrowDownUp className="size-4" aria-hidden />
                  <span className="sr-only">Sort by</span>
                  <select
                    aria-label="Sort by"
                    className={sel}
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                  >
                    {Object.entries(SORTS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {students.length === 0 ? (
              <EmptyState title="No students match">Try another range or filter.</EmptyState>
            ) : (
              <Table minWidth={1080}>
                <thead>
                  <tr>
                    <Th>Student</Th>
                    <Th>Days active</Th>
                    <Th className="text-right">Learning</Th>
                    <Th className="text-right">Quiz</Th>
                    <Th className="text-right">Practice</Th>
                    <Th className="text-right">Units</Th>
                    <Th>Last active</Th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer hover:bg-surface-2"
                      onClick={() => setOpenId(s.id)}
                    >
                      <Td>
                        <button
                          type="button"
                          className="text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(s.id);
                          }}
                        >
                          <b className="block">{s.fullName || '—'}</b>
                          <span className="text-xs text-muted">{s.email}</span>
                          {s.cohorts.length > 0 && (
                            <span className="block text-xs text-muted">{s.cohorts.join(', ')}</span>
                          )}
                        </button>
                      </Td>
                      <Td>
                        <DayStrip days={a.daily.map((d) => d.day)} active={s.days} />
                        <span className="mt-1 block font-mono text-xs text-muted">
                          {s.activeDays} of {a.range.days}
                        </span>
                      </Td>
                      <Td className="text-right font-mono tabular-nums">
                        {s.learnMinutes ? minutes(s.learnMinutes) : '–'}
                        {s.steps > 0 && (
                          <span className="block text-xs text-muted">
                            {s.steps} {s.steps === 1 ? 'step' : 'steps'}
                          </span>
                        )}
                      </Td>
                      <Td className="text-right font-mono tabular-nums">
                        {s.quizAnswers ? `${s.quizRight}/${s.quizAnswers}` : '–'}
                      </Td>
                      <Td className="text-right font-mono tabular-nums">
                        {s.practiceSolves || '–'}
                        {s.conceptViews > 0 && (
                          <span className="block text-xs text-muted">{s.conceptViews} concept</span>
                        )}
                      </Td>
                      <Td className="text-right font-mono tabular-nums">
                        {s.unitsDone}
                        <span className="text-muted">/{s.unitsStarted}</span>
                        <span className="block text-xs text-muted">done/started</span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {timeAgo(s.lastActiveAt)}
                        <span className="block text-xs text-muted">
                          joined {new Date(s.joinedAt).toLocaleDateString('en-IN')}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      )}

      <StudentDialog
        id={openId}
        query={query}
        onClose={() => setOpenId(null)}
        name={a?.students.find((s) => s.id === openId)?.fullName ?? ''}
      />
    </div>
  );
}

function share(part: number, whole: number) {
  return whole === 0 ? undefined : `${Math.round((part / whole) * 100)}% of students`;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[12.5px] font-medium text-muted">{label}</div>
      <div className="mt-1 font-display text-[26px] leading-tight font-bold tracking-tight tabular-nums">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[12px] text-muted">{sub}</div>}
    </Card>
  );
}

/**
 * Active students per day: one column per day, from one baseline. One series, so no legend; the
 * title says what is plotted. Hovering or focusing a column reads out that day in full, and the
 * same numbers are in the CSV.
 */
function DailyChart({ daily }: { daily: AnalyticsDay[] }) {
  const [at, setAt] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => d.activeStudents));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const H = 180;
  const shown = at === null ? null : daily[at];
  // Label every nth day so the dates never collide.
  const every = Math.max(1, Math.ceil(daily.length / 12));

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-[15px]">Active students per day</h2>
          <p className="text-[12.5px] text-muted">
            A student is active on a day if they opened the app or did anything in it.
          </p>
        </div>
        <div className="min-h-[2.5rem] text-right text-[12.5px] text-muted" aria-live="polite">
          {shown ? (
            <>
              <b className="font-display text-[17px] text-ink">{shown.activeStudents}</b> active on{' '}
              {fmtWeekday(shown.day)}
              <span className="block">
                {minutes(shown.learnMinutes)} learning · {shown.quizAnswers} quiz answers ·{' '}
                {shown.practiceSolves} practice opened · {shown.lessonsCompleted} units finished
              </span>
            </>
          ) : (
            'Point at a day for its numbers'
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
        <div className="relative" style={{ height: H }} aria-hidden>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 font-mono text-[11px] text-muted"
              style={{ top: H - (t / top) * H }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="relative" style={{ height: H }}>
          {ticks.map((t) => (
            <span
              key={t}
              aria-hidden
              className="absolute inset-x-0 border-line border-t"
              style={{ top: H - (t / top) * H }}
            />
          ))}
          <ol
            className="absolute inset-0 flex items-end"
            style={{ gap: daily.length > 45 ? 1 : 2 }}
            aria-label="Active students per day"
            onPointerLeave={() => setAt(null)}
          >
            {daily.map((d, i) => (
              <li key={d.day} className="flex h-full min-w-0 flex-1 items-end justify-center">
                <button
                  type="button"
                  onPointerEnter={() => setAt(i)}
                  onFocus={() => setAt(i)}
                  onBlur={() => setAt(null)}
                  aria-label={`${fmtWeekday(d.day)}: ${d.activeStudents} active`}
                  className="group flex h-full w-full items-end justify-center outline-none"
                >
                  <span
                    className={cn(
                      'block w-full max-w-6 rounded-t-[4px] transition-colors',
                      at === i ? 'bg-brand-deep' : 'bg-brand',
                      d.activeStudents === 0 && 'bg-transparent',
                    )}
                    style={{ height: (d.activeStudents / top) * H }}
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>
        <span />
        <div className="mt-1.5 flex" style={{ gap: daily.length > 45 ? 1 : 2 }} aria-hidden>
          {daily.map((d, i) => (
            <span
              key={d.day}
              className="min-w-0 flex-1 text-center font-mono text-[10.5px] whitespace-nowrap text-muted"
            >
              {i % every === 0 || i === daily.length - 1 ? fmtDay(d.day) : ''}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? Math.max(1, raw);
}

/** One cell per day of the range: filled when the student was active that day. */
function DayStrip({ days, active }: { days: string[]; active: string[] }) {
  const on = new Set(active);
  const dense = days.length > 31;
  return (
    <span
      className={cn('flex flex-wrap', dense ? 'max-w-[16rem] gap-px' : 'gap-0.5')}
      role="img"
      aria-label={`Active on ${active.length} of ${days.length} days`}
    >
      {days.map((d) => (
        <span
          key={d}
          title={`${fmtWeekday(d)}: ${on.has(d) ? 'active' : 'not active'}`}
          className={cn(
            'block rounded-[2px]',
            dense ? 'size-2' : 'size-3',
            on.has(d) ? 'bg-brand' : 'bg-surface-3',
          )}
        />
      ))}
    </span>
  );
}

const KIND_LABEL: Record<StudentAnalyticsResponse['recent'][number]['kind'], string> = {
  VISIT: 'Opened',
  LESSON_STEP: 'Lesson step',
  LESSON_COMPLETED: 'Finished unit',
  QUIZ_ANSWER: 'Quiz answer',
  PRACTICE_SOLVE: 'Opened practice question',
  PRACTICE_CONCEPT: 'Watched concept',
};

function StudentDialog({
  id,
  name,
  query,
  onClose,
}: {
  id: string | null;
  name: string;
  query: string;
  onClose: () => void;
}) {
  // The same date range as the page.
  const range = new URLSearchParams(query);
  range.delete('q');
  range.delete('cohortId');
  const detail = useQuery({
    queryKey: ['admin', 'analytics', 'student', id, range.toString()],
    queryFn: () =>
      api.get<StudentAnalyticsResponse>(`/analytics/students/${id}?${range.toString()}`),
    enabled: id !== null,
  });
  const d = detail.data;
  return (
    <Dialog open={id !== null} onClose={onClose} title={name || 'Student'} wide>
      {detail.isPending && <Spinner />}
      {detail.isError && <Alert tone="bad">{errorMessage(detail.error)}</Alert>}
      {d && (
        <div className="grid gap-5 text-sm">
          <p className="text-muted">
            {d.student.email}
            {d.student.cohorts.length > 0 && ` · ${d.student.cohorts.join(', ')}`} · joined{' '}
            {new Date(d.student.joinedAt).toLocaleDateString('en-IN')} · last active{' '}
            {timeAgo(d.student.lastActiveAt)}
          </p>

          <section className="grid gap-2">
            <h3 className="text-[14px]">
              Day by day, {fmtDay(d.range.from)} to {fmtDay(d.range.to)}
            </h3>
            {d.days.length === 0 ? (
              <p className="text-muted">Not active in this range.</p>
            ) : (
              <Table minWidth={560}>
                <thead>
                  <tr>
                    <Th>Day</Th>
                    <Th className="text-right">Pages</Th>
                    <Th className="text-right">Learning</Th>
                    <Th className="text-right">Quiz</Th>
                    <Th className="text-right">Practice</Th>
                    <Th className="text-right">Finished</Th>
                  </tr>
                </thead>
                <tbody>
                  {d.days.map((day) => (
                    <tr key={day.day}>
                      <Td>{fmtWeekday(day.day)}</Td>
                      <Td className="text-right font-mono">{day.visits}</Td>
                      <Td className="text-right font-mono">
                        {day.learnMinutes ? minutes(day.learnMinutes) : '–'}
                      </Td>
                      <Td className="text-right font-mono">
                        {day.quizAnswers ? `${day.quizRight}/${day.quizAnswers}` : '–'}
                      </Td>
                      <Td className="text-right font-mono">{day.practiceSolves || '–'}</Td>
                      <Td className="text-right font-mono">{day.lessonsCompleted || '–'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>

          <section className="grid gap-2">
            <h3 className="text-[14px]">Units</h3>
            {d.lessons.length === 0 ? (
              <p className="text-muted">No unit opened yet.</p>
            ) : (
              <ul className="grid gap-1.5">
                {d.lessons.map((l) => (
                  <li
                    key={`${l.topic}/${l.title}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg border border-line px-3 py-2"
                  >
                    <span>
                      <b>{l.title}</b> <span className="text-muted">· {l.topic}</span>
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {l.status === 'COMPLETED'
                        ? `finished ${l.completedAt ? new Date(l.completedAt).toLocaleDateString('en-IN') : ''}`
                        : `${l.stepsDone} ${l.stepsDone === 1 ? 'step' : 'steps'} done`}{' '}
                      · {minutes(l.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid gap-2">
            <h3 className="text-[14px]">Latest activity</h3>
            {d.recent.length === 0 ? (
              <p className="text-muted">Nothing recorded yet.</p>
            ) : (
              <ol className="grid max-h-64 gap-0.5 overflow-y-auto pr-1">
                {d.recent.map((r, i) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: a log, newest first
                    key={i}
                    className="grid grid-cols-[9.5rem_10rem_minmax(0,1fr)] gap-2 border-line border-b py-1 text-[13px]"
                  >
                    <span className="font-mono text-xs text-muted">
                      {new Date(r.at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>
                      {KIND_LABEL[r.kind]}
                      {r.kind === 'QUIZ_ANSWER' && (r.value ? ' · right' : ' · wrong')}
                      {r.kind === 'LESSON_STEP' &&
                        r.value > 0 &&
                        ` · ${r.value < 60 ? 'under 1 min' : `${Math.round(r.value / 60)} min`}`}
                    </span>
                    <span className="truncate font-mono text-xs text-ink-2" title={r.target ?? ''}>
                      {r.target ?? ''}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </Dialog>
  );
}

/** The student table as shown (filters and sort applied), plus the daily totals, as one CSV. */
function downloadCsv(a: AnalyticsResponse, students: AnalyticsStudent[]) {
  const cell = (v: string | number) => {
    const s = String(v);
    // Quote everything, and keep a cell from being read as a spreadsheet formula.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replaceAll('"', '""')}"`;
  };
  const rows: Array<Array<string | number>> = [
    [
      'Name',
      'Email',
      'Cohorts',
      'Joined',
      'Last active',
      'Active days',
      'Pages opened',
      'Learning minutes',
      'Lesson steps',
      'Quiz answers',
      'Quiz right',
      'Practice opened',
      'Concept videos',
      'Units finished in range',
      'Units started',
      'Units done',
      ...a.daily.map((d) => d.day),
    ],
    ...students.map((s) => [
      s.fullName,
      s.email,
      s.cohorts.join('; '),
      s.joinedAt.slice(0, 10),
      s.lastActiveAt ?? '',
      s.activeDays,
      s.visits,
      s.learnMinutes,
      s.steps,
      s.quizAnswers,
      s.quizRight,
      s.practiceSolves,
      s.conceptViews,
      s.lessonsCompleted,
      s.unitsStarted,
      s.unitsDone,
      ...a.daily.map((d) => (s.days.includes(d.day) ? 1 : 0)),
    ]),
  ];
  const csv = rows.map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `student-activity-${a.range.from}-to-${a.range.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
