/**
 * Roadmap planner: a pure function (no I/O) that turns a curriculum + a student's time into a
 * dated, ordered plan. Design: docs/05-personalization-engine.md §2–3.
 *
 *   order  → topological sort over subtopic and topic prerequisites (stable tie-breaks)
 *   size   → minutes from depth × complexity, fast-tracked by self-rating, + practice allowance
 *   pack   → fill each study day up to the daily minutes
 *   check  → deadline feasibility with explicit options (never a silent change)
 */
import { addDays, daysBetween, weekdayOf } from '../../lib/dates.ts';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PlanItemInput {
  subtopicId: string;
  topicId: string;
  topicSort: number;
  subtopicSort: number;
  priority: Priority;
  targetDepthRank: number;
  isOptional: boolean;
  /** 1 (light) … 5 (heavy). */
  complexity: number;
  estimateOverride: number | null;
  /** Student's self-rating for the topic's skill area: 0 new … 3 confident. */
  skillLevel: number;
}

export interface PlanInput {
  items: PlanItemInput[];
  /** [subtopic, prerequisite subtopic] */
  subtopicPrereqs: Array<[string, string]>;
  /** [topic, prerequisite topic] */
  topicPrereqs: Array<[string, string]>;
  completed: ReadonlySet<string>;
  dailyMinutes: number;
  studyWeekdays: number[];
  startDate: string;
  deadline: string | null;
  /** Practice time added on top of lesson time (0.25 = +25%). */
  practiceAllowance?: number;
  /** Leave optional items out (a choice the student makes when time is short). */
  skipOptional?: boolean;
}

export interface PlannedItem
  extends Omit<
    PlanItemInput,
    'estimateOverride' | 'skillLevel' | 'complexity' | 'topicSort' | 'subtopicSort'
  > {
  sequence: number;
  estimatedMinutes: number;
  fastTrack: boolean;
  done: boolean;
  plannedStart: string | null;
  plannedEnd: string | null;
}

export interface Feasibility {
  feasible: boolean;
  deadline: string;
  /** Positive when the plan finishes after the deadline. */
  daysOver: number;
  options: {
    /** Daily minutes needed to finish by the deadline on the same days (null if > max). */
    increaseDailyTo: number | null;
    extendDeadlineTo: string;
    skipOptional: { minutesSaved: number; endDate: string | null; fits: boolean } | null;
    addStudyDay: { weekday: number; endDate: string; fits: boolean } | null;
  };
}

export interface Plan {
  items: PlannedItem[];
  totalMinutes: number;
  remainingMinutes: number;
  studyDays: number;
  weeklyMinutes: number;
  plannedEndDate: string | null;
  feasibility: Feasibility | null;
  /** Minutes per study day, in order. */
  days: DayAllocation[];
}

export class CurriculumCycleError extends Error {
  constructor(readonly subtopicIds: string[]) {
    super('The prerequisites form a cycle.');
  }
}

/** Base lesson minutes per depth rank (refined by real content length from Phase 4). */
const DEPTH_MINUTES: Record<number, number> = { 1: 25, 2: 40, 3: 60, 4: 90, 5: 120 };
const COMPLEXITY_FACTOR: Record<number, number> = { 1: 0.8, 2: 0.9, 3: 1, 4: 1.2, 5: 1.4 };
/** Confident or comfortable students get the basics as quick refreshers. */
const FAST_TRACK_FACTOR: Record<number, number> = { 0: 1, 1: 1, 2: 0.85, 3: 0.7 };
const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
export const MAX_DAILY_MINUTES = 600;
const MAX_PLAN_DAYS = 3 * 366;

const ceil5 = (n: number) => Math.max(5, Math.ceil(n / 5) * 5);

