import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapCatalog } from '../src/modules/catalog/catalog.bootstrap.ts';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  errorCode,
  json,
  resetWithCatalog,
  testDb,
} from './helpers.ts';

const { app } = await createTestApp();
afterAll(async () => {
  await app.close();
});

let ids: Awaited<ReturnType<typeof resetWithCatalog>>;
let admin: ReturnType<typeof browser>;
beforeEach(async () => {
  ids = await resetWithCatalog();
  // A regular ADMIN (not super admin) manages the catalog.
  const creds = await createAdmin('content@nxtwave.co.in', 'Content-Lead-2026', 'ADMIN');
  admin = browser(app, ADMIN_ORIGIN);
  await admin.post('/api/v1/admin/auth/login', creds);
});

describe('catalog bootstrap', () => {
  it('seeds the pilot configuration', async () => {
    const db = testDb();
    expect(await db.careerRole.count()).toBe(5);
    expect(await db.packageBracket.count()).toBe(4);
    expect(await db.depthLevel.count()).toBe(5);
    const live = await db.careerRole.findMany({ where: { availability: 'LIVE' } });
    expect(live.map((r) => r.slug)).toEqual(['ai-engineer']);
  });

  it('is idempotent and never overwrites admin edits', async () => {
    const db = testDb();
    await db.careerRole.update({
      where: { slug: 'ai-engineer' },
      data: { tagline: 'Edited by admin' },
    });
    const created = await bootstrapCatalog(db);
    expect(created).toEqual({ skillAreas: 0, roles: 0, brackets: 0, depthLevels: 0, companies: 0 });
    expect(
      (await db.careerRole.findUniqueOrThrow({ where: { slug: 'ai-engineer' } })).tagline,
    ).toBe('Edited by admin');
  });
});

describe('admin catalog API', () => {
  it('returns the whole catalog with usage counts', async () => {
    const cat = json<{
      roles: { slug: string; activeGoals: number; interested: number }[];
      brackets: unknown[];
      depthLevels: unknown[];
    }>(await admin.get('/api/v1/admin/catalog/'));
    expect(cat.roles).toHaveLength(5);
    expect(cat.roles[0]).toMatchObject({ slug: 'ai-engineer', activeGoals: 0, interested: 0 });
    expect(cat.depthLevels).toHaveLength(5);
  });

  it('opens a role to students by changing availability, and replaces its skill areas', async () => {
    const res = await admin.patch(`/api/v1/admin/catalog/roles/${ids.role('ml-engineer')}`, {
      availability: 'LIVE',
      skillAreas: [{ skillAreaId: ids.area('python'), importance: 3 }],
    });
    expect(res.statusCode).toBe(200);
    expect(json<{ availability: string; skillAreas: unknown[] }>(res)).toMatchObject({
      availability: 'LIVE',
      skillAreas: [{ skillAreaId: ids.area('python'), importance: 3 }],
    });
    const audit = await testDb().auditLog.findFirstOrThrow({
      where: { action: 'catalog.role.updated' },
    });
    expect(audit.before).toMatchObject({ availability: 'NEXT_UP' });
    expect(audit.after).toMatchObject({ availability: 'LIVE' });
  });

  it('creates a role, rejecting a duplicate slug and unknown skill areas', async () => {
    const body = {
      slug: 'mlops-engineer',
      title: 'MLOps Engineer',
      shortCode: 'mo',
      tagline: 'Keep models healthy in production.',
      description: 'Builds the platforms that train, ship and monitor models.',
      competencies: ['CI/CD for ML'],
      interviewFocus: ['System design'],
      colorKey: 'g3',
      availability: 'PLANNED',
      sortOrder: 9,
      skillAreas: [{ skillAreaId: ids.area('mlops'), importance: 3 }],
    };
    const created = await admin.post('/api/v1/admin/catalog/roles', body);
    expect(created.statusCode).toBe(201);
    expect(json<{ shortCode: string }>(created).shortCode).toBe('MO');
    expect(errorCode(await admin.post('/api/v1/admin/catalog/roles', body))).toBe('CONFLICT');

    const ghost = await admin.post('/api/v1/admin/catalog/roles', {
      ...body,
      slug: 'ghost-role',
      skillAreas: [{ skillAreaId: '00000000-0000-7000-8000-000000000000', importance: 1 }],
    });
    expect(ghost.statusCode).toBe(400);
  });

  it('validates package ranges and updates the difficulty mix', async () => {
    const bad = await admin.patch(`/api/v1/admin/catalog/brackets/${ids.bracket('LPA_3_6')}`, {
      maxLpa: 2,
    });
    expect(bad.statusCode).toBe(400);

    const policy = await admin.put(
      `/api/v1/admin/catalog/brackets/${ids.bracket('LPA_3_6')}/difficulty-policy`,
      {
        EASY: 60,
        MEDIUM: 40,
        HARD: 0,
        EXPERT: 0,
      },
    );
    expect(json<{ difficultyPolicy: object }>(policy).difficultyPolicy).toEqual({
      EASY: 60,
      MEDIUM: 40,
      HARD: 0,
      EXPERT: 0,
    });

    const zero = await admin.put(
      `/api/v1/admin/catalog/brackets/${ids.bracket('LPA_3_6')}/difficulty-policy`,
      {
        EASY: 0,
        MEDIUM: 0,
        HARD: 0,
        EXPERT: 0,
      },
    );
    expect(zero.statusCode).toBe(400);
  });

  it('edits depth level wording and generation guidance', async () => {
    const res = await admin.patch('/api/v1/admin/catalog/depth-levels/4', {
      generationGuidance: 'Internals, evaluation metrics and trade-offs with real numbers.',
    });
    expect(json<{ rank: number; generationGuidance: string }>(res)).toMatchObject({ rank: 4 });
    expect(
      (await admin.patch('/api/v1/admin/catalog/depth-levels/9', { name: 'Ninth' })).statusCode,
    ).toBe(404);
  });

  it('protects skill areas that students have already rated', async () => {
    const db = testDb();
    const s = await db.user.create({ data: { email: 's@student.test', role: 'STUDENT' } });
    await db.studentSkillRating.create({
      data: { studentId: s.id, skillAreaId: ids.area('analytics'), level: 1 },
    });
    const res = await admin.post(`/api/v1/admin/catalog/skill-areas/${ids.area('analytics')}`, {});
    expect(res.statusCode).toBe(404); // POST on an id path is not a route
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/catalog/skill-areas/${ids.area('analytics')}`,
      headers: { origin: ADMIN_ORIGIN, cookie: `nwp_asid=${admin.jar.get('nwp_asid')}` },
    });
    expect(del.statusCode).toBe(409);
  });

  it('manages companies with duplicate protection', async () => {
    const ok = await admin.post('/api/v1/admin/catalog/companies', { name: 'Zepto' });
    expect(json<{ slug: string }>(ok).slug).toBe('zepto');
    expect(errorCode(await admin.post('/api/v1/admin/catalog/companies', { name: 'zepto' }))).toBe(
      'CONFLICT',
    );
  });
});
