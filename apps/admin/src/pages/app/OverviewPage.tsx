import type { AdminOverview } from '@app/contracts';
import { Alert, Card, errorMessage, Spinner } from '@app/ui';
import { useQuery } from '@tanstack/react-query';
import { api, useAdminMe } from '../../lib/api';

export function OverviewPage() {
  const { data: me } = useAdminMe();
  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get<AdminOverview>('/overview'),
  });
  const o = overview.data;

  return (
    <div className="grid gap-6 animate-rise">
      <header>
        <span className="eyebrow">Overview</span>
        <h1 className="mt-1.5 text-[clamp(22px,2.4vw,28px)]">
          Hello, {me?.fullName.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">Live numbers from the platform database.</p>
      </header>

      {overview.isPending && <Spinner />}
      {overview.isError && <Alert tone="bad">{errorMessage(overview.error)}</Alert>}
      {o && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Kpi label="Students" value={o.students.total} />
            <Kpi
              label="Goal set"
              value={o.students.onboarded}
              sub={pct(o.students.onboarded, o.students.total)}
            />
            <Kpi
              label="Email verified"
              value={o.students.verified}
              sub={pct(o.students.verified, o.students.total)}
            />
            <Kpi label="Joined · 7 days" value={o.students.joinedLast7Days} />
            <Kpi label="Active · 7 days" value={o.students.activeLast7Days} />
            <Kpi label="Active admins" value={o.admins} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Breakdown title="Students by target role" rows={o.byRole} />
            <Breakdown title="Students by target package" rows={o.byBracket} />
          </div>
        </>
      )}
    </div>
  );
}

function pct(a: number, b: number) {
  return b === 0 ? '–' : `${Math.round((a / b) * 100)}% of students`;
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-1.5 font-display text-[28px] font-bold tracking-tight tabular-nums">
        {value.toLocaleString('en-IN')}
      </div>
      {sub && <div className="text-[12.5px] text-muted">{sub}</div>}
    </Card>
  );
}

function Breakdown({ title, rows }: { title: string; rows: AdminOverview['byRole'] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="p-5">
      <h2 className="text-[15px]">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No goals set yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-[120px_1fr_48px] items-center gap-3 text-sm">
              <span className="truncate">{r.label}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </span>
              <b className="text-right font-mono tabular-nums">{r.count}</b>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