export function estimateMinutes(
  i: Pick<PlanItemInput, 'targetDepthRank' | 'complexity' | 'estimateOverride' | 'skillLevel'>,
  practiceAllowance = 0.25,
) {
  if (i.estimateOverride && i.estimateOverride > 0) return ceil5(i.estimateOverride);
  const base = DEPTH_MINUTES[i.targetDepthRank] ?? 60;
  const complexity = COMPLEXITY_FACTOR[i.complexity] ?? 1;
  const fast = FAST_TRACK_FACTOR[i.skillLevel] ?? 1;
  return ceil5(base * complexity * fast * (1 + practiceAllowance));
}

/** Kahn's algorithm. Prerequisites outside the plan are ignored; ties keep topics together. */
export function orderItems(
  input: Pick<PlanInput, 'items' | 'subtopicPrereqs' | 'topicPrereqs'>,
): PlanItemInput[] {
  const byId = new Map(input.items.map((i) => [i.subtopicId, i]));
  const needs = new Map<string, Set<string>>(input.items.map((i) => [i.subtopicId, new Set()]));
  for (const [s, pre] of input.subtopicPrereqs) {
    if (byId.has(s) && byId.has(pre) && s !== pre) needs.get(s)?.add(pre);
  }
  for (const [topic, preTopic] of input.topicPrereqs) {
    const later = input.items.filter((i) => i.topicId === topic);
    const earlier = input.items.filter((i) => i.topicId === preTopic);
    for (const l of later) for (const e of earlier) needs.get(l.subtopicId)?.add(e.subtopicId);
  }

  const key = (i: PlanItemInput) =>
    [i.topicSort, PRIORITY_RANK[i.priority], i.subtopicSort, i.subtopicId] as const;
  const cmp = (a: PlanItemInput, b: PlanItemInput) => {
    const ka = key(a);
    const kb = key(b);
    for (let n = 0; n < ka.length; n++) {
      const x = ka[n] as number | string;
      const y = kb[n] as number | string;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  };

  const remaining = new Map([...needs].map(([k, v]) => [k, new Set(v)]));
  const ordered: PlanItemInput[] = [];
  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter(([, deps]) => deps.size === 0)
      .map(([id]) => byId.get(id) as PlanItemInput)
      .sort(cmp);
    const next = ready[0];
    if (!next) throw new CurriculumCycleError([...remaining.keys()]);
    ordered.push(next);
    remaining.delete(next.subtopicId);
    for (const deps of remaining.values()) deps.delete(next.subtopicId);
  }
  return ordered;
}

/** One study day: which subtopics get how many minutes. */
export interface DayAllocation {
  date: string;
  items: Array<{ subtopicId: string; minutes: number }>;
}

/**
 * Packs work onto study days in order, filling each day up to the daily minutes.
 * Returns each item's first and last day, and the minutes per day (for week and calendar views).
 */
export function allocateDays(
  work: Array<{ subtopicId: string; minutes: number }>,
  startDate: string,
  dailyMinutes: number,
  weekdays: ReadonlySet<number>,
) {
  const spans: Array<{ start: string; end: string }> = [];
  const days: DayAllocation[] = [];
  let day = startDate;
  let left = weekdays.has(weekdayOf(day)) ? dailyMinutes : 0;
  let guard = 0;
  const advance = () => {
    day = addDays(day, 1);
    left = weekdays.has(weekdayOf(day)) ? dailyMinutes : 0;
    if (++guard > MAX_PLAN_DAYS) throw new Error('Plan is longer than the supported horizon');
  };
  const record = (subtopicId: string, minutes: number) => {
    let d = days.at(-1);
    if (d?.date !== day) {
      d = { date: day, items: [] };
      days.push(d);
    }
    d.items.push({ subtopicId, minutes });
  };
  for (const w of work) {
    let need = w.minutes;
    while (left === 0) advance();
    const start = day;
    while (need > 0) {
      if (left === 0) advance();
      const used = Math.min(need, left);
      if (used > 0) record(w.subtopicId, used); // non-study days give 0 minutes
      need -= used;
      left -= used;
    }
    spans.push({ start, end: day });
  }
  return { spans, days, endDate: spans.at(-1)?.end ?? null };
}

