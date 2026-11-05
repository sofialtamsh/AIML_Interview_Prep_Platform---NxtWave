import type { GoalResponse, OnboardingDraft, OnboardingPlanPreviewResponse } from '@app/contracts';
import { Alert, Button, errorMessage, FullPageSpinner, fromApiError, Logo } from '@app/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, PartyPopper, Sparkles } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { PlanTimeline } from '../../features/goal/PlanTimeline';
import {
  BracketPicker,
  formatHours,
  LEVELS,
  RoleBadge,
  RolePicker,
  ScheduleEditor,
  type ScheduleValue,
  SkillRater,
  WEEKDAYS,
} from '../../features/goal/pickers';
import { formatDate } from '../../features/roadmap/parts';
import { api, useMe } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { setGoal, useCatalog, useOnboarding } from '../../lib/queries';

const STEPS = [
  {
    title: 'What role are you preparing for?',
    sub: 'We build everything around it. You can change it later.',
  },
  {
    title: 'What package are you aiming for?',
    sub: 'This is your target salary, not a fee 🙂. It decides how deep we go on each topic.',
  },
  {
    title: 'Quick self-check',
    sub: 'Be honest, there are no wrong answers. It only changes how fast we move through the basics, never what you learn.',
  },
  {
    title: 'How much time do you have?',
    sub: 'We fit your plan around your week, not the other way round, and show you how long your prep will take.',
  },
  { title: "Here's your setup", sub: 'Looks right? We will turn it into your personal plan.' },
] as const;

const DEFAULT_SCHEDULE: ScheduleValue = {
  dailyMinutes: 60,
  studyWeekdays: [1, 2, 3, 4, 5, 6],
  deadline: null,
};

export function OnboardingPage() {
  const me = useMe();
  const catalog = useCatalog();
  const onboarding = useOnboarding();
  // Only students who arrive already onboarded are sent home. Finishing here must still
  // show the celebration screen even though `me` refreshes to onboardingCompleted = true.
  const [arrivedOnboarded] = useState(() => me.data?.onboardingCompleted === true);

  if (arrivedOnboarded) return <Navigate to="/" replace />;
  if (catalog.isPending || onboarding.isPending) return <FullPageSpinner />;
  if (catalog.isError || onboarding.isError) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <Alert tone="bad">{errorMessage(catalog.error ?? onboarding.error)}</Alert>
      </div>
    );
  }
  return <Flow draft={onboarding.data.draft} />;
}

