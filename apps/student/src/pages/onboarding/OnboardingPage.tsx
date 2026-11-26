import type {
  GoalResponse,
  OnboardingDraft,
  OnboardingPlanPreviewResponse,
  StudentStudyPlan,
} from '@app/contracts';
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
import { dayRange, MentorNote, PlanFacts } from '../../features/goal/StudyPlan';
import { formatDate } from '../../features/roadmap/parts';
import { api, useMe } from '../../lib/api';
import { SELF_PACED } from '../../lib/features';
import { useDebounced } from '../../lib/hooks';
import { setGoal, useCatalog, useOnboarding, useStudyPlan } from '../../lib/queries';

/**
 * Steps by id: 0 role · 1 package · 2 self-check · 3 time · 4 review. The package and time steps
 * only show while students choose them (see the study plan); otherwise the team's plan applies.
 */
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
  SELF_PACED
    ? { title: "Here's your setup", sub: 'Looks right? Then start learning, at your own pace.' }
    : { title: "Here's your setup", sub: 'Looks right? We will turn it into your personal plan.' },
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
  const studyPlan = useStudyPlan();
  // Only students who arrive already onboarded are sent home. Finishing here must still
  // show the celebration screen even though `me` refreshes to onboardingCompleted = true.
  const [arrivedOnboarded] = useState(() => me.data?.onboardingCompleted === true);

  if (arrivedOnboarded) return <Navigate to="/" replace />;
  if (catalog.isPending || onboarding.isPending || studyPlan.isPending) return <FullPageSpinner />;
  if (catalog.isError || onboarding.isError || studyPlan.isError) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <Alert tone="bad">
          {errorMessage(catalog.error ?? onboarding.error ?? studyPlan.error)}
        </Alert>
      </div>
    );
  }
  return <Flow draft={onboarding.data.draft} plan={studyPlan.data} />;
}

