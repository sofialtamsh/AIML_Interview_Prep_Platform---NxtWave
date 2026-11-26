import type {
  CoverageEvidence,
  CoverageFlag,
  CoverageLessonState,
  CoverageResponse,
  CoverageSignal,
  CoverageUnit,
} from '@app/contracts';
import {
  Alert,
  Badge,
  type BadgeTone,
  Card,
  Chip,
  cn,
  EmptyState,
  errorMessage,
  SelectField,
  Spinner,
} from '@app/ui';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Info,
  Lock,
  type LucideIcon,
  OctagonAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PageHeader, Tabs } from '../../components/table';
import { api, useAdminMe } from '../../lib/api';

const pct = (share: number) => `${Math.round(share * 100)}%`;
const num = (n: number) => n.toLocaleString('en-IN');

const STATE: Record<CoverageLessonState, { label: string; tone: BadgeTone }> = {
  LIVE: { label: 'Live', tone: 'live' },
  IN_REVIEW: { label: 'In review', tone: 'warn' },
  IN_PROGRESS: { label: 'Draft', tone: 'next' },
  NOT_STARTED: { label: 'Not started', tone: 'planned' },
};

const SIGNAL: Record<CoverageSignal['tone'], { Icon: LucideIcon; className: string }> = {
  bad: { Icon: OctagonAlert, className: 'text-bad' },
  warn: { Icon: CircleAlert, className: 'text-warn' },
  info: { Icon: Info, className: 'text-brand' },
  ok: { Icon: CircleCheck, className: 'text-ok' },
};

const FLAG: Record<CoverageFlag, { label: string; tone: BadgeTone }> = {
  NO_UNIT: { label: 'No unit', tone: 'bad' },
  NOT_IN_CURRICULUM: { label: 'Not in this curriculum', tone: 'warn' },
  OPTIONAL_ONLY: { label: 'Only optional units', tone: 'warn' },
  NOT_HIGH: { label: 'Not high priority', tone: 'warn' },
};

type UnitFilter = 'all' | 'unwritten' | 'notLive' | 'high';
const UNIT_FILTERS: Array<{ id: UnitFilter; label: string; test: (u: CoverageUnit) => boolean }> = [
  { id: 'all', label: 'All units', test: () => true },
  { id: 'unwritten', label: 'Not written', test: (u) => u.lesson.state === 'NOT_STARTED' },
  { id: 'notLive', label: 'Not live', test: (u) => u.lesson.state !== 'LIVE' },
  { id: 'high', label: 'High priority', test: (u) => u.priority === 'HIGH' },
];

/**
 * Admin → Content coverage: how ready the content is for one role and package. Student activity
 * lives in Overview and Students; this page is about the lessons, practice and the plan.
 */
export function CoveragePage() {
  const { data: me } = useAdminMe();
  const [params, setParams] = useSearchParams();
  const roleId = params.get('role') ?? '';
  const bracketId = params.get('bracket') ?? '';
  const [tab, setTab] = useState<'units' | 'evidence'>('units');

  const coverage = useQuery({
    queryKey: ['admin', 'coverage', roleId, bracketId],
    queryFn: () =>
      api.get<CoverageResponse>(
        `/coverage${roleId && bracketId ? `?roleId=${roleId}&bracketId=${bracketId}` : ''}`,
      ),
  });
  const data = coverage.data;
  const target = data?.target;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 animate-rise">
      <PageHeader
        eyebrow="Content"
        title="Content coverage"
        sub="How ready the content is for one role and package: what students reach and when, what to write and publish next, and how it matches what interviews ask. Student activity is in Overview and Students."
        action={
          data && data.targets.length > 1 && target ? (
            <SelectField
              label="Role and package"
              className="w-full min-w-[15rem] sm:w-auto"
              value={`${target.roleId}:${target.bracketId}`}
              onChange={(e) => {
                const [r = '', b = ''] = e.target.value.split(':');
                setParams({ role: r, bracket: b }, { replace: true });
              }}
              options={data.targets.map((t) => ({
                value: `${t.roleId}:${t.bracketId}`,
                label: `${t.roleTitle} · ${t.bracketLabel} (v${t.curriculumVersion})`,
              }))}
            />
          ) : undefined
        }
      />

      {coverage.isPending && <Spinner />}
      {coverage.isError && <Alert tone="bad">{errorMessage(coverage.error)}</Alert>}
      {data && !target && (
        <Card>
          <EmptyState title="Nothing to measure yet">
            Publish a curriculum in Curriculum, and its coverage appears here.
          </EmptyState>
        </Card>
      )}
      {data && target && (
        <>
          <Signals signals={data.signals} />
          <Kpis data={data} />
          <NextSteps units={data.units} />
          <Tabs
            tabs={[
              { id: 'units' as const, label: `Units (${data.units.length})` },
              ...(data.evidence ? [{ id: 'evidence' as const, label: 'Interview evidence' }] : []),
            ]}
            value={data.evidence ? tab : 'units'}
            onChange={setTab}
          />
          {(tab === 'units' || !data.evidence) && (
            <Units units={data.units} withEvidence={Boolean(data.evidence)} />
          )}
          {tab === 'evidence' && data.evidence && <Evidence evidence={data.evidence} />}
          <p className="flex items-start gap-2 text-[12.5px] text-muted">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Days count study days for a student who starts today on the team's study plan (
              {data.schedule.dailyMinutes} min a day). Planned time comes from the roadmap and
              includes practice; lesson time is measured from the lesson students see.{' '}
              {data.evidenceNote ??
                (me?.role === 'SUPER_ADMIN'
                  ? 'Interview evidence is visible to super admins only and never reaches students.'
                  : '')}
            </span>
          </p>
        </>
      )}
    </div>
  );
}

