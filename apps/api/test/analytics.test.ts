import type { AnalyticsResponse, StudentAnalyticsResponse } from '@app/contracts';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { addDays, istDay, toDbDay } from '../src/modules/analytics/activity-log.ts';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  json,
  resetWithCatalog,
  STUDENT_ORIGIN,
  testClock,
  testDb,
} from './helpers.ts';

// Starts at 09:30 in India. The clock only moves forward, so every test reads "today" from it.
const clock = testClock(new Date('2026-11-03T04:00:00Z'));
const { app } = await createTestApp({ now: clock.now });
afterAll(async () => {
  await app.close();
});

const HOUR = 3_600_000;
const ANALYTICS = '/api/v1/admin/analytics';
type Browser = ReturnType<typeof browser>;

let creds: { email: string; password: string };
let n = 0;
beforeEach(async () => {
  await resetWithCatalog();
  creds = await createAdmin(`insights${++n}@nxtwave.co.in`, 'Content-Lead-2026', 'ADMIN');
});

/** A freshly signed-in admin: an admin session goes idle long before the next day starts. */
async function admin(): Promise<Browser> {
  const b = browser(app, ADMIN_ORIGIN, clock.now);
  expect((await b.post('/api/v1/admin/auth/login', creds)).statusCode).toBe(200);
  return b;
}

async function student(fullName: string) {
  const b = browser(app, STUDENT_ORIGIN, clock.now);
  const email = `${fullName.toLowerCase().replace(/\s+/g, '.')}${++n}@student.test`;
  const res = await b.post('/api/v1/auth/register', { email, password: 'Learn-ML-2026', fullName });
  expect(res.statusCode, res.body).toBe(201);
  const id = (await testDb().user.findUniqueOrThrow({ where: { email } })).id;
  return { b, id, email };
}

const visit = (b: Browser, target = '/') =>
  b.post('/api/v1/student/activity', { kind: 'VISIT', target });

