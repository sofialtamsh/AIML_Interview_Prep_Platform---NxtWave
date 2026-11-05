import { describe, expect, it } from 'vitest';
import {
  buildPlan,
  CurriculumCycleError,
  deriveStatuses,
  diffPlans,
  estimateMinutes,
  groupByWeek,
  minDailyMinutes,
  orderItems,
  type PlanInput,
  type PlanItemInput,
  suggestPaces,
} from './planner.engine.ts';

const item = (over: Partial<PlanItemInput> & { subtopicId: string }): PlanItemInput => ({
  topicId: 'T1',
  topicSort: 0,
  subtopicSort: 0,
  priority: 'HIGH',
  targetDepthRank: 3,
  isOptional: false,
  complexity: 3,
  estimateOverride: null,
  skillLevel: 0,
  ...over,
});

// 2026-11-02 is a Monday.
const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  items: [],
  subtopicPrereqs: [],
  topicPrereqs: [],
  completed: new Set(),
  dailyMinutes: 60,
  studyWeekdays: [1, 2, 3, 4, 5],
  startDate: '2026-11-02',
  deadline: null,
  ...over,
});

describe('estimates', () => {
  it('scale with depth and complexity, add practice time, and round to 5 minutes', () => {
    expect(
      estimateMinutes({ targetDepthRank: 3, complexity: 3, estimateOverride: null, skillLevel: 0 }),
    ).toBe(75);
    expect(
      estimateMinutes({ targetDepthRank: 4, complexity: 5, estimateOverride: null, skillLevel: 0 }),
    ).toBe(160);
    expect(
      estimateMinutes({ targetDepthRank: 1, complexity: 1, estimateOverride: null, skillLevel: 0 }),
    ).toBe(25);
  });

  it('fast-track confident students without changing the depth, and honour admin overrides', () => {
    const newbie = estimateMinutes({
      targetDepthRank: 4,
      complexity: 3,
      estimateOverride: null,
      skillLevel: 0,
    });
    const confident = estimateMinutes({
      targetDepthRank: 4,
      complexity: 3,
      estimateOverride: null,
      skillLevel: 3,
    });
    expect(confident).toBeLessThan(newbie);
    expect(
      estimateMinutes({ targetDepthRank: 4, complexity: 3, estimateOverride: 42, skillLevel: 0 }),
    ).toBe(45);
  });
});

describe('ordering', () => {
  it('respects prerequisites over sort order', () => {
    const order = orderItems({
      items: [
        item({ subtopicId: 'a', subtopicSort: 0 }),
        item({ subtopicId: 'b', subtopicSort: 1 }),
      ],
      subtopicPrereqs: [['a', 'b']], // a needs b
      topicPrereqs: [],
    });
    expect(order.map((i) => i.subtopicId)).toEqual(['b', 'a']);
  });

  it('expands topic prerequisites to every subtopic and keeps topics together', () => {
    const order = orderItems({
      items: [
        item({ subtopicId: 'rag1', topicId: 'RAG', topicSort: 0 }),
        item({ subtopicId: 'np1', topicId: 'NP', topicSort: 1 }),
        item({ subtopicId: 'np2', topicId: 'NP', topicSort: 1, subtopicSort: 1 }),
      ],
      subtopicPrereqs: [],
      topicPrereqs: [['RAG', 'NP']],
    });
    expect(order.map((i) => i.subtopicId)).toEqual(['np1', 'np2', 'rag1']);
  });

  it('ignores prerequisites that are not in this plan', () => {
    const order = orderItems({
      items: [item({ subtopicId: 'a' })],
      subtopicPrereqs: [['a', 'outside']],
      topicPrereqs: [],
    });
    expect(order).toHaveLength(1);
  });

  it('rejects cycles', () => {
    expect(() =>
      orderItems({
        items: [item({ subtopicId: 'a' }), item({ subtopicId: 'b' })],
        subtopicPrereqs: [
          ['a', 'b'],
          ['b', 'a'],
        ],
        topicPrereqs: [],
      }),
    ).toThrow(CurriculumCycleError);
  });
});

