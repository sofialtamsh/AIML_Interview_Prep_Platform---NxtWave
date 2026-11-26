/**
 * Pilot v2 (manager decision, 2026-11-05): the first rollout is for ONE role, ML Engineer, for
 * the students who cleared the NxtWave assessments.
 *
 *   - ML Engineer is the only open role. The others stay visible to students as "opening soon"
 *     with "Notify me", so demand is still measured.
 *   - Students don't pick a package or their own study time for now. The team sets one study
 *     plan (admin → Study plan): daily time, days, a deadline and a note. The pickers are hidden,
 *     not removed, and come back when an admin switches them on.
 *   - ML Engineer gets an interview-prep curriculum at both open packages, built from the Hiring
 *     Intelligence data (mle-curriculum.ts): 13 topics from self-introduction and project
 *     deep-dives to GenAI and deployment, prioritised by how many companies ask them.
 *
 * Run by `pnpm db:bootstrap` and the dev seed. Taxonomy and curricula are insert-only. The one-time
 * steps run once each, guarded by markers, so later admin changes are never overwritten:
 *   - the switch (role availability, moving AI Engineer goals, the pilot plan);
 *   - the curriculum upgrade from the interim v1 (three reused topics) to v2, published as a new
 *     version so students get an update proposal; skipped where an admin changed the curriculum.
 */
import type { ApplyStudyPlanResult, StudyPlan } from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Db } from '../../db/prisma.ts';
import { fromDbDate } from '../../lib/dates.ts';
import { ROLES } from '../catalog/catalog.bootstrap.ts';
import { newGoalData } from '../goals/goals.service.ts';
import { orderItems } from '../roadmap/planner.engine.ts';
import { RoadmapService } from '../roadmap/roadmap.service.ts';
import { StudyPlanService } from '../study-plan/study-plan.service.ts';
import {
  loadStudyPlan,
  planBracketId,
  STUDY_PLAN_KEY,
  scheduleFromPlan,
} from '../study-plan/study-plan.store.ts';
import { MLE_TOPICS, MLE_V2_3_6, MLE_V2_8_12, MLE_V2_CHANGE_NOTE } from './mle-curriculum.ts';
import {
  type CurriculumSeed,
  createMissingCurricula,
  curriculumItemRows,
  insertTaxonomy,
  subtopicKeyMap,
} from './pilot-curriculum.ts';

export const MLE_PILOT_MARKER = 'bootstrap.mle-pilot';
export const MLE_CURRICULUM_V2_MARKER = 'bootstrap.mle-curriculum-v2';
export const MLE_ROLE = 'ml-engineer';
/** The role the first pilot was built for. It closes (to "next up") when the MLE pilot starts. */
const PREVIOUS_PILOT_ROLE = 'ai-engineer';

/** The interim v1 (three reused topics) published on 2026-11-05 before the interview data arrived. */
export const MLE_INTERIM_CHANGE_NOTE =
  'ML Engineer pilot v1 (interim): reuses the three built topics. Add the ML, deep learning, NLP and computer vision topics from the hiring-intelligence data.';

export const MLE_CURRICULA = [
  { role: MLE_ROLE, bracket: 'LPA_3_6', items: MLE_V2_3_6 },
  { role: MLE_ROLE, bracket: 'LPA_8_12', items: MLE_V2_8_12 },
];

/** The ML Engineer role card, as the interview data describes it (students see this in onboarding). */
const MLE_ROLE_V2 = {
  description:
    'ML Engineers build and ship ML features, from clean data and the right model to a served, monitored API. Fresher interviews open with your introduction and a deep-dive into your projects, then test Python, ML and deep-learning concepts, and increasingly GenAI (LLMs and RAG).',
  competencies: [
    'Explaining your ML projects end to end',
    'Python concepts and live coding problems',
    'ML fundamentals, algorithms and model evaluation',
    'Deep learning, NLP and computer vision basics',
    'GenAI: LLMs, prompting, RAG and agents',
    'Serving models with APIs, plus SQL basics',
  ],
  interviewFocus: [
    'Project deep-dive',
    'Self-introduction and HR',
    'Python coding round',
    'ML and deep-learning concepts',
    'GenAI: LLMs and RAG',
  ],
  skills: [
    ['python', 3],
    ['ml', 3],
    ['dl-nlp', 2],
    ['genai', 2],
    ['sql-data', 2],
    ['mlops', 2],
    ['math-stats', 1],
  ] as Array<[string, number]>,
};

