import type { GoalResponse, SchedulePreviewResponse, StudentStudyPlan } from '@app/contracts';
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  Card,
  cn,
  Dialog,
  errorMessage,
  fromApiError,
  Spinner,
} from '@app/ui';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PlanTimeline } from '../../features/goal/PlanTimeline';
import {
  BracketPicker,
  RoleBadge,
  RolePicker,
  ScheduleEditor,
  type ScheduleValue,
  SkillRater,
} from '../../features/goal/pickers';
import { MentorNote, PlanFacts } from '../../features/goal/StudyPlan';
import { api } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { setGoal, useCatalog, useGoal, useStudyPlan } from '../../lib/queries';

export function PlanPage() {
  const goal = useGoal();
  const catalog = useCatalog();
  const studyPlan = useStudyPlan();
  if (goal.isPending || catalog.isPending || studyPlan.isPending) return <Spinner />;
  if (goal.isError || catalog.isError || studyPlan.isError)
    return <Alert tone="bad">{errorMessage(goal.error ?? catalog.error ?? studyPlan.error)}</Alert>;
  if (!goal.data.goal) return <Alert tone="warn">Set your goal first.</Alert>;
  const plan = studyPlan.data;

  return (
    <div className="grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6 animate-rise">
      <header>
        <span className="eyebrow">My plan</span>
        <h1 className="mt-1.5 text-[clamp(24px,2.6vw,30px)]">
          {plan.studentsChooseSchedule ? 'Your target and your time' : 'Your study plan'}
        </h1>
        <p className="mt-1.5 text-muted">
          {plan.studentsChooseSchedule
            ? 'Change anything. Your progress is never lost.'
            : 'Set by your mentors, the same for everyone in your batch. Show up on every study day and your roadmap does the rest.'}
        </p>
      </header>
      <TargetCard plan={plan} />
      {plan.studentsChooseSchedule ? <ScheduleCard /> : <StudyPlanCard plan={plan} />}
      <SkillsCard />
    </div>
  );
}

function TargetCard({ plan }: { plan: StudentStudyPlan }) {
  const { data } = useGoal();
  const { data: catalog } = useCatalog();
  const g = data?.goal;
  const choosePackage = plan.studentsChoosePackage;
  const [open, setOpen] = useState(false);
  const [roleId, setRoleId] = useState(g?.role.id);
  const [bracketId, setBracketId] = useState(g?.bracket.id);
  const change = useMutation({
    mutationFn: () =>
      api.post<GoalResponse>('/student/goal/target', {
        roleId,
        ...(choosePackage ? { bracketId } : {}),
      }),
    onSuccess: (r) => {
      setGoal(r);
      setOpen(false);
    },
  });
  if (!g || !catalog) return null;
  const liveRoles = catalog.roles.filter((r) => r.availability === 'LIVE').length;
  // Nothing to switch to while there is one open role and the team picks the package.
  const canChange = choosePackage || liveRoles > 1;
  const changed = roleId !== g.role.id || (choosePackage && bracketId !== g.bracket.id);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RoleBadge code={g.role.shortCode} color={g.role.colorKey} size={44} />
          <div>
            <div className="eyebrow">Target</div>
            <b className="text-[17px]">
              {g.role.title}
              {choosePackage && (
                <>
                  {' '}
                  · <span className="font-display">{g.bracket.label}</span>
                </>
              )}
            </b>
          </div>
        </div>
        {canChange ? (
          <Button
            variant="secondary"
            onClick={() => {
              setRoleId(g.role.id);
              setBracketId(g.bracket.id);
              setOpen(true);
            }}
          >
            Change target
          </Button>
        ) : (
          <span className="text-[13px] text-muted">More roles open soon</span>
        )}
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Change your target" wide>
        <div className="grid gap-6">
          <section>
            <h3 className="mb-3 text-[15px]">Role</h3>
            <RolePicker roles={catalog.roles} value={roleId} onChange={setRoleId} />
          </section>
          {choosePackage && (
            <section>
              <h3 className="mb-3 text-[15px]">Target package</h3>
              <BracketPicker
                brackets={catalog.brackets}
                value={bracketId}
                onChange={setBracketId}
              />
            </section>
          )}
          <Alert tone="info">
            A new target starts a fresh plan. Your old target stays in your history, and anything
            you have learned still counts.
          </Alert>
          {change.isError && <Alert tone="bad">{errorMessage(change.error)}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!changed} loading={change.isPending} onClick={() => change.mutate()}>
              Switch target
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

/** The team's plan, read-only: their note, the daily target and how the roadmap plays out. */
function StudyPlanCard({ plan }: { plan: StudentStudyPlan }) {
  const { data } = useGoal();
  const g = data?.goal;
  const schedule = useMemo<ScheduleValue | null>(
    () =>
      g
        ? { dailyMinutes: g.dailyMinutes, studyWeekdays: g.studyWeekdays, deadline: g.deadline }
        : null,
    [g],
  );
  const preview = useQuery({
    queryKey: ['schedule-preview', schedule],
    queryFn: () => api.post<SchedulePreviewResponse>('/student/roadmap/preview-schedule', schedule),
    enabled: Boolean(schedule && schedule.studyWeekdays.length > 0),
    placeholderData: keepPreviousData,
    retry: false,
  });
  if (!g || !schedule) return null;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base">Your daily target</h2>
        <Badge tone="next">Set by your mentors</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Small, steady sessions beat weekend marathons. Missed a day? Re-plan from today on your
        roadmap and pick up where you left off.
      </p>
      {plan.message && <MentorNote message={plan.message} className="mt-4" />}
      <div className="mt-4">
        <PlanFacts
          dailyMinutes={g.dailyMinutes}
          studyWeekdays={g.studyWeekdays}
          deadline={g.deadline}
          daysToDeadline={g.daysToDeadline}
        />
      </div>
      <PlanTimeline preview={preview.data} loading={preview.isFetching} schedule={schedule} />
      <Link to="/roadmap" className={cn(buttonClass('secondary', 'sm'), 'mt-5')}>
        See it day by day <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </Card>
  );
}