function countStudyDays(from: string, to: string, weekdays: ReadonlySet<number>) {
  let n = 0;
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1))
    if (weekdays.has(weekdayOf(d))) n++;
  return n;
}

export function buildPlan(input: PlanInput): Plan {
  const allowance = input.practiceAllowance ?? 0.25;
  const weekdays = new Set(input.studyWeekdays);
  if (weekdays.size === 0) throw new Error('At least one study day is required');

  const ordered = orderItems(input).filter((i) => !(input.skipOptional && i.isOptional));
  const sized = ordered.map((i, idx) => ({
    i,
    sequence: idx + 1,
    minutes: estimateMinutes(i, allowance),
    done: input.completed.has(i.subtopicId),
  }));
  const todo = sized.filter((s) => !s.done);
  const { spans, days, endDate } = allocateDays(
    todo.map((s) => ({ subtopicId: s.i.subtopicId, minutes: s.minutes })),
    input.startDate,
    input.dailyMinutes,
    weekdays,
  );

  let k = 0;
  const items: PlannedItem[] = sized.map((s) => {
    const span = s.done ? null : spans[k++];
    return {
      subtopicId: s.i.subtopicId,
      topicId: s.i.topicId,
      priority: s.i.priority,
      targetDepthRank: s.i.targetDepthRank,
      isOptional: s.i.isOptional,
      sequence: s.sequence,
      estimatedMinutes: s.minutes,
      fastTrack: s.i.skillLevel >= 2,
      done: s.done,
      plannedStart: span?.start ?? null,
      plannedEnd: span?.end ?? null,
    };
  });

  const remainingMinutes = todo.reduce((a, s) => a + s.minutes, 0);
  const plan: Plan = {
    items,
    totalMinutes: sized.reduce((a, s) => a + s.minutes, 0),
    remainingMinutes,
    studyDays: endDate ? countStudyDays(input.startDate, endDate, weekdays) : 0,
    weeklyMinutes: input.dailyMinutes * weekdays.size,
    plannedEndDate: endDate,
    feasibility: null,
    days,
  };

  if (input.deadline && endDate) {
    const daysOver = daysBetween(input.deadline, endDate);
    const feasible = daysOver <= 0;
    const availableDays = countStudyDays(input.startDate, input.deadline, weekdays);
    const needed = availableDays > 0 ? ceil5(remainingMinutes / availableDays) : null;

    let skipOptional: Feasibility['options']['skipOptional'] = null;
    const optionalMinutes = todo.filter((s) => s.i.isOptional).reduce((a, s) => a + s.minutes, 0);
    if (!feasible && optionalMinutes > 0 && !input.skipOptional) {
      const without = buildPlan({ ...input, deadline: null, skipOptional: true });
      skipOptional = {
        minutesSaved: optionalMinutes,
        endDate: without.plannedEndDate,
        fits:
          without.plannedEndDate !== null &&
          daysBetween(input.deadline, without.plannedEndDate) <= 0,
      };
    }

    let addStudyDay: Feasibility['options']['addStudyDay'] = null;
    if (!feasible && weekdays.size < 7) {
      for (const wd of [0, 1, 2, 3, 4, 5, 6].filter((d) => !weekdays.has(d))) {
        const alt = buildPlan({ ...input, deadline: null, studyWeekdays: [...weekdays, wd] });
        if (
          alt.plannedEndDate &&
          (!addStudyDay || daysBetween(alt.plannedEndDate, addStudyDay.endDate) > 0)
        ) {
          addStudyDay = {
            weekday: wd,
            endDate: alt.plannedEndDate,
            fits: daysBetween(input.deadline, alt.plannedEndDate) <= 0,
          };
        }
      }
    }

    plan.feasibility = {
      feasible,
      deadline: input.deadline,
      daysOver: Math.max(0, daysOver),
      options: {
        increaseDailyTo:
          needed !== null && needed <= MAX_DAILY_MINUTES
            ? Math.max(needed, input.dailyMinutes)
            : null,
        extendDeadlineTo: endDate,
        skipOptional,
        addStudyDay,
      },
    };
  }
  return plan;
}