describe('packing onto study days', () => {
  it('fills each study day, skips non-study days, and lets items span days', () => {
    const plan = buildPlan(
      base({
        items: [
          item({ subtopicId: 'a', estimateOverride: 90 }), // Mon 60 + Tue 30
          item({ subtopicId: 'b', estimateOverride: 90, subtopicSort: 1 }), // Tue 30 + Wed 60
          item({ subtopicId: 'c', estimateOverride: 120, subtopicSort: 2 }), // Thu + Fri
        ],
      }),
    );
    expect(plan.items.map((i) => [i.subtopicId, i.plannedStart, i.plannedEnd])).toEqual([
      ['a', '2026-11-02', '2026-11-03'],
      ['b', '2026-11-03', '2026-11-04'],
      ['c', '2026-11-05', '2026-11-06'],
    ]);
    expect(plan).toMatchObject({
      totalMinutes: 300,
      studyDays: 5,
      weeklyMinutes: 300,
      plannedEndDate: '2026-11-06',
    });
  });

  it('starts on the next study day when today is not one, and skips weekends', () => {
    const plan = buildPlan(
      base({
        startDate: '2026-11-07', // Saturday
        items: [item({ subtopicId: 'a', estimateOverride: 120 })],
      }),
    );
    expect(plan.items[0]).toMatchObject({ plannedStart: '2026-11-09', plannedEnd: '2026-11-10' });
  });

  it('does not schedule completed subtopics but still counts them in the total', () => {
    const plan = buildPlan(
      base({
        items: [
          item({ subtopicId: 'a', estimateOverride: 60 }),
          item({ subtopicId: 'b', estimateOverride: 60, subtopicSort: 1 }),
        ],
        completed: new Set(['a']),
      }),
    );
    expect(plan.items[0]).toMatchObject({ done: true, plannedStart: null });
    expect(plan.items[1]).toMatchObject({ plannedStart: '2026-11-02' });
    expect(plan.totalMinutes).toBe(120);
    expect(plan.remainingMinutes).toBe(60);
  });
});

describe('deadline feasibility', () => {
  const heavy = [
    item({ subtopicId: 'a', estimateOverride: 300 }),
    item({ subtopicId: 'b', estimateOverride: 300, subtopicSort: 1 }),
    item({
      subtopicId: 'opt',
      estimateOverride: 120,
      subtopicSort: 2,
      isOptional: true,
      priority: 'LOW',
    }),
  ];

  it('is feasible when the plan ends on or before the deadline', () => {
    const plan = buildPlan(base({ items: heavy, dailyMinutes: 120, deadline: '2026-12-31' }));
    expect(plan.feasibility?.feasible).toBe(true);
  });

  it('when infeasible, offers explicit options instead of silently changing anything', () => {
    // 720 min at 60/day on weekdays = 12 study days → ends Tue 2026-11-17. Deadline Fri 2026-11-13.
    const plan = buildPlan(base({ items: heavy, deadline: '2026-11-13' }));
    const f = plan.feasibility;
    expect(f?.feasible).toBe(false);
    expect(f?.daysOver).toBe(4);
    // 10 study days available → 720 / 10 = 72 → 75 minutes a day.
    expect(f?.options.increaseDailyTo).toBe(75);
    expect(f?.options.extendDeadlineTo).toBe(plan.plannedEndDate);
    expect(f?.options.skipOptional).toMatchObject({ minutesSaved: 120, fits: true });
    // Adding Saturday finishes Sat 2026-11-14: better, but still one day late.
    expect(f?.options.addStudyDay).toEqual({ weekday: 6, endDate: '2026-11-14', fits: false });
    // The plan itself still contains everything.
    expect(plan.items).toHaveLength(3);
  });
});

describe('statuses and diffs', () => {
  it('derives done / in progress / delayed / up next / upcoming from progress and dates', () => {
    const s = deriveStatuses(
      [
        { subtopicId: 'a', plannedEnd: '2026-11-01' },
        { subtopicId: 'b', plannedEnd: '2026-11-03' },
        { subtopicId: 'c', plannedEnd: '2026-11-05' },
        { subtopicId: 'd', plannedEnd: '2026-11-09' },
      ],
      { done: new Set(['a']), started: new Set(['b']) },
      '2026-11-04',
    );
    expect([...s.values()]).toEqual(['DONE', 'DELAYED', 'UPCOMING', 'UPCOMING']);

    const fresh = deriveStatuses(
      [
        { subtopicId: 'a', plannedEnd: '2026-11-05' },
        { subtopicId: 'b', plannedEnd: '2026-11-06' },
      ],
      { done: new Set(), started: new Set() },
      '2026-11-04',
    );
    expect([...fresh.values()]).toEqual(['UP_NEXT', 'UPCOMING']);
  });

  it('summarises what changed between two plans', () => {
    const d = diffPlans(
      {
        items: [
          { subtopicId: 'a', targetDepthRank: 2 },
          { subtopicId: 'b', targetDepthRank: 2 },
        ],
        totalMinutes: 100,
        plannedEndDate: '2026-11-10',
      },
      {
        items: [
          { subtopicId: 'a', targetDepthRank: 4 },
          { subtopicId: 'c', targetDepthRank: 3 },
        ],
        totalMinutes: 160,
        plannedEndDate: '2026-11-14',
      },
    );
    expect(d).toEqual({
      added: ['c'],
      removed: ['b'],
      depthChanged: [{ subtopicId: 'a', from: 2, to: 4 }],
      minutesDelta: 60,
      endDateDeltaDays: 4,
    });
  });
});