/** The pilot plan: one hour a day, Monday to Saturday, 30 days from each student's start. */
export function pilotStudyPlan(bracketId: string | null): StudyPlan {
  return {
    dailyMinutes: 60,
    studyWeekdays: [1, 2, 3, 4, 5, 6],
    deadline: { mode: 'DAYS_AFTER_START', days: 30 },
    message: null,
    bracketId,
    studentsChooseSchedule: false,
    studentsChoosePackage: false,
  };
}

export interface MlePilotResult {
  /** Topics, subtopics and concepts added to the taxonomy. */
  taxonomy: { topics: number; subtopics: number; concepts: number };
  curricula: number;
  /** Packages whose interim curriculum was replaced by v2, and the update proposals made. */
  upgraded: { curricula: number; proposals: number };
  /** True only on the run that made the one-time switch. */
  switched: boolean;
  movedToMle: number;
  plan: ApplyStudyPlanResult | null;
}

export async function bootstrapMlePilot(ctx: AppContext): Promise<MlePilotResult> {
  const db = ctx.db;
  const taxonomy = await insertTaxonomy(db, MLE_TOPICS);
  const result: MlePilotResult = {
    taxonomy,
    curricula: await createMissingCurricula(db, MLE_CURRICULA, MLE_V2_CHANGE_NOTE),
    upgraded: await upgradeMleCurriculum(ctx),
    switched: false,
    movedToMle: 0,
    plan: null,
  };
  if (await db.platformSetting.findUnique({ where: { key: MLE_PILOT_MARKER } })) return result;

  const [mle, previous] = await Promise.all([
    db.careerRole.findUnique({ where: { slug: MLE_ROLE } }),
    db.careerRole.findUnique({ where: { slug: PREVIOUS_PILOT_ROLE } }),
  ]);
  if (!mle) return result; // the catalog has not been bootstrapped yet

  // 1. ML Engineer is the open role; the previous pilot role becomes "next up" (still visible).
  if (mle.availability !== 'LIVE') {
    await db.careerRole.update({ where: { id: mle.id }, data: { availability: 'LIVE' } });
  }
  if (previous?.availability === 'LIVE') {
    await db.careerRole.update({ where: { id: previous.id }, data: { availability: 'NEXT_UP' } });
  }

  // 2. The pilot study plan, unless an admin has already saved one.
  if (!(await db.platformSetting.findUnique({ where: { key: STUDY_PLAN_KEY } }))) {
    const fundamentals = await db.packageBracket.findUnique({ where: { code: 'LPA_3_6' } });
    await db.platformSetting.create({
      data: {
        key: STUDY_PLAN_KEY,
        value: pilotStudyPlan(fundamentals?.availability === 'LIVE' ? fundamentals.id : null),
      },
    });
  }
  const { plan } = await loadStudyPlan(db);
  const planBracket = plan.studentsChoosePackage ? null : await planBracketId(db, plan);

  // 3. Students already on the previous pilot role move to ML Engineer, straight onto the plan's
  //    package and time. Their old goal stays as history and everything they learned still
  //    counts (progress is per subtopic). A plan deadline counts from their original start.
  const moved: string[] = [];
  if (previous) {
    const goals = await db.studentGoal.findMany({
      where: { roleId: previous.id, isActive: true },
    });
    for (const g of goals) {
      const start = fromDbDate(g.startDate);
      const schedule = plan.studentsChooseSchedule
        ? {
            dailyMinutes: g.dailyMinutes,
            studyWeekdays: g.studyWeekdays,
            deadline: g.deadline ? fromDbDate(g.deadline) : null,
          }
        : scheduleFromPlan(plan, start);
      const [, next] = await db.$transaction([
        db.studentGoal.update({
          where: { id: g.id },
          data: { isActive: false, endedAt: ctx.now() },
        }),
        db.studentGoal.create({
          data: newGoalData(g.studentId, mle.id, planBracket ?? g.bracketId, schedule, start),
        }),
      ]);
      moved.push(next.id);
    }
  }
  result.movedToMle = moved.length;

  // 4. Everyone else follows the plan too; moved students get their first ML Engineer roadmap.
  const roadmaps = new RoadmapService(ctx);
  result.plan = await new StudyPlanService(ctx, roadmaps).apply(plan);
  for (const id of moved) await roadmaps.ensureForGoal(id);

  await db.platformSetting.create({
    data: {
      key: MLE_PILOT_MARKER,
      value: { switchedAt: ctx.now().toISOString(), movedToMle: moved.length },
    },
  });
  result.switched = true;
  return result;
}

/**
 * One time: replaces the interim ML Engineer curriculum (v1, three reused topics) with v2 at each
 * package where it is still the published version and no draft is open. The new version is
 * published like an admin publish, so every student on it gets an update proposal to accept.
 * Also refreshes the ML Engineer role card if it is still the bootstrap default.
 */