// ───────────── Week view ─────────────

export interface WeekPlan {
  /** 1 = the week the plan starts in. Weeks run Monday to Sunday. */
  index: number;
  start: string;
  end: string;
  minutes: number;
  studyDays: number;
  /** In plan order. `finishes` is true in the week an item's last minutes fall. */
  items: Array<{ subtopicId: string; minutes: number; finishes: boolean }>;
}

const mondayOf = (iso: string) => addDays(iso, -((weekdayOf(iso) + 6) % 7));

export function groupByWeek(days: DayAllocation[]): WeekPlan[] {
  const first = days[0];
  if (!first) return [];
  const lastDay = new Map<string, string>();
  for (const d of days) for (const i of d.items) lastDay.set(i.subtopicId, d.date);

  const weeks = new Map<string, WeekPlan>();
  const firstMonday = mondayOf(first.date);
  for (const d of days) {
    const monday = mondayOf(d.date);
    let w = weeks.get(monday);
    if (!w) {
      w = {
        index: Math.round(daysBetween(firstMonday, monday) / 7) + 1,
        start: monday,
        end: addDays(monday, 6),
        minutes: 0,
        studyDays: 0,
        items: [],
      };
      weeks.set(monday, w);
    }
    w.studyDays++;
    for (const i of d.items) {
      w.minutes += i.minutes;
      const existing = w.items.find((x) => x.subtopicId === i.subtopicId);
      if (existing) existing.minutes += i.minutes;
      else w.items.push({ subtopicId: i.subtopicId, minutes: i.minutes, finishes: false });
      if (lastDay.get(i.subtopicId) === d.date) {
        const item = w.items.find((x) => x.subtopicId === i.subtopicId);
        if (item) item.finishes = true;
      }
    }
  }
  return [...weeks.values()];
}

// ───────────── Suggested paces ─────────────

export type PaceKey =
  | 'recommended'
  | 'just-in-time'
  | 'every-day'
  | 'light'
  | 'steady'
  | 'intensive';

export interface Pace {
  key: PaceKey;
  dailyMinutes: number;
  studyWeekdays: number[];
  plannedEndDate: string | null;
  /** Days between finishing and the deadline (null without a deadline). */
  daysToSpare: number | null;
}

const MIN_DAILY = 15;
const STEP = 5;

/** The smallest daily minutes (in steps of 5) that finish by `finishBy` on these days, or null. */
export function minDailyMinutes(input: PlanInput, finishBy: string): number | null {
  const options = (MAX_DAILY_MINUTES - MIN_DAILY) / STEP + 1;
  const endsBy = (m: number) => {
    const end = buildPlan({ ...input, dailyMinutes: m, deadline: null }).plannedEndDate;
    return end === null || daysBetween(end, finishBy) >= 0;
  };
  if (!endsBy(MAX_DAILY_MINUTES)) return null;
  let lo = 0;
  let hi = options - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (endsBy(MIN_DAILY + mid * STEP)) hi = mid;
    else lo = mid + 1;
  }
  return MIN_DAILY + lo * STEP;
}

/**
 * Days kept free before the deadline for revision and mock interviews: about 15% of the
 * time available, between 2 and 7 days.
 */
export function revisionDays(startDate: string, deadline: string) {
  return Math.min(7, Math.max(2, Math.floor(daysBetween(startDate, deadline) * 0.15)));
}

/**
 * Paces the student can pick from. With a deadline: finish with revision time to spare
 * (recommended), or just in time, or (if their days can't make it) studying every day.
 * Without one: light, steady and intensive daily times. Nothing is applied automatically.
 */
