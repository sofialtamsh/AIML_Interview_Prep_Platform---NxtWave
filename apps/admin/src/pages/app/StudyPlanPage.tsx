import {
  type AdminStudyPlanResponse,
  type DeadlineRule,
  type PlanPreview,
  type SaveStudyPlanBody,
  type SaveStudyPlanResponse,
  STUDY_PLAN_MESSAGE_MAX,
  type StudyPlan,
  type StudyPlanPreviewResponse,
} from '@app/contracts';
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  cn,
  errorMessage,
  fromApiError,
  Spinner,
  TextArea,
} from '@app/ui';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { CalendarCheck, Megaphone, TriangleAlert } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { PageHeader, timeAgo } from '../../components/table';
import { api, queryClient } from '../../lib/api';

const KEY = ['admin', 'study-plan'] as const;
const MINUTES = [30, 45, 60, 90, 120];
const WEEKDAYS = [
  { day: 1, short: 'Mon' },
  { day: 2, short: 'Tue' },
  { day: 3, short: 'Wed' },
  { day: 4, short: 'Thu' },
  { day: 5, short: 'Fri' },
  { day: 6, short: 'Sat' },
  { day: 0, short: 'Sun' },
];

const DATE = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const formatDate = (iso: string) => DATE.format(new Date(`${iso}T00:00:00Z`));
const todayIso = () => new Intl.DateTimeFormat('en-CA').format(new Date());
const plusDays = (iso: string, n: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function StudyPlanPage() {
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => api.get<AdminStudyPlanResponse>('/study-plan'),
  });
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 animate-rise">
      <PageHeader
        eyebrow="Students"
        title="Study plan"
        sub="One plan for every student: how long to study each day, on which days, by when, and a note from the team. Students see it on their Home and My plan pages."
      />
      {query.isPending && <Spinner />}
      {query.isError && <Alert tone="bad">{errorMessage(query.error)}</Alert>}
      {query.data && <Editor data={query.data} />}
    </div>
  );
}