describe('week view', () => {
  it('records minutes per day and groups them into Monday-to-Sunday weeks', () => {
    const plan = buildPlan(
      base({
        items: [
          item({ subtopicId: 'a', estimateOverride: 90 }),
          item({ subtopicId: 'b', estimateOverride: 90, subtopicSort: 1 }),
          item({ subtopicId: 'c', estimateOverride: 240, subtopicSort: 2 }),
        ],
      }),
    );
    expect(plan.days.slice(0, 2)).toEqual([
      { date: '2026-11-02', items: [{ subtopicId: 'a', minutes: 60 }] },
      {
        date: '2026-11-03',
        items: [
          { subtopicId: 'a', minutes: 30 },
          { subtopicId: 'b', minutes: 30 },
        ],
      },
    ]);
    const weeks = groupByWeek(plan.days);
    // 420 minutes at 60 a day on weekdays: 5 days in week 1, 2 in week 2.
    expect(weeks.map((w) => [w.index, w.start, w.end, w.minutes, w.studyDays])).toEqual([
      [1, '2026-11-02', '2026-11-08', 300, 5],
      [2, '2026-11-09', '2026-11-15', 120, 2],
    ]);
    expect(weeks[0]?.items).toEqual([
      { subtopicId: 'a', minutes: 90, finishes: true },
      { subtopicId: 'b', minutes: 90, finishes: true },
      { subtopicId: 'c', minutes: 120, finishes: false },
    ]);
    expect(weeks[1]?.items).toEqual([{ subtopicId: 'c', minutes: 120, finishes: true }]);
  });
});

describe('suggested paces', () => {
  const heavy = [
    item({ subtopicId: 'a', estimateOverride: 360 }),
    item({ subtopicId: 'b', estimateOverride: 360, subtopicSort: 1 }),
  ]; // 720 minutes

  it('finds the smallest daily time that finishes by a date', () => {
    // Mon 2 → Fri 13 Nov is 10 weekdays: 720 / 10 = 72 → 75 a day.
    expect(minDailyMinutes(base({ items: heavy }), '2026-11-13')).toBe(75);
    expect(minDailyMinutes(base({ items: heavy }), '2026-11-02')).toBeNull();
  });

  it('with a deadline: recommends finishing early enough to revise, or just in time', () => {
    // Deadline Fri 20 Nov: 18 days away → 2 revision days → finish by Wed 18 Nov (13 weekdays).
    const paces = suggestPaces(base({ items: heavy, deadline: '2026-11-20' }));
    expect(paces).toEqual([
      {
        key: 'recommended',
        dailyMinutes: 60,
        studyWeekdays: [1, 2, 3, 4, 5],
        plannedEndDate: '2026-11-17',
        daysToSpare: 3,
      },
      {
        key: 'just-in-time',
        dailyMinutes: 50,
        studyWeekdays: [1, 2, 3, 4, 5],
        plannedEndDate: '2026-11-20',
        daysToSpare: 0,
      },
    ]);
  });

  it('suggests studying every day when the chosen days cannot make the deadline', () => {
    const huge = [item({ subtopicId: 'x', estimateOverride: 3700 })];
    // Weekdays to Mon 9 Nov give 6 days × 600 = 3600 < 3700; all 8 days need 3700 / 8 → 465.
    const paces = suggestPaces(base({ items: huge, deadline: '2026-11-09' }));
    expect(paces).toEqual([
      {
        key: 'every-day',
        dailyMinutes: 465,
        studyWeekdays: [0, 1, 2, 3, 4, 5, 6],
        plannedEndDate: '2026-11-09',
        daysToSpare: 0,
      },
    ]);
  });

  it('without a deadline: light, steady and intensive options', () => {
    const paces = suggestPaces(base({ items: heavy }));
    expect(paces.map((p) => [p.key, p.dailyMinutes, p.plannedEndDate, p.daysToSpare])).toEqual([
      ['light', 30, '2026-12-03', null], // 24 weekdays
      ['steady', 60, '2026-11-17', null], // 12 weekdays
      ['intensive', 90, '2026-11-11', null], // 8 weekdays
    ]);
  });
});