export function suggestPaces(input: PlanInput): Pace[] {
  const paceFor = (
    key: PaceKey,
    dailyMinutes: number,
    studyWeekdays = input.studyWeekdays,
  ): Pace => {
    const end = buildPlan({ ...input, dailyMinutes, studyWeekdays, deadline: null }).plannedEndDate;
    return {
      key,
      dailyMinutes,
      studyWeekdays: [...studyWeekdays].sort((a, b) => a - b),
      plannedEndDate: end,
      daysToSpare: input.deadline && end ? daysBetween(end, input.deadline) : null,
    };
  };

  if (!input.deadline) {
    return (
      [
        ['light', 30],
        ['steady', 60],
        ['intensive', 90],
      ] as const
    ).map(([k, m]) => paceFor(k, m));
  }

  const paces: Pace[] = [];
  const target = addDays(input.deadline, -revisionDays(input.startDate, input.deadline));
  const recommended = minDailyMinutes(input, target);
  if (recommended !== null) paces.push(paceFor('recommended', recommended));
  const justInTime = minDailyMinutes(input, input.deadline);
  if (justInTime !== null && justInTime !== recommended)
    paces.push(paceFor('just-in-time', justInTime));
  if (justInTime === null && input.studyWeekdays.length < 7) {
    const everyDay = [0, 1, 2, 3, 4, 5, 6];
    const m = minDailyMinutes({ ...input, studyWeekdays: everyDay }, input.deadline);
    if (m !== null) paces.push(paceFor('every-day', m, everyDay));
  }
  return paces;
}

// ───────────── Item status (derived at read time, never stored) ─────────────

export type ItemStatus = 'DONE' | 'IN_PROGRESS' | 'DELAYED' | 'UP_NEXT' | 'UPCOMING';

export function deriveStatuses(
  items: Array<{ subtopicId: string; plannedEnd: string | null }>,
  progress: { done: ReadonlySet<string>; started: ReadonlySet<string> },
  today: string,
): Map<string, ItemStatus> {
  const out = new Map<string, ItemStatus>();
  let upNextGiven = false;
  for (const i of items) {
    const late = i.plannedEnd !== null && daysBetween(i.plannedEnd, today) > 0;
    let s: ItemStatus;
    if (progress.done.has(i.subtopicId)) s = 'DONE';
    else if (late) s = 'DELAYED';
    else if (progress.started.has(i.subtopicId)) s = 'IN_PROGRESS';
    else if (!upNextGiven) s = 'UP_NEXT';
    else s = 'UPCOMING';
    if (s === 'IN_PROGRESS' || s === 'UP_NEXT' || s === 'DELAYED') upNextGiven = true;
    out.set(i.subtopicId, s);
  }
  return out;
}

// ───────────── Change summary between two plans ─────────────

export interface ChangeSummary {
  added: string[];
  removed: string[];
  depthChanged: Array<{ subtopicId: string; from: number; to: number }>;
  minutesDelta: number;
  endDateDeltaDays: number | null;
}

export function diffPlans(
  before: {
    items: Array<{ subtopicId: string; targetDepthRank: number }>;
    totalMinutes: number;
    plannedEndDate: string | null;
  },
  after: {
    items: Array<{ subtopicId: string; targetDepthRank: number }>;
    totalMinutes: number;
    plannedEndDate: string | null;
  },
): ChangeSummary {
  const b = new Map(before.items.map((i) => [i.subtopicId, i.targetDepthRank]));
  const a = new Map(after.items.map((i) => [i.subtopicId, i.targetDepthRank]));
  return {
    added: [...a.keys()].filter((k) => !b.has(k)),
    removed: [...b.keys()].filter((k) => !a.has(k)),
    depthChanged: [...a]
      .filter(([k, d]) => b.has(k) && b.get(k) !== d)
      .map(([k, d]) => ({ subtopicId: k, from: b.get(k) as number, to: d })),
    minutesDelta: after.totalMinutes - before.totalMinutes,
    endDateDeltaDays:
      before.plannedEndDate && after.plannedEndDate
        ? daysBetween(before.plannedEndDate, after.plannedEndDate)
        : null,
  };
}

export const isMaterialChange = (c: ChangeSummary) =>
  c.added.length > 0 || c.removed.length > 0 || c.depthChanged.length > 0 || c.minutesDelta !== 0;