function Flow({ draft, plan }: { draft: OnboardingDraft; plan: StudentStudyPlan }) {
  const { data: catalog } = useCatalog();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const choosePackage = plan.studentsChoosePackage;
  const chooseSchedule = plan.studentsChooseSchedule;
  const visible = useMemo(
    () => [0, ...(choosePackage ? [1] : []), 2, ...(chooseSchedule ? [3] : []), 4],
    [choosePackage, chooseSchedule],
  );

  const roles = catalog?.roles ?? [];
  const brackets = catalog?.brackets ?? [];
  const liveRoles = roles.filter((r) => r.availability === 'LIVE');
  const [step, setStep] = useState(
    () => visible.find((s) => s >= Math.min(draft.step ?? 0, 4)) ?? 4,
  );
  // With one open role, it is already picked. A saved pick that has since closed is dropped.
  const [roleId, setRoleId] = useState(() =>
    liveRoles.some((r) => r.id === draft.roleId)
      ? draft.roleId
      : liveRoles.length === 1
        ? liveRoles[0]?.id
        : undefined,
  );
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

  // The schedule the plan will use: the student's own, or the team's.
  const effectiveSchedule: ScheduleValue = chooseSchedule
    ? schedule
    : {
        dailyMinutes: plan.dailyMinutes,
        studyWeekdays: plan.studyWeekdays,
        deadline: plan.deadlineIfStartedToday,
      };

  // Live "how long will this take?" for the time and review steps. Saves nothing.
  const previewInput = useDebounced({
    roleId,
    skills,
    ...(choosePackage ? { bracketId } : {}),
    ...(chooseSchedule ? { schedule } : {}),
  });
  const preview = useQuery({
    queryKey: ['onboarding-preview', previewInput],
    queryFn: () =>
      api.post<OnboardingPlanPreviewResponse>('/student/onboarding/plan-preview', previewInput),
    enabled:
      (chooseSchedule ? step >= 3 : step === 4) &&
      Boolean(previewInput.roleId) &&
      (!choosePackage || Boolean(previewInput.bracketId)) &&
      (!chooseSchedule || schedule.studyWeekdays.length > 0),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const timeline = preview.data?.preview;

  // Each step remounts its heading (key={step}); focusing it on mount guides keyboard and screen-reader users.
  const focusHeading = useCallback((el: HTMLHeadingElement | null) => el?.focus(), []);

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
    (step === 4 && Boolean(role) && (!choosePackage || Boolean(bracket)));

  const at = visible.indexOf(step);
  const go = (to: number) => setStep(visible.find((s) => s >= to) ?? 4);

  async function next() {
    setMessage(null);
    if (step < 4) {
      const nextStep = visible[at + 1] ?? 4;
      setStep(nextStep);
      // Save progress in the background; a failure here must not block the student.
      void api
        .put('/student/onboarding', { step: nextStep, roleId, bracketId, skills, schedule })
        .catch(() => undefined);
      return;
    }
    if (!roleId) return;
    setBusy(true);
    try {
      const goal = await api.post<GoalResponse>('/student/onboarding/complete', {
        roleId,
        skills,
        ...(choosePackage ? { bracketId } : {}),
        ...(chooseSchedule ? { schedule } : {}),
      });
      setGoal(goal);
      setDone(goal);
    } catch (err) {
      const { fields, message } = fromApiError(err);
      setErrors(fields);
      setMessage(message ?? 'Please check your choices.');
      const keys = Object.keys(fields);
      if (choosePackage && keys.includes('bracketId')) setStep(1);
      else if (
        chooseSchedule &&
        keys.some(
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
      <Shell index={visible.length} total={visible.length - 1}>
        <div className="grid justify-items-center gap-5 py-10 text-center animate-rise">
          <span className="grid size-16 place-items-center rounded-2xl bg-ok-bg text-ok">
            <PartyPopper className="size-8" aria-hidden />
          </span>
          <h1 className="text-[clamp(26px,3.4vw,38px)]">
            You're all set, {me?.fullName.split(' ')[0]}! 🎉
          </h1>
          {SELF_PACED ? (
            <p className="max-w-[52ch] text-ink-2">
              Target: <b>{done.goal.role.title}</b>. Open the Learn tab and start with the first
              unit. There is no schedule: go at your own pace, and your progress is saved as you go.
            </p>
          ) : (
            <p className="max-w-[52ch] text-ink-2">
              Target: <b>{done.goal.role.title}</b>
              {choosePackage && (
                <>
                  {' '}
                  · <b>{done.goal.bracket.label}</b>
                </>
              )}
              . Your plan runs on <b>{formatHours(done.goal.weeklyMinutes)}</b> a week
              {timeline?.proposed.plannedEndDate ? (
                <>
                  {' '}
                  and finishes by <b>{formatDate(timeline.proposed.plannedEndDate)}</b>
                </>
              ) : null}
              .
            </p>
          )}
          <Button size="lg" onClick={() => navigate('/', { replace: true })}>
            {SELF_PACED ? 'Go to Learn' : 'Take me to my home'}{' '}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </Shell>
    );
  }

  const s = STEPS[step] ?? STEPS[0];
  const sub =
    step === 0 && liveRoles.length === 1
      ? `We're starting with ${liveRoles[0]?.title}. More roles are on the way: tap "Notify me" on any you want and we'll tell you when it opens.`
      : s.sub;
  return (
    <Shell index={at} total={visible.length - 1}>
      <div key={step} className="animate-rise">
        <h1 ref={focusHeading} tabIndex={-1} className="text-[clamp(24px,3vw,34px)] outline-none">
          {s.title}
        </h1>
        <p className="mt-2 max-w-[60ch] text-ink-2">{sub}</p>

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
                  preview={timeline}
                  loading={preview.isFetching}
                  schedule={schedule}
                  onPick={setSchedule}
                />
              )}
            </>
          )}
          {step === 4 && role && (
            <Review
              role={role}
              bracket={choosePackage && bracket ? bracket : null}
              areas={areas}
              skills={skills}
              schedule={chooseSchedule ? schedule : null}
              plan={plan}
              onEdit={go}
            />
          )}
          {step === 4 && !SELF_PACED && (
            <PlanTimeline
              preview={timeline}
              loading={preview.isFetching}
              schedule={effectiveSchedule}
            />
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
          onClick={() => setStep(visible[Math.max(0, at - 1)] ?? 0)}
          disabled={at <= 0}
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Button>
        <Button size="lg" onClick={next} disabled={!canContinue} loading={busy}>
          {step === 4 ? (
            <>
              <Sparkles className="size-4" aria-hidden />{' '}
              {SELF_PACED ? 'Start learning' : 'Build my plan'}
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

/** `index` counts the visible steps before review; `total` of them; past `total` is done. */
function Shell({
  index,
  total,
  children,
}: {
  index: number;
  total: number;
  children: React.ReactNode;
}) {
  const pct = Math.min(100, (Math.min(index, total) / total) * 100);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-15 max-w-3xl items-center justify-between gap-4 px-4">
          <Logo subtitle="Interview Prep" />
          <span className="font-mono text-xs text-muted">
            {index < total ? `Step ${index + 1} of ${total}` : index === total ? 'Review' : 'Done'}
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
  step?: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="eyebrow">{label}</div>
        <div className="mt-1.5">{children}</div>
      </div>
      {step !== undefined && (
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="text-sm font-semibold text-brand hover:underline"
        >
          Edit
        </button>
      )}
    </div>
  );
}

function Review({
  role,
  bracket,
  areas,
  skills,
  schedule,
  plan,
  onEdit,
}: {
  role: { title: string; shortCode: string; colorKey: Parameters<typeof RoleBadge>[0]['color'] };
  /** Null while the team places students in a package. */
  bracket: { label: string; headline: string } | null;
  areas: Array<{ id: string; name: string }>;
  skills: Record<string, number>;
  /** Null while the team sets the study time. */
  schedule: ScheduleValue | null;
  plan: StudentStudyPlan;
  onEdit: (step: number) => void;
}) {
  const days = schedule
    ? WEEKDAYS.filter((w) => schedule.studyWeekdays.includes(w.day)).map((w) => w.short)
    : [];
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <ReviewRow label="Role" step={0} onEdit={onEdit}>
        <span className="flex items-center gap-3">
          <RoleBadge code={role.shortCode} color={role.colorKey} size={32} />
          <b>{role.title}</b>
        </span>
      </ReviewRow>
      {bracket && (
        <ReviewRow label="Target package" step={1} onEdit={onEdit}>
          <b className="font-display text-lg">{bracket.label}</b>{' '}
          <span className="text-sm text-muted">· {bracket.headline}</span>
        </ReviewRow>
      )}
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
      {SELF_PACED ? null : schedule ? (
        <ReviewRow label="Time" step={3} onEdit={onEdit}>
          <span className="text-[15px]">
            <b>{schedule.dailyMinutes} min</b> on {days.join(', ')} ·{' '}
            {schedule.deadline
              ? `deadline ${new Date(`${schedule.deadline}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : 'no fixed deadline'}
          </span>
        </ReviewRow>
      ) : (
        <ReviewRow label="Your study plan · set by your mentors" onEdit={onEdit}>
          <div className="grid gap-3">
            <p className="text-[14px] text-ink-2">
              <b>{plan.dailyMinutes} min</b> a day, {dayRange(plan.studyWeekdays)}. Same plan for
              everyone in your batch, so you all move together.
            </p>
            <PlanFacts
              dailyMinutes={plan.dailyMinutes}
              studyWeekdays={plan.studyWeekdays}
              deadline={plan.deadlineIfStartedToday}
            />
            {plan.message && <MentorNote message={plan.message} />}
          </div>
        </ReviewRow>
      )}
    </div>
  );
}