describe('the day helpers', () => {
  it('count a day as the day in India, not the UTC day', () => {
    // 19:00 UTC is already half past midnight the next day in India.
    expect(istDay(new Date('2026-11-02T19:00:00Z'))).toBe('2026-11-03');
    expect(istDay(new Date('2026-11-02T18:29:00Z'))).toBe('2026-11-02');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('student activity and the admin analytics', () => {
  it('records what the app reports, and nothing it should not', async () => {
    const today = istDay(clock.now());
    const asha = await student('Asha Rao');
    expect((await visit(asha.b, '/roadmap')).statusCode).toBe(200);
    expect(
      (await asha.b.post('/api/v1/student/activity', { kind: 'PRACTICE_SOLVE', target: 'PY-001' }))
        .statusCode,
    ).toBe(200);
    // The lesson player's own events are recorded by the server, never taken from the browser.
    for (const kind of ['LESSON_STEP', 'QUIZ_ANSWER', 'LESSON_COMPLETED']) {
      expect((await asha.b.post('/api/v1/student/activity', { kind })).statusCode).toBe(400);
    }
    expect(
      (await asha.b.post('/api/v1/student/activity', { kind: 'VISIT', target: '<script>' }))
        .statusCode,
    ).toBe(400);
    // Signed out, nothing is recorded.
    const stranger = browser(app, STUDENT_ORIGIN, clock.now);
    expect((await visit(stranger)).statusCode).toBe(401);

    const rows = await testDb().studentActivity.findMany({ orderBy: { createdAt: 'asc' } });
    expect(rows.map((r) => [r.kind, r.target])).toEqual([
      ['VISIT', '/roadmap'],
      ['PRACTICE_SOLVE', 'PY-001'],
    ]);
    expect(rows[0]?.day.toISOString().slice(0, 10)).toBe(today);
  });

  it('shows who was active on which day, with totals per student and per day', async () => {
    // Start from a morning in India, wherever earlier tests left the clock.
    while (new Date(clock.now().getTime() + 5.5 * HOUR).getUTCHours() !== 9) clock.advance(HOUR);
    const day1 = istDay(clock.now());
    const day0 = addDays(day1, -1);
    const day2 = addDays(day1, 1);
    const asha = await student('Asha Rao');
    const bala = await student('Bala Iyer');
    const quiet = await student('Chitra Nair');

    // Day 1: Asha visits twice and uses both practice links; Bala visits once.
    await visit(asha.b, '/');
    await visit(asha.b, '/roadmap');
    await asha.b.post('/api/v1/student/activity', { kind: 'PRACTICE_SOLVE', target: 'PY-001' });
    await asha.b.post('/api/v1/student/activity', { kind: 'PRACTICE_CONCEPT', target: 'PY-001' });
    await visit(bala.b, '/');
    // What the lesson player records on the server: two steps (5 and 7 minutes), two answers.
    const at = { day: toDbDay(day1), createdAt: clock.now(), studentId: asha.id };
    await testDb().studentActivity.createMany({
      data: [
        { ...at, kind: 'LESSON_STEP', value: 300 },
        { ...at, kind: 'LESSON_STEP', value: 420 },
        { ...at, kind: 'QUIZ_ANSWER', value: 1 },
        { ...at, kind: 'QUIZ_ANSWER', value: 0 },
      ],
    });

    // Sixteen hours on it is one in the morning of day 2 in India: only Asha comes back.
    clock.advance(16 * HOUR);
    expect(istDay(clock.now())).toBe(day2);
    await visit(asha.b, '/practice');

    const boss = await admin();
    const res = await boss.get(`${ANALYTICS}?from=${day0}&to=${day2}`);
    expect(res.statusCode, res.body).toBe(200);
    const a = json<AnalyticsResponse>(res);
    expect(a.range).toEqual({ from: day0, to: day2, days: 3, today: day2 });
    expect(a.daily.map((d) => [d.day, d.activeStudents, d.visits])).toEqual([
      [day0, 0, 0],
      [day1, 2, 3],
      [day2, 1, 1],
    ]);
    expect(a.daily[1]).toMatchObject({
      learnMinutes: 12,
      steps: 2,
      quizAnswers: 2,
      quizRight: 1,
      practiceSolves: 1,
      conceptViews: 1,
    });
    expect(a.summary).toMatchObject({
      students: 3,
      activeToday: 1,
      activeLast7Days: 2,
      activeInRange: 2,
      learnMinutes: 12,
      practiceSolves: 1,
      trackingSince: day1,
    });

    const row = (id: string) => a.students.find((s) => s.id === id);
    expect(row(asha.id)).toMatchObject({
      fullName: 'Asha Rao',
      activeDays: 2,
      days: [day1, day2],
      visits: 3,
      learnMinutes: 12,
      steps: 2,
      quizAnswers: 2,
      quizRight: 1,
      practiceSolves: 1,
      conceptViews: 1,
    });
    expect(row(bala.id)).toMatchObject({ activeDays: 1, visits: 1, learnMinutes: 0 });
    // A student who never came back is still listed, with nothing in the range.
    expect(row(quiet.id)).toMatchObject({ activeDays: 0, days: [], visits: 0 });
    expect(row(asha.id)?.lastActiveAt).toBe(clock.now().toISOString());

    // Search narrows the students and the numbers with them.
    const one = json<AnalyticsResponse>(
      await boss.get(`${ANALYTICS}?from=${day0}&to=${day2}&q=bala`),
    );
    expect(one.students.map((s) => s.fullName)).toEqual(['Bala Iyer']);
    expect(one.summary).toMatchObject({ students: 1, activeInRange: 1, activeToday: 0 });
    expect(one.daily.map((d) => d.activeStudents)).toEqual([0, 1, 0]);
  });

  it('defaults to the last 14 days, puts a backwards range in order and caps a long one', async () => {
    const today = istDay(clock.now());
    const boss = await admin();
    const def = json<AnalyticsResponse>(await boss.get(ANALYTICS));
    expect(def.range).toEqual({ from: addDays(today, -13), to: today, days: 14, today });
    const swapped = json<AnalyticsResponse>(
      await boss.get(`${ANALYTICS}?from=${today}&to=${addDays(today, -2)}`),
    );
    expect(swapped.range).toMatchObject({ from: addDays(today, -2), to: today, days: 3 });
    const long = json<AnalyticsResponse>(
      await boss.get(`${ANALYTICS}?from=2025-01-01&to=${today}`),
    );
    expect(long.range).toMatchObject({ from: addDays(today, -91), to: today, days: 92 });
    expect((await boss.get(`${ANALYTICS}?from=3-nov`)).statusCode).toBe(400);
  });

  it('opens one student: their days, lessons and latest activity', async () => {
    const today = istDay(clock.now());
    const asha = await student('Asha Rao');
    await visit(asha.b, '/');
    await asha.b.post('/api/v1/student/activity', { kind: 'PRACTICE_SOLVE', target: 'ML-004' });

    const boss = await admin();
    const res = await boss.get(`${ANALYTICS}/students/${asha.id}`);
    expect(res.statusCode, res.body).toBe(200);
    const d = json<StudentAnalyticsResponse>(res);
    expect(d.student).toMatchObject({ fullName: 'Asha Rao', email: asha.email });
    expect(d.days).toEqual([expect.objectContaining({ day: today, visits: 1, practiceSolves: 1 })]);
    expect(d.recent.map((r) => r.kind).sort()).toEqual(['PRACTICE_SOLVE', 'VISIT']);
    expect(d.lessons).toEqual([]);

    // An admin is not a student, so there is nothing to open for one.
    const me = await testDb().user.findFirstOrThrow({ where: { role: 'ADMIN' } });
    expect((await boss.get(`${ANALYTICS}/students/${me.id}`)).statusCode).toBe(404);
  });

  it('is for admins only', async () => {
    const asha = await student('Asha Rao');
    expect((await asha.b.get(ANALYTICS)).statusCode).toBe(401);
    expect((await asha.b.get(`${ANALYTICS}/students/${asha.id}`)).statusCode).toBe(401);
    const nobody = browser(app, ADMIN_ORIGIN, clock.now);
    expect((await nobody.get(ANALYTICS)).statusCode).toBe(401);
  });
});
