import type { GoalResponse, SchedulePreviewResponse } from '@app/contracts';
import { Alert, Button, Card, Dialog, errorMessage, fromApiError, Spinner } from '@app/ui';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { PlanTimeline } from '../../features/goal/PlanTimeline';
import {
  BracketPicker,
  RoleBadge,
  RolePicker,
  ScheduleEditor,
  type ScheduleValue,
  SkillRater,
} from '../../features/goal/pickers';
import { api } from '../../lib/api';
import { useDebounced } from '../../lib/hooks';
import { setGoal, useCatalog, useGoal } from '../../lib/queries';

export function PlanPage() {
  const goal = useGoal();
  const catalog = useCatalog();
  if (goal.isPending || catalog.isPending) return <Spinner />;
  if (goal.isError || catalog.isError)
    return <Alert tone="bad">{errorMessage(goal.error ?? catalog.error)}</Alert>;
  if (!goal.data.goal) return <Alert tone="warn">Set your goal first.</Alert>;

  return (
    <div className="grid max-w-3xl gap-6 animate-rise">
      <header>
        <span className="eyebrow">My plan</span>
        <h1 className="mt-1.5 text-[clamp(24px,2.6vw,30px)]">Your target and your time</h1>
        <p className="mt-1.5 text-muted">Change anything. Your progress is never lost.</p>
      </header>
      <TargetCard />
      <ScheduleCard />
      <SkillsCard />
    </div>
  );
}

function TargetCard() {
  const { data } = useGoal();
  const { data: catalog } = useCatalog();
  const g = data?.goal;
  const [open, setOpen] = useState(false);
  const [roleId, setRoleId] = useState(g?.role.id);
  const [bracketId, setBracketId] = useState(g?.bracket.id);
  const change = useMutation({
    mutationFn: () => api.post<GoalResponse>('/student/goal/target', { roleId, bracketId }),
    onSuccess: (r) => {
      setGoal(r);
      setOpen(false);
    },
  });
  if (!g || !catalog) return null;
  const changed = roleId !== g.role.id || bracketId !== g.bracket.id;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RoleBadge code={g.role.shortCode} color={g.role.colorKey} size={44} />
          <div>
            <div className="eyebrow">Target</div>
            <b className="text-[17px]">
              {g.role.title} · <span className="font-display">{g.bracket.label}</span>
            </b>
          </div>
        </div>
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
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Change your target" wide>
        <div className="grid gap-6">
          <section>
            <h3 className="mb-3 text-[15px]">Role</h3>
            <RolePicker roles={catalog.roles} value={roleId} onChange={setRoleId} />
          </section>
          <section>
            <h3 className="mb-3 text-[15px]">Target package</h3>
            <BracketPicker brackets={catalog.brackets} value={bracketId} onChange={setBracketId} />
          </section>
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
