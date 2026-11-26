import {
  ANALYTICS_MAX_DAYS,
  type AnalyticsDay,
  type AnalyticsQuery,
  type AnalyticsResponse,
  type AnalyticsStudent,
  type StudentAnalyticsResponse,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import type { ActivityKind } from '../../generated/prisma/enums.ts';
import { notFound } from '../../lib/errors.ts';
import { addDays, istDay, toDbDay } from './activity-log.ts';

/** Counters while adding rows up; seconds become minutes only at the end. */
interface Tally {
  visits: number;
  learnSeconds: number;
  steps: number;
  quizAnswers: number;
  quizRight: number;
  practiceSolves: number;
  conceptViews: number;
  lessonsCompleted: number;
}

const blank = (): Tally => ({
  visits: 0,
  learnSeconds: 0,
  steps: 0,
  quizAnswers: 0,
  quizRight: 0,
  practiceSolves: 0,
  conceptViews: 0,
  lessonsCompleted: 0,
});

/** Adds `count` rows of one kind, whose `value` column sums to `sum`. */
function add(t: Tally, kind: ActivityKind, count: number, sum: number) {
  switch (kind) {
    case 'VISIT':
      t.visits += count;
      break;
    case 'LESSON_STEP':
      t.steps += count;
      t.learnSeconds += sum;
      break;
    case 'QUIZ_ANSWER':
      t.quizAnswers += count;
      t.quizRight += sum;
      break;
    case 'PRACTICE_SOLVE':
      t.practiceSolves += count;
      break;
    case 'PRACTICE_CONCEPT':
      t.conceptViews += count;
      break;
    case 'LESSON_COMPLETED':
      t.lessonsCompleted += count;
      break;
  }
}

const counts = (t: Tally) => ({
  visits: t.visits,
  learnMinutes: Math.round(t.learnSeconds / 60),
  steps: t.steps,
  quizAnswers: t.quizAnswers,
  quizRight: t.quizRight,
  practiceSolves: t.practiceSolves,
  conceptViews: t.conceptViews,
  lessonsCompleted: t.lessonsCompleted,
});

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

const studentInclude = {
  studentProfile: true,
  cohorts: { include: { cohort: true } },
  sessions: {
    where: { audience: 'STUDENT' },
    orderBy: { lastSeenAt: 'desc' },
    take: 1,
    select: { lastSeenAt: true },
  },
} satisfies Prisma.UserInclude;

/**
 * The team's view of how students use the platform: who was active on which day, for how long,
 * and doing what. Days are days in India. Everything is counted from the activity log; lessons
 * started and finished come from the progress the lesson player already keeps.
 */
export class AnalyticsService {
  constructor(private readonly ctx: AppContext) {}

  private get db() {
    return this.ctx.db;
  }

  /** The range asked for, tidied: in order, no longer than the limit, last 14 days by default. */
  private rangeOf(q: { from?: string; to?: string }) {
    const today = istDay(this.ctx.now());
    let to = q.to ?? today;
    let from = q.from ?? addDays(to, -13);
    if (from > to) [from, to] = [to, from];
    if (addDays(from, ANALYTICS_MAX_DAYS - 1) < to) from = addDays(to, -(ANALYTICS_MAX_DAYS - 1));
    const days: string[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
    return { from, to, today, days };
  }

  async overview(q: AnalyticsQuery): Promise<AnalyticsResponse> {
    const range = this.rangeOf(q);
    const where: Prisma.UserWhereInput = {
      role: 'STUDENT',
      status: { not: 'DELETED' },
      ...(q.q
        ? {
            OR: [
              { email: { contains: q.q, mode: 'insensitive' } },
              { studentProfile: { fullName: { contains: q.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(q.cohortId ? { cohorts: { some: { cohortId: q.cohortId } } } : {}),
    };
    const users = await this.db.user.findMany({
      where,
      include: { ...studentInclude, lessonProgress: { select: { status: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const ids = users.map((u) => u.id);
    const mine = { studentId: { in: ids } };

    const [grouped, lastSeen, week, todayRows, first] = await Promise.all([
      this.db.studentActivity.groupBy({
        by: ['studentId', 'day', 'kind'],
        where: { ...mine, day: { gte: toDbDay(range.from), lte: toDbDay(range.to) } },
        _count: { _all: true },
        _sum: { value: true },
      }),
      this.db.studentActivity.groupBy({
        by: ['studentId'],
        where: mine,
        _max: { createdAt: true },
      }),
      this.db.studentActivity.findMany({
        where: { ...mine, day: { gte: toDbDay(addDays(range.today, -6)) } },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
      this.db.studentActivity.findMany({
        where: { ...mine, day: toDbDay(range.today) },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
      this.db.studentActivity.findFirst({ orderBy: { createdAt: 'asc' }, select: { day: true } }),
    ]);

    const byStudent = new Map<string, { tally: Tally; days: Set<string> }>();
    const byDay = new Map<string, { tally: Tally; students: Set<string> }>(
      range.days.map((d) => [d, { tally: blank(), students: new Set<string>() }]),
    );
    for (const g of grouped) {
      const day = dayOf(g.day);
      const sum = g._sum.value ?? 0;
      const s = byStudent.get(g.studentId) ?? { tally: blank(), days: new Set<string>() };
      add(s.tally, g.kind, g._count._all, sum);
      s.days.add(day);
      byStudent.set(g.studentId, s);
      const d = byDay.get(day);
      if (d) {
        add(d.tally, g.kind, g._count._all, sum);
        d.students.add(g.studentId);
      }
    }
    const lastOf = new Map(lastSeen.map((l) => [l.studentId, l._max.createdAt]));

    const students: AnalyticsStudent[] = users.map((u) => {
      const s = byStudent.get(u.id);
      // Before the activity log existed, the session's last-seen time is all there is.
      const last = [lastOf.get(u.id), u.sessions[0]?.lastSeenAt]
        .filter((d): d is Date => d instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      return {
        id: u.id,
        fullName: u.studentProfile?.fullName ?? '',
        email: u.email,
        status: u.status,
        cohorts: u.cohorts.map((c) => c.cohort.name),
        joinedAt: u.createdAt.toISOString(),
        lastActiveAt: last?.toISOString() ?? null,
        activeDays: s?.days.size ?? 0,
        days: s ? [...s.days].sort() : [],
        ...counts(s?.tally ?? blank()),
        unitsStarted: u.lessonProgress.length,
        unitsDone: u.lessonProgress.filter((p) => p.status === 'COMPLETED').length,
      };
    });

    const daily: AnalyticsDay[] = range.days.map((day) => {
      const d = byDay.get(day);
      return { day, activeStudents: d?.students.size ?? 0, ...counts(d?.tally ?? blank()) };
    });
    const total = blank();
    for (const s of byStudent.values()) {
      for (const k of Object.keys(total) as Array<keyof Tally>) total[k] += s.tally[k];
    }

    return {
      range: { from: range.from, to: range.to, days: range.days.length, today: range.today },
      summary: {
        students: users.length,
        activeToday: todayRows.length,
        activeLast7Days: week.length,
        activeInRange: byStudent.size,
        joinedInRange: users.filter((u) => {
          const joined = istDay(u.createdAt);
          return joined >= range.from && joined <= range.to;
        }).length,
        learnMinutes: Math.round(total.learnSeconds / 60),
        lessonsCompleted: total.lessonsCompleted,
        practiceSolves: total.practiceSolves,
        trackingSince: first ? dayOf(first.day) : null,
      },
      daily,
      students,
    };
  }

  /** One student: each day they were active in the range, every lesson they opened, and their latest activity. */
  async student(id: string, q: { from?: string; to?: string }): Promise<StudentAnalyticsResponse> {
    const u = await this.db.user.findFirst({
      where: { id, role: 'STUDENT', status: { not: 'DELETED' } },
      include: studentInclude,
    });
    if (!u) throw notFound('That student');
    const range = this.rangeOf(q);

    const [grouped, last, lessons, recent] = await Promise.all([
      this.db.studentActivity.groupBy({
        by: ['day', 'kind'],
        where: { studentId: id, day: { gte: toDbDay(range.from), lte: toDbDay(range.to) } },
        _count: { _all: true },
        _sum: { value: true },
      }),
      this.db.studentActivity.findFirst({
        where: { studentId: id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.db.moduleProgress.findMany({
        where: { studentId: id },
        include: { subtopic: { include: { topic: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.db.studentActivity.findMany({
        where: { studentId: id },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
    ]);

    const byDay = new Map<string, Tally>();
    for (const g of grouped) {
      const day = dayOf(g.day);
      const t = byDay.get(day) ?? blank();
      add(t, g.kind, g._count._all, g._sum.value ?? 0);
      byDay.set(day, t);
    }
    const lastActive = [last?.createdAt, u.sessions[0]?.lastSeenAt]
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      student: {
        id: u.id,
        fullName: u.studentProfile?.fullName ?? '',
        email: u.email,
        status: u.status,
        cohorts: u.cohorts.map((c) => c.cohort.name),
        joinedAt: u.createdAt.toISOString(),
        lastActiveAt: lastActive?.toISOString() ?? null,
      },
      range: { from: range.from, to: range.to },
      days: [...byDay.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([day, t]) => ({ day, ...counts(t) })),
      lessons: lessons.map((p) => ({
        topic: p.subtopic.topic.title,
        title: p.subtopic.title,
        status: p.status,
        stepsDone: p.completedSectionKeys.length,
        minutes: Math.round(p.timeSpentSec / 60),
        startedAt: p.startedAt.toISOString(),
        completedAt: p.completedAt?.toISOString() ?? null,
        lastSeenAt: p.updatedAt.toISOString(),
      })),
      recent: recent.map((r) => ({
        at: r.createdAt.toISOString(),
        kind: r.kind,
        target: r.target,
        value: r.value,
      })),
    };
  }
}