function Flow({ draft }: { draft: OnboardingDraft }) {
  const { data: catalog } = useCatalog();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [step, setStep] = useState(Math.min(draft.step ?? 0, 4));
  const [roleId, setRoleId] = useState(draft.roleId);
  const [bracketId, setBracketId] = useState(draft.bracketId);
  const [skills, setSkills] = useState<Record<string, number>>(draft.skills ?? {});
  const [schedule, setSchedule] = useState<ScheduleValue>({
    ...DEFAULT_SCHEDULE,
    ...draft.schedule,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<GoalResponse | null>(null);
  // Live "how long will this take?" for the time and review steps. Saves nothing.
  const previewInput = useDebounced({ roleId, bracketId, skills, schedule });
  const preview = useQuery({
    queryKey: ['onboarding-preview', previewInput],
    queryFn: () =>
      api.post<OnboardingPlanPreviewResponse>('/student/onboarding/plan-preview', previewInput),
    enabled:
      step >= 3 &&
      Boolean(previewInput.roleId && previewInput.bracketId) &&
      previewInput.schedule.studyWeekdays.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const plan = preview.data?.preview;

  // Each step remounts its heading (key={step}); focusing it on mount guides keyboard and screen-reader users.
  const focusHeading = useCallback((el: HTMLHeadingElement | null) => el?.focus(), []);

  const roles = catalog?.roles ?? [];
  const brackets = catalog?.brackets ?? [];
  const role = roles.find((r) => r.id === roleId);
  const bracket = brackets.find((b) => b.id === bracketId);
  const areas = useMemo(() => {
    if (!role || !catalog) return [];
    const byId = new Map(catalog.skillAreas.map((a) => [a.id, a]));
    return role.skillAreas
      .map((s) => byId.get(s.skillAreaId))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, [role, catalog]);

  const canContinue =
    (step === 0 && Boolean(role && role.availability === 'LIVE')) ||
    (step === 1 && Boolean(bracket && bracket.availability === 'LIVE')) ||
    step === 2 ||
    (step === 3 && schedule.studyWeekdays.length > 0) ||
    step === 4;

  async function next() {
    setMessage(null);
    if (step < 4) {
      const nextStep = step + 1;
      setStep(nextStep);
      // Save progress in the background; a failure here must not block the student.
      void api
        .put('/student/onboarding', { step: nextStep, roleId, bracketId, skills, schedule })
        .catch(() => undefined);
      return;
    }
    if (!roleId || !bracketId) return;
    setBusy(true);
    try {
      const goal = await api.post<GoalResponse>('/student/onboarding/complete', {
        roleId,
        bracketId,
        skills,
        schedule,
      });
      setGoal(goal);
      setDone(goal);
    } catch (err) {
      const { fields, message } = fromApiError(err);
      setErrors(fields);
      setMessage(message ?? 'Please check your schedule.');
      if (
        Object.keys(fields).some(
          (k) => k.includes('dailyMinutes') || k.includes('deadline') || k.includes('Weekdays'),
        )
      ) {
        setStep(3);
      }
    } finally {
      setBusy(false);
    }
  }

  if (done?.goal) {
    return (
      <Shell step={5}>
        <div className="grid justify-items-center gap-5 py-10 text-center animate-rise">
          <span className="grid size-16 place-items-center rounded-2xl bg-ok-bg text-ok">
            <PartyPopper className="size-8" aria-hidden />
          </span>
          <h1 className="text-[clamp(26px,3.4vw,38px)]">
            You're all set, {me?.fullName.split(' ')[0]}! 🎉
          </h1>
          <p className="max-w-[52ch] text-ink-2">
            Target: <b>{done.goal.role.title}</b> · <b>{done.goal.bracket.label}</b>. Your plan runs
            on <b>{formatHours(done.goal.weeklyMinutes)}</b> a week
            {plan?.proposed.plannedEndDate ? (
              <>
                {' '}
                and finishes by <b>{formatDate(plan.proposed.plannedEndDate)}</b>
              </>
            ) : null}
            .
          </p>
          <Button size="lg" onClick={() => navigate('/', { replace: true })}>
            Take me to my home <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </Shell>
    );
  }

  const s = STEPS[step] ?? STEPS[0];
  return (
    <Shell step={step}>
      <div key={step} className="animate-rise">
        <h1 ref={focusHeading} tabIndex={-1} className="text-[clamp(24px,3vw,34px)] outline-none">
          {s.title}
        </h1>
        <p className="mt-2 max-w-[60ch] text-ink-2">{s.sub}</p>

        <div className="mt-7">
          {step === 0 && <RolePicker roles={roles} value={roleId} onChange={setRoleId} />}
          {step === 1 && (
            <BracketPicker brackets={brackets} value={bracketId} onChange={setBracketId} />
          )}
          {step === 2 && <SkillRater areas={areas} value={skills} onChange={setSkills} />}
          {step === 3 && (
            <>
              <ScheduleEditor value={schedule} onChange={setSchedule} errors={errors} />
              {schedule.studyWeekdays.length > 0 && (
                <PlanTimeline
                  preview={plan}
                  loading={preview.isFetching}
                  schedule={schedule}
                  onPick={setSchedule}
                />
              )}
            </>
          )}
          {step === 4 && role && bracket && (
            <Review
              role={role}
              bracketLabel={bracket.label}
              bracketHeadline={bracket.headline}
              areas={areas}
              skills={skills}
              schedule={schedule}
              onEdit={setStep}
            />
          )}
          {step === 4 && (
            <PlanTimeline preview={plan} loading={preview.isFetching} schedule={schedule} />
          )}
        </div>

        {message && (
          <div className="mt-5">
            <Alert tone="bad">{message}</Alert>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-8 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-bg/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
        <Button
          variant="ghost"
          onClick={() => setStep((v) => Math.max(0, v - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Button>
        <Button size="lg" onClick={next} disabled={!canContinue} loading={busy}>
          {step === 4 ? (
            <>
              <Sparkles className="size-4" aria-hidden /> Build my plan
            </>
          ) : step === 2 && Object.keys(skills).length === 0 ? (
            'Skip for now'
          ) : (
            <>
              Continue <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ step, children }: { step: number; children: React.ReactNode }) {
  const pct = Math.min(100, (Math.min(step, 4) / 4) * 100);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-15 max-w-3xl items-center justify-between gap-4 px-4">
          <Logo subtitle="Interview Prep" />
          <span className="font-mono text-xs text-muted">
            {step < 4 ? `Step ${step + 1} of 4` : step === 4 ? 'Review' : 'Done'}
          </span>
        </div>
        <div className="h-1 bg-surface-3" aria-hidden>
          <div
            className="h-full bg-brand transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}

function ReviewRow({
  label,
  step,
  onEdit,
  children,
}: {
  label: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 last:border-0">
      <div className="min-w-0">
        <div className="eyebrow">{label}</div>
        <div className="mt-1.5">{children}</div>
      </div>
      <button
        type="button"
        onClick={() => onEdit(step)}
        className="text-sm font-semibold text-brand hover:underline"
      >
        Edit
      </button>
    </div>
  );
}

function Review({
  role,
  bracketLabel,
  bracketHeadline,
  areas,
  skills,
  schedule,
  onEdit,
}: {
  role: { title: string; shortCode: string; colorKey: Parameters<typeof RoleBadge>[0]['color'] };
  bracketLabel: string;
  bracketHeadline: string;
  areas: Array<{ id: string; name: string }>;
  skills: Record<string, number>;
  schedule: ScheduleValue;
  onEdit: (step: number) => void;
}) {
  const days = WEEKDAYS.filter((w) => schedule.studyWeekdays.includes(w.day)).map((w) => w.short);
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <ReviewRow label="Role" step={0} onEdit={onEdit}>
        <span className="flex items-center gap-3">
          <RoleBadge code={role.shortCode} color={role.colorKey} size={32} />
          <b>{role.title}</b>
        </span>
      </ReviewRow>
      <ReviewRow label="Target package" step={1} onEdit={onEdit}>
        <b className="font-display text-lg">{bracketLabel}</b>{' '}
        <span className="text-sm text-muted">· {bracketHeadline}</span>
      </ReviewRow>
      <ReviewRow label="Self-check" step={2} onEdit={onEdit}>
        <div className="flex flex-wrap gap-2">
          {areas.map((a) => {
            const l = LEVELS[skills[a.id] ?? 0];
            return (
              <span key={a.id} className="rounded-lg bg-surface-2 px-2.5 py-1 text-[13px]">
                {l?.emoji} {a.name} <span className="text-muted">· {l?.label}</span>
              </span>
            );
          })}
        </div>
      </ReviewRow>
      <ReviewRow label="Time" step={3} onEdit={onEdit}>
        <span className="text-[15px]">
          <b>{schedule.dailyMinutes} min</b> on {days.join(', ')} ·{' '}
          {schedule.deadline
            ? `deadline ${new Date(`${schedule.deadline}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'no fixed deadline'}
        </span>
      </ReviewRow>
    </div>
  );
}