// ───────────── Signals and numbers ─────────────

function Signals({ signals }: { signals: CoverageSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <Card>
      <h2 className="border-b border-line px-4 py-3 text-[15px] sm:px-5">What needs attention</h2>
      <ul>
        {signals.map((s) => {
          const { Icon, className } = SIGNAL[s.tone];
          return (
            <li
              key={s.title}
              className="flex gap-3 border-b border-line px-4 py-3 last:border-0 sm:px-5"
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', className)} aria-hidden />
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">{s.title}</div>
                <p className="mt-0.5 text-[13px] text-muted">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Kpis({ data }: { data: CoverageResponse }) {
  const s = data.summary;
  const over = s.deadlineStudyDays !== null && s.studyDays > s.deadlineStudyDays;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Kpi
        label="Lessons written"
        value={`${s.written}/${s.units}`}
        part={s.units ? s.written / s.units : 0}
        note={`${s.notStarted} not started`}
      />
      <Kpi
        label="Live for students"
        value={`${s.live}/${s.units}`}
        part={s.units ? s.live / s.units : 0}
        note={`${s.inReview} waiting for review`}
      />
      <Kpi
        label="Units with practice"
        value={`${s.withPractice}/${s.units}`}
        part={s.units ? s.withPractice / s.units : 0}
        note="published, tagged questions"
      />
      <Kpi
        label="Roadmap"
        value={`${s.studyDays} days`}
        note={
          s.deadlineStudyDays === null
            ? 'no deadline set'
            : `deadline allows ${s.deadlineStudyDays}${over ? ' · too long' : ''}`
        }
        bad={over}
      />
      {data.evidence ? (
        <Kpi
          label="Interview coverage"
          value={pct(data.evidence.writtenShare)}
          part={data.evidence.writtenShare}
          note={`of questions written · ${pct(data.evidence.liveShare)} live`}
        />
      ) : (
        <Kpi
          label="Lesson time"
          value={`${(s.measuredMinutes / 60).toFixed(1)} h`}
          note={`measured over ${s.measuredUnits} units`}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  part,
  bad = false,
}: {
  label: string;
  value: string;
  note: string;
  part?: number;
  bad?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          'mt-1.5 font-display text-[26px] font-bold tracking-tight tabular-nums',
          bad && 'text-bad',
        )}
      >
        {value}
      </div>
      {part !== undefined && <Bar part={part} />}
      <div className="mt-1 text-[12.5px] text-muted">{note}</div>
    </Card>
  );
}

/** A decorative bar: every bar on the page has its number written next to it. */
function Bar({ part, className }: { part: number; className?: string }) {
  const value = Math.round(Math.min(1, Math.max(0, part)) * 100);
  return (
    <div
      aria-hidden
      className={cn('mt-2 h-2 overflow-hidden rounded-full bg-surface-3', className)}
    >
      <span className="block h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
    </div>
  );
}

// ───────────── Write next / publish next ─────────────

function NextSteps({ units }: { units: CoverageUnit[] }) {
  const core = units.filter((u) => !u.optional);
  const write = [...core, ...units.filter((u) => u.optional)]
    .filter((u) => u.lesson.state === 'NOT_STARTED')
    .slice(0, 6);
  const publish = units
    .filter((u) => u.lesson.state === 'IN_REVIEW' || u.lesson.state === 'IN_PROGRESS')
    .slice(0, 6);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ShortList
        title="Write next"
        sub="Lessons not started, in the order students reach them."
        empty="Every unit has a lesson."
        units={write}
      />
      <ShortList
        title="Publish next"
        sub="Written lessons students can't open yet, in roadmap order."
        empty="Nothing is waiting: every written lesson is live."
        units={publish}
      />
    </div>
  );
}

function ShortList({
  title,
  sub,
  empty,
  units,
}: {
  title: string;
  sub: string;
  empty: string;
  units: CoverageUnit[];
}) {
  return (
    <Card>
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-[15px]">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>
      </div>
      {units.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted sm:px-5">{empty}</p>
      ) : (
        <ul>
          {units.map((u) => (
            <li key={u.subtopicId} className="border-b border-line last:border-0">
              <Link
                to={`/lessons/${u.subtopicId}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 sm:px-5"
              >
                <DayTag day={u.startDay} />
                {/* The row cannot wrap, so the title truncates at every width. */}
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{u.title}</span>
                {u.priority === 'HIGH' && <Badge tone="bad">High</Badge>}
                {u.lesson.state !== 'NOT_STARTED' && <LessonBadge unit={u} />}
                <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DayTag({ day }: { day: number | null }) {
  return (
    <span className="w-14 shrink-0 font-mono text-[11.5px] font-semibold text-muted tabular-nums">
      {day ? `Day ${day}` : '–'}
    </span>
  );
}

function LessonBadge({ unit }: { unit: CoverageUnit }) {
  const { state, liveVersion, workingVersion } = unit.lesson;
  const { label, tone } = STATE[state];
  const version = state === 'LIVE' ? liveVersion : workingVersion;
  return (
    <Badge tone={tone} dot={state === 'LIVE'}>
      {version ? `${label} v${version}` : label}
    </Badge>
  );
}

// ───────────── Units ─────────────

function Units({ units, withEvidence }: { units: CoverageUnit[]; withEvidence: boolean }) {
  const [filter, setFilter] = useState<UnitFilter>('all');
  const groups = useMemo(() => {
    const test = UNIT_FILTERS.find((f) => f.id === filter)?.test ?? (() => true);
    const out: Array<{ topicId: string; title: string; units: CoverageUnit[] }> = [];
    for (const u of units) {
      if (!test(u)) continue;
      const g = out.find((x) => x.topicId === u.topicId);
      if (g) g.units.push(u);
      else out.push({ topicId: u.topicId, title: u.topicTitle, units: [u] });
    }
    return out;
  }, [units, filter]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <fieldset className="flex min-w-0 flex-wrap gap-2">
        <legend className="sr-only">Filter units</legend>
        {UNIT_FILTERS.map((f) => (
          <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} ({units.filter(f.test).length})
          </Chip>
        ))}
      </fieldset>
      {groups.length === 0 && <p className="text-sm text-muted">No units match this filter.</p>}
      {groups.map((g) => {
        const written = g.units.filter((u) => u.lesson.state !== 'NOT_STARTED').length;
        return (
          <Card key={g.topicId} className="overflow-hidden">
            <h3 className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5 font-sans text-[14px] font-semibold tracking-normal">
              {g.title}
              <span className="font-mono text-[11.5px] font-medium text-muted">
                {written}/{g.units.length} written
              </span>
            </h3>
            <ul>
              {g.units.map((u) => (
                <UnitRow key={u.subtopicId} unit={u} withEvidence={withEvidence} />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function UnitRow({ unit: u, withEvidence }: { unit: CoverageUnit; withEvidence: boolean }) {
  return (
    <li className="border-b border-line last:border-0">
      <Link
        to={`/lessons/${u.subtopicId}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-surface-2"
      >
        <DayTag day={u.startDay} />
        <div className="min-w-[12rem] flex-1">
          <div className="font-semibold">{u.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
            <Badge
              tone={u.priority === 'HIGH' ? 'bad' : u.priority === 'MEDIUM' ? 'neutral' : 'planned'}
            >
              {u.priority.toLowerCase()}
            </Badge>
            <span>{u.depth.name}</span>
            {u.optional && <span>· optional</span>}
            <span>
              ·{' '}
              {u.lesson.minutes !== null
                ? `${u.lesson.minutes} min lesson, ${u.plannedMinutes} min planned`
                : `${u.plannedMinutes} min planned`}
            </span>
            <span>
              · {u.practice} practice {u.practice === 1 ? 'question' : 'questions'}
            </span>
          </div>
        </div>
        {withEvidence && u.evidence && (
          <div
            className="w-36 shrink-0"
            title={`Asked by ${u.evidence.companies} companies in this band: ${u.evidence.themes.join(', ')}`}
          >
            <div className="flex justify-between font-mono text-[11px] text-muted">
              <span>asked</span>
              <span className="font-semibold text-ink-2">{pct(u.evidence.share)}</span>
            </div>
            <Bar part={u.evidence.share} className="mt-1" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 lg:w-[19rem] lg:justify-end">
          <LessonBadge unit={u} />
          {u.lesson.state === 'LIVE' && u.lesson.workingVersion && (
            <Badge tone="warn">v{u.lesson.workingVersion} waiting</Badge>
          )}
          {u.lesson.olderFormat && <Badge tone="neutral">Older format</Badge>}
        </div>
        <ArrowRight className="size-4 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

// ───────────── Interview evidence (super admins) ─────────────

function Evidence({ evidence: e }: { evidence: CoverageEvidence }) {
  const band = e.band === 'UNDER_8_LPA' ? 'under 8 LPA' : '8 LPA and above';
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <p className="text-[13px] text-muted">
        ML and AI job titles {band}, {e.dataFrom} to {e.dataTo}: {num(e.companies)} companies,{' '}
        {num(e.questions)} questions. Bars show the share of these companies that asked at least one
        question of the kind. Unit chips show where each one is taught and how far its lesson is.
      </p>
      <EvidenceCard
        title="Interview themes"
        rows={e.themes.map((t) => ({ ...t, label: t.theme }))}
      />
      <EvidenceCard
        title="Interview formats"
        sub="The kind of task, from the question and coding type. Conceptual questions are covered by the themes."
        rows={e.formats}
      />
      <Card>
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-[15px]">Outside the curriculum</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {num(e.outside.questions)} questions from {e.outside.companies} companies match no
            theme, often web or full-stack topics. Grouped by the dashboard's own topic.{' '}
            <Link to="/hiring" className="font-semibold text-brand hover:underline">
              Read them in Hiring data
            </Link>
            .
          </p>
        </div>
        <ul>
          {e.outside.groups.map((g) => (
            <li key={g.label} className="border-b border-line px-4 py-3 last:border-0 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{g.label}</span>
                <span className="font-mono text-[11.5px] text-muted">
                  {g.domain} · {g.companies} {g.companies === 1 ? 'company' : 'companies'} ·{' '}
                  {g.questions} q
                </span>
              </div>
              <p className="mt-0.5 text-[13px] text-muted">{g.example}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

type EvidenceRowData =
  | CoverageEvidence['formats'][number]
  | (CoverageEvidence['themes'][number] & { label: string });

function EvidenceCard({
  title,
  sub,
  rows,
}: {
  title: string;
  sub?: string;
  rows: EvidenceRowData[];
}) {
  return (
    <Card>
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-[15px]">{title}</h2>
        {sub && <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>}
      </div>
      <ul>
        {rows.map((r) => (
          <li
            key={r.label}
            className="grid gap-2 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[minmax(0,15rem)_9rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-5"
          >
            <div className="min-w-0">
              <div className="font-semibold">{r.label}</div>
              {r.flag && (
                <div className="mt-1">
                  <Badge tone={FLAG[r.flag].tone}>{FLAG[r.flag].label}</Badge>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between font-mono text-[11px] text-muted">
                <span>
                  {r.companies} cos · {r.questions} q
                </span>
                <span className="font-semibold text-ink-2">{pct(r.share)}</span>
              </div>
              <Bar part={r.share} className="mt-1" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.units.length === 0 && <span className="text-[12.5px] text-muted">No unit</span>}
              {r.units.map((u) => (
                <Link
                  key={u.subtopicId}
                  to={`/lessons/${u.subtopicId}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[12px] hover:border-brand',
                    !u.inCurriculum && 'opacity-60',
                  )}
                  title={
                    u.inCurriculum
                      ? `${STATE[u.state].label}${u.optional ? ' · optional' : ''}`
                      : 'Not in this curriculum'
                  }
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      u.state === 'LIVE'
                        ? 'bg-ok'
                        : u.state === 'IN_REVIEW'
                          ? 'bg-warn'
                          : u.state === 'IN_PROGRESS'
                            ? 'bg-brand'
                            : 'bg-line-2',
                    )}
                    aria-hidden
                  />
                  {u.title}
                  {u.optional && <span className="text-muted">(optional)</span>}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