function ScheduleCard() {
  const { data } = useGoal();
  const g = data?.goal;
  const initial = useMemo<ScheduleValue | null>(
    () =>
      g
        ? { dailyMinutes: g.dailyMinutes, studyWeekdays: g.studyWeekdays, deadline: g.deadline }
        : null,
    [g],
  );
  const [value, setValue] = useState<ScheduleValue | null>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setValue(initial), [initial]);

  const save = useMutation({
    mutationFn: (v: ScheduleValue) => api.put<GoalResponse>('/student/goal/schedule', v),
    onSuccess: (r) => {
      setErrors({});
      setGoal(r);
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });
  const debounced = useDebounced(value);
  const preview = useQuery({
    queryKey: ['schedule-preview', debounced],
    queryFn: () =>
      api.post<SchedulePreviewResponse>('/student/roadmap/preview-schedule', debounced),
    enabled: Boolean(debounced && debounced.studyWeekdays.length > 0),
    placeholderData: keepPreviousData,
    retry: false,
  });
  if (!value || !initial) return null;
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  const cur = preview.data?.current?.plannedEndDate;
  const next = preview.data?.proposed.plannedEndDate;
  const shift = cur && next ? Math.round((Date.parse(next) - Date.parse(cur)) / 86_400_000) : null;

  return (
    <Card className="p-6">
      <h2 className="text-base">Your time</h2>
      <p className="mt-1 text-sm text-muted">
        Tell us when you can study. We work out how long your prep takes and suggest a pace.
      </p>
      <div className="mt-4">
        <ScheduleEditor value={value} onChange={setValue} errors={errors} />
      </div>
      {value.studyWeekdays.length > 0 && (
        <PlanTimeline
          preview={preview.data}
          loading={preview.isFetching}
          schedule={value}
          onPick={setValue}
        />
      )}
      {dirty && shift !== null && shift !== 0 && (
        <p className="mt-3 text-[13px] font-medium text-ink-2">
          Compared with your current plan, you would finish {Math.abs(shift)} day
          {Math.abs(shift) === 1 ? '' : 's'} {shift < 0 ? 'earlier' : 'later'}.
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          disabled={!dirty || value.studyWeekdays.length === 0}
          loading={save.isPending}
          onClick={() => save.mutate(value)}
        >
          Save and re-plan
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setValue(initial)}>
            Undo changes
          </Button>
        )}
        {save.isSuccess && !dirty && (
          <span className="text-sm font-medium text-ok">Saved ✓ Your roadmap is re-planned.</span>
        )}
        {save.isError && Object.keys(errors).length === 0 && (
          <span className="text-sm font-medium text-bad">{errorMessage(save.error)}</span>
        )}
      </div>
    </Card>
  );
}

function SkillsCard() {
  const { data } = useGoal();
  const { data: catalog } = useCatalog();
  const initial = useMemo(
    () => Object.fromEntries((data?.skills ?? []).map((s) => [s.skillAreaId, s.level])),
    [data],
  );
  const [value, setValue] = useState<Record<string, number>>(initial);
  useEffect(() => setValue(initial), [initial]);
  const save = useMutation({
    mutationFn: (skills: Record<string, number>) =>
      api.put<GoalResponse>('/student/skills', { skills }),
    onSuccess: (r) => setGoal(r),
  });
  const descriptions = new Map(catalog?.skillAreas.map((a) => [a.id, a.description]));
  const areas = (data?.skills ?? []).map((s) => ({
    id: s.skillAreaId,
    name: s.name,
    description: descriptions.get(s.skillAreaId),
  }));
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);

  return (
    <Card className="p-6">
      <h2 className="text-base">Self-check</h2>
      <p className="mt-1 text-sm text-muted">
        Update it as you grow. It tunes how fast we go through basics.
      </p>
      <div className="mt-4">
        <SkillRater areas={areas} value={value} onChange={setValue} />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(value)}>
          Save self-check
        </Button>
        {save.isSuccess && !dirty && <span className="text-sm font-medium text-ok">Saved ✓</span>}
      </div>
    </Card>
  );
}