function Editor({ data }: { data: AdminStudyPlanResponse }) {
  const [plan, setPlan] = useState<StudyPlan>(data.plan);
  const [applyToStudents, setApply] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<SaveStudyPlanResponse | null>(null);
  const set = (patch: Partial<StudyPlan>) => setPlan((p) => ({ ...p, ...patch }));
  // After a save (or a refetch), the form shows what is stored.
  useEffect(() => setPlan(data.plan), [data.plan]);

  const bracketId = plan.bracketId ?? data.effectiveBracketId;
  const bracket = data.brackets.find((b) => b.id === bracketId);
  const teamDecides = !plan.studentsChooseSchedule || !plan.studentsChoosePackage;
  const dirty = JSON.stringify(plan) !== JSON.stringify(data.plan);

  const previewInput = useDebounced({
    dailyMinutes: plan.dailyMinutes,
    studyWeekdays: plan.studyWeekdays,
    deadline: plan.deadline,
    bracketId,
  });
  const preview = useQuery({
    queryKey: [...KEY, 'preview', previewInput],
    queryFn: () => api.post<StudyPlanPreviewResponse>('/study-plan/preview', previewInput),
    enabled: previewInput.studyWeekdays.length > 0 && previewInput.dailyMinutes >= 15,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const save = useMutation({
    mutationFn: (body: SaveStudyPlanBody) => api.put<SaveStudyPlanResponse>('/study-plan', body),
    onSuccess: (r) => {
      setErrors({});
      setSaved(r);
      queryClient.setQueryData(KEY, r);
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });

  function submit() {
    const movingPackage =
      applyToStudents && !plan.studentsChoosePackage && bracketId !== data.effectiveBracketId;
    if (
      movingPackage &&
      !window.confirm(
        `Move every student to ${bracket?.label ?? 'this package'}? Their roadmap restarts on that track. Everything they have learned still counts.`,
      )
    ) {
      return;
    }
    save.mutate({ ...plan, applyToStudents: teamDecides && applyToStudents });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        <Section
          title="Daily target"
          sub="How long students study on each study day, and which days."
        >
          <div className="flex flex-wrap items-center gap-2">
            {MINUTES.map((m) => (
              <Chip
                key={m}
                selected={plan.dailyMinutes === m}
                onClick={() => set({ dailyMinutes: m })}
              >
                {m < 60
                  ? `${m} min`
                  : m % 60
                    ? `${Math.floor(m / 60)} h ${m % 60} min`
                    : `${m / 60} h`}
              </Chip>
            ))}
            <label className="ml-1 flex items-center gap-2 text-[13px] text-muted">
              or
              <input
                type="number"
                min={15}
                max={600}
                step={5}
                value={plan.dailyMinutes}
                onChange={(e) => set({ dailyMinutes: Number(e.target.value) || 0 })}
                className="w-20 rounded-[10px] border border-line-2 bg-surface px-2.5 py-1.5 font-mono text-sm text-ink"
                aria-label="Minutes per study day"
              />
              min
            </label>
          </div>
          {errors.dailyMinutes && <FieldError>{errors.dailyMinutes}</FieldError>}
          <fieldset className="mt-4 flex min-w-0 flex-wrap gap-2">
            <legend className="sr-only">Study days</legend>
            {WEEKDAYS.map((w) => {
              const on = plan.studyWeekdays.includes(w.day);
              return (
                <Chip
                  key={w.day}
                  selected={on}
                  onClick={() =>
                    set({
                      studyWeekdays: on
                        ? plan.studyWeekdays.filter((d) => d !== w.day)
                        : [...plan.studyWeekdays, w.day].sort((a, b) => a - b),
                    })
                  }
                >
                  {w.short}
                </Chip>
              );
            })}
          </fieldset>
          {plan.studyWeekdays.length === 0 && <FieldError>Pick at least one study day.</FieldError>}
          <p className="mt-3 text-[13px] text-ink-2">
            That is <b>{formatMinutes(plan.dailyMinutes * plan.studyWeekdays.length)}</b> a week.
          </p>
        </Section>

        <Section title="Deadline" sub="When students should finish the roadmap.">
          <DeadlinePicker
            value={plan.deadline}
            onChange={(deadline) => set({ deadline })}
            error={errors['deadline.date']}
          />
        </Section>

        <Section
          title="Note to students"
          sub="Shown at the top of their Home page and on My plan. Keep it short and specific."
        >
          <TextArea
            label="Message"
            rows={3}
            maxLength={STUDY_PLAN_MESSAGE_MAX}
            value={plan.message ?? ''}
            onChange={(e) => set({ message: e.target.value || null })}
            placeholder="Give this 1 hour every day, Monday to Saturday. Finish your roadmap in 30 days and you will be ready for your first interview round."
            hint={`${(plan.message ?? '').length}/${STUDY_PLAN_MESSAGE_MAX}`}
            error={errors.message}
          />
          {plan.message?.trim() && (
            <div className="mt-3">
              <div className="eyebrow mb-1.5">What students see</div>
              <div className="flex gap-3 rounded-[var(--radius-card)] border border-brand/25 bg-brand-soft px-4 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink">
                  <Megaphone className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <span className="eyebrow text-brand-deep">From your mentors</span>
                  <p className="mt-0.5 text-[14.5px] whitespace-pre-line text-ink">
                    {plan.message.trim()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Section>

        <Section
          title="Package"
          sub="The depth students learn at. Students don't see the package while they don't pick it."
        >
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Package">
            {data.brackets.map((b) => {
              const on = b.id === bracketId;
              const ready = b.totalMinutes !== null;
              return (
                // biome-ignore lint/a11y/useSemanticElements: a described option card cannot be a native radio input
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!ready}
                  onClick={() => set({ bracketId: b.id })}
                  className={cn(
                    'rounded-xl border-[1.5px] p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
                    on ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-2',
                  )}
                >
                  <b className="font-display text-lg">{b.label}</b>
                  <span className="block text-[13px] text-ink-2">{b.headline}</span>
                  <span className="mt-1.5 block font-mono text-[12px] text-muted">
                    {ready
                      ? `${data.role?.title ?? 'Track'}: ${formatMinutes(b.totalMinutes ?? 0)} of study`
                      : `No ${data.role?.title ?? ''} curriculum published yet`}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.bracketId && <FieldError>{errors.bracketId}</FieldError>}
        </Section>

        <Section
          title="What students choose themselves"
          sub="Off: the picker is hidden from students and this plan applies to everyone. The pickers are kept, so you can turn them on later."
        >
          <div className="divide-y divide-line">
            <Switch
              label="Students choose their own study time"
              description="Minutes per day, study days and deadline in onboarding and My plan."
              checked={plan.studentsChooseSchedule}
              onChange={(v) => set({ studentsChooseSchedule: v })}
            />
            <Switch
              label="Students choose their target package"
              description="The package step in onboarding and the package shown on Home and Roadmap."
              checked={plan.studentsChoosePackage}
              onChange={(v) => set({ studentsChoosePackage: v })}
            />
          </div>
        </Section>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-6">
        <PreviewCard
          data={data}
          preview={preview.data?.preview}
          loading={preview.isFetching}
          plan={plan}
          bracketLabel={bracket?.label}
          onUseMinutes={(m) => set({ dailyMinutes: m })}
        />
        <Card className="p-5">
          <h2 className="text-[15px]">Save</h2>
          {teamDecides ? (
            <label className="mt-3 flex items-start gap-2.5 text-[13.5px]">
              <input
                type="checkbox"
                checked={applyToStudents}
                onChange={(e) => setApply(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--brand)]"
              />
              <span>
                Also update the <b>{data.activeStudents}</b> student
                {data.activeStudents === 1 ? '' : 's'} who already have a plan. Their roadmap is
                re-planned from today; progress is kept.
              </span>
            </label>
          ) : (
            <p className="mt-2 text-[13px] text-muted">
              Students choose their own time and package, so this plan only fills in the defaults
              for new students.
            </p>
          )}
          <Button
            className="mt-4"
            block
            loading={save.isPending}
            disabled={plan.studyWeekdays.length === 0}
            onClick={submit}
          >
            {teamDecides && applyToStudents ? 'Save and apply' : 'Save study plan'}
          </Button>
          {save.isError && Object.keys(errors).length === 0 && (
            <div className="mt-3">
              <Alert tone="bad">{errorMessage(save.error)}</Alert>
            </div>
          )}
          {saved && !dirty && (
            <div className="mt-3">
              <Alert tone="ok">
                Saved.
                {saved.applied &&
                  ` ${saved.applied.updated} plan${saved.applied.updated === 1 ? '' : 's'} updated${
                    saved.applied.movedPackage
                      ? `, ${saved.applied.movedPackage} moved to the new package`
                      : ''
                  }.`}
              </Alert>
            </div>
          )}
          <p className="mt-3 text-[12px] text-muted">
            {data.updatedAt
              ? `Last saved ${timeAgo(data.updatedAt)}${data.updatedBy ? ` by ${data.updatedBy}` : ''}`
              : 'Not saved yet: students choose their own time and package until you save.'}
          </p>
        </Card>
      </aside>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-base">{title}</h2>
      <p className="mt-1 text-[13px] text-muted">{sub}</p>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[13px] font-medium text-bad">{children}</p>;
}

function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <b className="text-sm">{label}</b>
        <p className="text-[13px] text-muted">{description}</p>
        <span className="mt-1 inline-block">
          <Badge tone={checked ? 'ok' : 'neutral'}>
            {checked ? 'Students choose' : 'Hidden · team decides'}
          </Badge>
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
          checked ? 'bg-brand' : 'bg-surface-3',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-surface shadow transition',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

function DeadlinePicker({
  value,
  onChange,
  error,
}: {
  value: DeadlineRule;
  onChange: (v: DeadlineRule) => void;
  error?: string;
}) {
  const today = todayIso();
  const modes: Array<{ mode: DeadlineRule['mode']; label: string }> = [
    { mode: 'NONE', label: 'No deadline' },
    { mode: 'DAYS_AFTER_START', label: 'Days after joining' },
    { mode: 'DATE', label: 'Fixed date' },
  ];
  return (
    <div className="grid gap-3">
      <fieldset className="flex min-w-0 flex-wrap gap-2">
        <legend className="sr-only">Deadline</legend>
        {modes.map((m) => (
          <Chip
            key={m.mode}
            selected={value.mode === m.mode}
            onClick={() =>
              onChange(
                m.mode === 'NONE'
                  ? { mode: 'NONE' }
                  : m.mode === 'DATE'
                    ? {
                        mode: 'DATE',
                        date: value.mode === 'DATE' ? value.date : plusDays(today, 30),
                      }
                    : {
                        mode: 'DAYS_AFTER_START',
                        days: value.mode === 'DAYS_AFTER_START' ? value.days : 30,
                      },
              )
            }
          >
            {m.label}
          </Chip>
        ))}
      </fieldset>
      {value.mode === 'DAYS_AFTER_START' && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Each student finishes
          <input
            type="number"
            min={7}
            max={365}
            value={value.days}
            onChange={(e) =>
              onChange({ mode: 'DAYS_AFTER_START', days: Number(e.target.value) || 7 })
            }
            className="w-20 rounded-[10px] border border-line-2 bg-surface px-2.5 py-1.5 font-mono text-sm"
            aria-label="Days after joining"
          />
          days after they start. Fair for students who join late.
        </label>
      )}
      {value.mode === 'DATE' && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Everyone finishes by
          <input
            type="date"
            min={plusDays(today, 1)}
            value={value.date}
            onChange={(e) => e.target.value && onChange({ mode: 'DATE', date: e.target.value })}
            className="rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 text-sm"
            aria-label="Deadline date"
          />
        </label>
      )}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function PreviewCard({
  data,
  preview,
  loading,
  plan,
  bracketLabel,
  onUseMinutes,
}: {
  data: AdminStudyPlanResponse;
  preview: PlanPreview | null | undefined;
  loading: boolean;
  plan: StudyPlan;
  bracketLabel?: string;
  onUseMinutes: (m: number) => void;
}) {
  const days = WEEKDAYS.filter((w) => plan.studyWeekdays.includes(w.day))
    .map((w) => w.short)
    .join(', ');
  return (
    <Card className={cn('p-5', loading && 'opacity-70')}>
      <div className="flex items-center gap-2">
        <CalendarCheck className="size-4 text-brand" aria-hidden />
        <h2 className="text-[15px]">How it plays out</h2>
      </div>
      {!data.role ? (
        <p className="mt-2 text-sm text-muted">No role is open yet. Open one in Catalog.</p>
      ) : preview === null ? (
        <div className="mt-3">
          <Alert tone="warn">
            {data.role.title} has no published curriculum for {bracketLabel ?? 'this package'} yet.
          </Alert>
        </div>
      ) : !preview ? (
        <div className="mt-3">
          <Spinner label="Working out the timeline" />
        </div>
      ) : (
        <div className="mt-3 grid gap-3 text-[14px] text-ink-2">
          <p>
            The <b className="text-ink">{data.role.title}</b> track
            {bracketLabel ? ` (${bracketLabel})` : ''} needs about{' '}
            <b className="text-ink">{formatMinutes(preview.proposed.totalMinutes)}</b> of study
            across {preview.proposed.subtopics} subtopics.
          </p>
          <p>
            At <b className="text-ink">{plan.dailyMinutes} min</b> on {days}, a student who starts
            today finishes in <b className="text-ink">{preview.weeks.length} weeks</b>
            {preview.proposed.plannedEndDate && (
              <>
                , by <b className="text-ink">{formatDate(preview.proposed.plannedEndDate)}</b>
              </>
            )}
            .
          </p>
          {preview.feasibility && !preview.feasibility.feasible ? (
            <div className="grid gap-2 rounded-xl bg-warn-bg px-3.5 py-3 text-[13.5px] text-warn">
              <span className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {`Runs ${preview.feasibility.daysOver} day${preview.feasibility.daysOver === 1 ? '' : 's'} past the deadline (${formatDate(preview.feasibility.deadline)}).`}
              </span>
              {preview.paces
                .filter((p) => p.studyWeekdays.join() === [...plan.studyWeekdays].sort().join())
                .slice(0, 2)
                .map((p) => (
                  <Button
                    key={p.key}
                    size="sm"
                    variant="secondary"
                    onClick={() => onUseMinutes(p.dailyMinutes)}
                  >
                    Use {p.dailyMinutes} min a day
                    {p.plannedEndDate ? ` · done ${formatDate(p.plannedEndDate)}` : ''}
                  </Button>
                ))}
            </div>
          ) : preview.daysToSpare !== null ? (
            <p className="rounded-xl bg-ok-bg px-3.5 py-3 text-[13.5px] text-ok">
              {preview.daysToSpare} day{preview.daysToSpare === 1 ? '' : 's'} to spare before the
              deadline, for revision and mock interviews.
            </p>
          ) : null}
          <p className="text-[12.5px] text-muted">
            The longest case: students who rate themselves confident move faster through basics.
            Practice time is included.
          </p>
        </div>
      )}
    </Card>
  );
}
