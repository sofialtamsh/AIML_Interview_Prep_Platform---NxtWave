import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { parseAllowlistEntry } from '../src/modules/access/access.service.ts';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  errorCode,
  json,
  resetWithCatalog,
  STUDENT,
  STUDENT_ORIGIN,
  testDb,
} from './helpers.ts';

const { app } = await createTestApp();
afterAll(async () => {
  await app.close();
});

let ids: Awaited<ReturnType<typeof resetWithCatalog>>;
let sa: ReturnType<typeof browser>;
beforeEach(async () => {
  ids = await resetWithCatalog();
  const creds = await createAdmin();
  sa = browser(app, ADMIN_ORIGIN);
  await sa.post('/api/v1/admin/auth/login', creds);
});

async function onboardedStudent(email: string, bracket: 'LPA_3_6' | 'LPA_8_12') {
  const b = browser(app, STUDENT_ORIGIN);
  await b.post('/api/v1/auth/register', { ...STUDENT, email, fullName: email.split('@')[0] });
  const res = await b.post('/api/v1/student/onboarding/complete', {
    roleId: ids.role('ai-engineer'),
    bracketId: ids.bracket(bracket),
    skills: {},
    schedule: { dailyMinutes: 45, studyWeekdays: [1, 3, 5], deadline: null },
  });
  expect(res.statusCode).toBe(200);
  return b;
}

describe('admin: students', () => {
  it('lists students with role, package, cohort, onboarding and search filters', async () => {
    await onboardedStudent('asha@college.edu', 'LPA_3_6');
    await onboardedStudent('ravi@college.edu', 'LPA_8_12');
    await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/register', {
      ...STUDENT,
      email: 'new@college.edu',
    });

    type List = {
      items: { email: string; onboarded: boolean; bracket: { label: string } | null }[];
      total: number;
    };
    const all = json<List>(await sa.get('/api/v1/admin/students/?pageSize=10'));
    expect(all.total).toBe(3);

    const high = json<List>(
      await sa.get(`/api/v1/admin/students/?bracketId=${ids.bracket('LPA_8_12')}`),
    );
    expect(high.items.map((s) => s.email)).toEqual(['ravi@college.edu']);

    const pending = json<List>(await sa.get('/api/v1/admin/students/?onboarding=pending'));
    expect(pending.items.map((s) => s.email)).toEqual(['new@college.edu']);

    const search = json<List>(await sa.get('/api/v1/admin/students/?q=ASHA'));
    expect(search.items).toHaveLength(1);
    expect(search.items[0]?.bracket?.label).toBe('3–6 LPA');

    const overview = json<{
      students: { onboarded: number };
      byBracket: { label: string; count: number }[];
    }>(await sa.get('/api/v1/admin/overview'));
    expect(overview.students.onboarded).toBe(2);
    expect(overview.byBracket).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: '8–12 LPA', count: 1 })]),
    );
  });

  it("shows a student's full track and can suspend them (signed out at once)", async () => {
    const s = await onboardedStudent('asha@college.edu', 'LPA_3_6');
    const { id } = await testDb().user.findUniqueOrThrow({ where: { email: 'asha@college.edu' } });

    const detail = json<{
      goal: { role: { title: string } };
      skills: unknown[];
      previousGoals: number;
    }>(await sa.get(`/api/v1/admin/students/${id}`));
    expect(detail.goal.role.title).toBe('AI Engineer');
    expect(detail.skills.length).toBeGreaterThan(0);

    const res = await sa.patch(`/api/v1/admin/students/${id}`, { status: 'SUSPENDED' });
    expect(json<{ status: string }>(res).status).toBe('SUSPENDED');
    expect((await s.get('/api/v1/auth/me')).statusCode).toBe(401);
    const login = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/login', {
      email: 'asha@college.edu',
      password: STUDENT.password,
    });
    expect(errorCode(login)).toBe('ACCOUNT_SUSPENDED');
  });

  it('a student can never read the admin students API', async () => {
    const s = await onboardedStudent('asha@college.edu', 'LPA_3_6');
    expect((await s.get('/api/v1/admin/students/')).statusCode).toBe(401);
  });
});

describe('admin: cohorts and allowlist', () => {
  it('parses allowlist entries', () => {
    expect(parseAllowlistEntry('  Priya@College.EDU ')).toEqual({ email: 'priya@college.edu' });
    expect(parseAllowlistEntry('@nxtwave.co.in')).toEqual({ domain: 'nxtwave.co.in' });
    expect(parseAllowlistEntry('iiit.ac.in')).toEqual({ domain: 'iiit.ac.in' });
    expect(parseAllowlistEntry('not an entry')).toBeNull();
  });

  it('bulk-adds an enrollment list into a cohort; students who register join it automatically', async () => {
    const cohort = json<{ id: string }>(
      await sa.post('/api/v1/admin/access/cohorts', { name: 'DSML Cohort 7' }),
    );
    const added = json<{ added: number; alreadyListed: number; invalid: string[] }>(
      await sa.post('/api/v1/admin/access/allowlist', {
        entries: ['asha@college.edu', 'ASHA@college.edu', '@nxtwave.co.in', 'oops'],
        cohortId: cohort.id,
      }),
    );
    expect(added).toEqual({ added: 2, alreadyListed: 0, invalid: ['oops'] });
    const again = json<{ added: number; alreadyListed: number }>(
      await sa.post('/api/v1/admin/access/allowlist', { entries: ['asha@college.edu'] }),
    );
    expect(again).toMatchObject({ added: 0, alreadyListed: 1 });

    // Switch to enrolled-only sign-up (super admin).
    expect(
      (await sa.put('/api/v1/admin/access/registration', { policy: 'ALLOWLIST' })).statusCode,
    ).toBe(200);

    expect(
      errorCode(await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/register', STUDENT)),
    ).toBe('REGISTRATION_CLOSED');
    for (const email of ['asha@college.edu', 'ravi@nxtwave.co.in']) {
      const res = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/register', {
        ...STUDENT,
        email,
      });
      expect(res.statusCode).toBe(201);
    }
    const cohorts = json<{ items: { name: string; memberCount: number }[] }>(
      await sa.get('/api/v1/admin/access/cohorts'),
    );
    expect(cohorts.items[0]).toMatchObject({ name: 'DSML Cohort 7', memberCount: 2 });

    const filtered = json<{ total: number }>(
      await sa.get(`/api/v1/admin/students/?cohortId=${cohort.id}`),
    );
    expect(filtered.total).toBe(2);
  });

  it('only a super admin can change the registration policy', async () => {
    const creds = await createAdmin('plain@nxtwave.co.in', 'Plain-Admin-2026', 'ADMIN');
    const plain = browser(app, ADMIN_ORIGIN);
    await plain.post('/api/v1/admin/auth/login', creds);
    expect(
      json<{ policy: string }>(await plain.get('/api/v1/admin/access/registration')).policy,
    ).toBe('OPEN');
    expect(
      (await plain.put('/api/v1/admin/access/registration', { policy: 'INVITE_ONLY' })).statusCode,
    ).toBe(403);
  });
});