export async function upgradeMleCurriculum(
  ctx: AppContext,
): Promise<{ curricula: number; proposals: number }> {
  const db = ctx.db;
  const done = { curricula: 0, proposals: 0 };
  if (await db.platformSetting.findUnique({ where: { key: MLE_CURRICULUM_V2_MARKER } }))
    return done;
  const role = await db.careerRole.findUnique({ where: { slug: MLE_ROLE } });
  if (!role) return done; // the catalog has not been bootstrapped yet

  await refreshMleRole(db, role.id);
  const subtopicIds = await subtopicKeyMap(db);
  const roadmaps = new RoadmapService(ctx);
  for (const c of MLE_CURRICULA) {
    const bracket = await db.packageBracket.findUnique({ where: { code: c.bracket } });
    if (!bracket) continue;
    const where = { roleId: role.id, bracketId: bracket.id };
    const [published, draft, last] = await Promise.all([
      db.roleCurriculum.findFirst({ where: { ...where, status: 'PUBLISHED' } }),
      db.roleCurriculum.findFirst({ where: { ...where, status: 'DRAFT' } }),
      db.roleCurriculum.findFirst({ where, orderBy: { version: 'desc' } }),
    ]);
    if (!published || draft || published.changeNote !== MLE_INTERIM_CHANGE_NOTE) continue;
    await assertOrderable(db, subtopicIds, c.items);
    const next = await db.$transaction(async (tx) => {
      await tx.roleCurriculum.update({
        where: { id: published.id },
        data: { status: 'SUPERSEDED' },
      });
      return tx.roleCurriculum.create({
        data: {
          ...where,
          version: (last?.version ?? published.version) + 1,
          status: 'PUBLISHED',
          publishedAt: ctx.now(),
          changeNote: MLE_V2_CHANGE_NOTE,
          items: { create: curriculumItemRows(subtopicIds, c.items) },
        },
      });
    });
    done.curricula++;
    done.proposals += await roadmaps.proposeForCurriculum(next.id);
  }
  await db.platformSetting.create({
    data: {
      key: MLE_CURRICULUM_V2_MARKER,
      value: { upgradedAt: ctx.now().toISOString(), ...done },
    },
  });
  return done;
}

/** The role card and self-check areas from the interview data, unless an admin edited them. */
async function refreshMleRole(db: Db, roleId: string) {
  const seed = ROLES.find((r) => r.slug === MLE_ROLE);
  const role = await db.careerRole.findUniqueOrThrow({ where: { id: roleId } });
  if (!seed || JSON.stringify(role.interviewFocus) !== JSON.stringify(seed.interviewFocus)) return;
  const areas = new Map((await db.skillArea.findMany()).map((a) => [a.slug, a.id]));
  await db.$transaction([
    db.careerRole.update({
      where: { id: roleId },
      data: {
        description: MLE_ROLE_V2.description,
        competencies: MLE_ROLE_V2.competencies,
        interviewFocus: MLE_ROLE_V2.interviewFocus,
      },
    }),
    db.roleSkillArea.deleteMany({ where: { roleId } }),
    db.roleSkillArea.createMany({
      data: MLE_ROLE_V2.skills.flatMap(([slug, importance]) => {
        const skillAreaId = areas.get(slug);
        return skillAreaId ? [{ roleId, skillAreaId, importance }] : [];
      }),
    }),
  ]);
}

/** The planner must be able to order the items (no prerequisite loops) before students see them. */
async function assertOrderable(db: Db, subtopicIds: Map<string, string>, items: CurriculumSeed) {
  const ids = new Set(curriculumItemRows(subtopicIds, items).map((r) => r.subtopicId));
  const subs = await db.subtopic.findMany({ where: { id: { in: [...ids] } } });
  const [subEdges, topicEdges] = await Promise.all([
    db.subtopicPrerequisite.findMany(),
    db.topicPrerequisite.findMany(),
  ]);
  orderItems({
    items: subs.map((s) => ({
      subtopicId: s.id,
      topicId: s.topicId,
      topicSort: 0,
      subtopicSort: s.sortOrder,
      priority: 'MEDIUM',
      targetDepthRank: 2,
      isOptional: false,
      complexity: s.complexity,
      estimateOverride: null,
      skillLevel: 0,
    })),
    subtopicPrereqs: subEdges.map((e) => [e.subtopicId, e.prerequisiteId]),
    topicPrereqs: topicEdges.map((e) => [e.topicId, e.prerequisiteId]),
  });
}
