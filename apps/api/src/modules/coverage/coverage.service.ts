import type {
  CoverageEvidence,
  CoverageFlag,
  CoverageLessonState,
  CoverageQuery,
  CoverageResponse,
  CoverageSignal,
  CoverageTarget,
  CoverageUnit,
  HiringCtcBand,
  Priority,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import { addDays, daysBetween, fromDbDate, todayIn, weekdayOf } from '../../lib/dates.ts';
import { notFound } from '../../lib/errors.ts';
import { WORKING } from '../content/content.service.ts';
import { loadSections } from '../content/lesson-store.ts';
import { minutesOf, resolveFor } from '../content/lesson-view.ts';
import { PREP_THEMES, type PrepTheme } from '../hiring/hiring-rules.ts';
import { estimateMinutes } from '../roadmap/planner.engine.ts';
import type { RoadmapService } from '../roadmap/roadmap.service.ts';
import { loadStudyPlan, planBracketId, scheduleFromPlan } from '../study-plan/study-plan.store.ts';
import {
  CATCH_ALL_THEMES,
  formatOf,
  INTERVIEW_FORMATS,
  THEME_UNITS,
  type UnitKey,
} from './coverage-map.ts';

const ADMIN_TZ = 'Asia/Kolkata';
/** The role the Hiring Intelligence "ML Engineer family" describes (MLE_ROLE in mle-pilot.ts). */
const EVIDENCE_ROLE = 'ml-engineer';
/** docs/11 §3: high priority means asked at roughly a third or more of companies. */
const HIGH_SHARE = 1 / 3;
/** A theme this widely asked should not sit only in optional units. */
const CORE_SHARE = 1 / 4;
/** Below this share a gap is noted on the evidence tab but not raised as a signal. */
const SIGNAL_SHARE = 0.1;
const OUTSIDE_GROUPS = 12;
/** Fewer companies than this in a band and every share moves several points per company. */
const SMALL_SAMPLE = 30;

const TONE_ORDER: Record<CoverageSignal['tone'], number> = { bad: 0, warn: 1, info: 2, ok: 3 };
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const hours = (minutes: number) => `${(minutes / 60).toFixed(1)} h`;
const pct = (share: number) => `${Math.round(share * 100)}%`;
const unitKey = (topicSlug: string, subtopicSlug: string): UnitKey =>
  `${topicSlug}/${subtopicSlug}`;

/** "Mon–Sat", "Mon, Wed, Fri": weekdays as a short phrase (0 = Sunday). */
export function weekdayPhrase(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const d of sorted) {
    const run = runs.at(-1);
    if (run && run.at(-1) === d - 1) run.push(d);
    else runs.push([d]);
  }
  return runs
    .map((r) =>
      r.length >= 3
        ? `${WEEKDAY[r[0] as number]}–${WEEKDAY[r.at(-1) as number]}`
        : r.map((d) => WEEKDAY[d]).join(', '),
    )
    .join(', ');
}

function countStudyDays(from: string, to: string, weekdays: ReadonlySet<number>) {
  let n = 0;
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1))
    if (weekdays.has(weekdayOf(d))) n++;
  return n;
}

interface LessonFacts {
  state: CoverageLessonState;
  liveVersion: number | null;
  workingVersion: number | null;
  workingStatus: string | null;
  /** The version a student sees (live) or will see next (working). */
  measuredVersionId: string | null;
}

interface UnitInfo {
  subtopicId: string;
  title: string;
  inCurriculum: boolean;
  optional: boolean;
  priority: Priority | null;
  state: CoverageLessonState;
}

/**
 * Admin → Content coverage: one read-only view of how ready the content is for a role and
 * package. Student activity is not part of it (that is Overview and Students).
 */
export class CoverageService {
  constructor(
    private readonly ctx: AppContext,
    private readonly roadmaps: RoadmapService,
  ) {}

  private get db() {
    return this.ctx.db;
  }

  async view(query: CoverageQuery, opts: { superAdmin: boolean }): Promise<CoverageResponse> {
    const today = todayIn(ADMIN_TZ, this.ctx.now());
    const { plan: studyPlan } = await loadStudyPlan(this.db);
    const schedule = scheduleFromPlan(studyPlan, today);
    const scheduleDto = {
      startDate: today,
      dailyMinutes: schedule.dailyMinutes,
      studyWeekdays: schedule.studyWeekdays,
      deadline: schedule.deadline,
    };

    const { targets, live } = await this.targets();
    const target = await this.pickTarget(targets, live, query, studyPlan);
    if (!target) {
      return {
        targets,
        target: null,
        schedule: scheduleDto,
        summary: emptySummary(),
        signals: [],
        units: [],
        evidence: null,
        evidenceNote: 'No role has a published curriculum yet.',
      };
    }

    const planned = await this.roadmaps.targetPlan(
      target.roleId,
      target.bracketId,
      schedule,
      today,
    );
    if (!planned) throw notFound('That curriculum');
    const { plan, curriculumId } = planned;

    const [role, bracket, items, depths, allSubtopics] = await Promise.all([
      this.db.careerRole.findUniqueOrThrow({ where: { id: target.roleId } }),
      this.db.packageBracket.findUniqueOrThrow({ where: { id: target.bracketId } }),
      this.db.roleCurriculumItem.findMany({
        where: { roleCurriculumId: curriculumId },
        include: { subtopic: { include: { topic: true } } },
      }),
      this.db.depthLevel.findMany(),
      this.db.subtopic.findMany({ include: { topic: { select: { slug: true } } } }),
    ]);
    const itemOf = new Map(items.map((i) => [i.subtopicId, i]));
    const depthName = new Map(depths.map((d) => [d.rank, d.name]));
    const subtopicByKey = new Map(allSubtopics.map((s) => [unitKey(s.topic.slug, s.slug), s]));

    // Lessons: for the curriculum and for every unit the evidence map points at.
    const mappedIds = [
      ...Object.values(THEME_UNITS).flat(),
      ...INTERVIEW_FORMATS.flatMap((f) => f.units),
    ].flatMap((k) => {
      const s = subtopicByKey.get(k);
      return s ? [s.id] : [];
    });
    const lessons = await this.lessonFacts([...new Set([...itemOf.keys(), ...mappedIds])]);
    const practice = await this.practiceCounts([...itemOf.keys()], target.roleId);

    // Study days, from the same planner the students' roadmaps use.
    const dayOf = new Map(plan.days.map((d, i) => [d.date, i + 1]));
    const weekdays = new Set(schedule.studyWeekdays);
    const deadlineStudyDays = schedule.deadline
      ? countStudyDays(today, schedule.deadline, weekdays)
      : null;

    const units: CoverageUnit[] = [];
    for (const p of plan.items) {
      const item = itemOf.get(p.subtopicId);
      if (!item) continue;
      const lesson = lessons.get(p.subtopicId) ?? notStarted();
      let minutes: number | null = null;
      let olderFormat = false;
      if (lesson.measuredVersionId) {
        const sections = await loadSections(this.db, lesson.measuredVersionId);
        olderFormat = !sections.some((s) => s.section.kind === 'SLIDES');
        minutes = minutesOf(
          resolveFor(sections, { depth: p.targetDepthRank, roleSlug: role.slug, skillLevel: 0 }),
        );
      }
      units.push({
        subtopicId: p.subtopicId,
        slug: item.subtopic.slug,
        title: item.subtopic.title,
        topicId: item.subtopic.topicId,
        topicSlug: item.subtopic.topic.slug,
        topicTitle: item.subtopic.topic.title,
        sequence: p.sequence,
        priority: p.priority,
        depth: { rank: p.targetDepthRank, name: depthName.get(p.targetDepthRank) ?? '' },
        optional: p.isOptional,
        lesson: {
          state: lesson.state,
          liveVersion: lesson.liveVersion,
          workingVersion: lesson.workingVersion,
          workingStatus: lesson.workingStatus,
          olderFormat,
          minutes,
        },
        plannedMinutes: p.estimatedMinutes,
        plannedLessonMinutes: estimateMinutes(
          {
            targetDepthRank: p.targetDepthRank,
            complexity: item.subtopic.complexity,
            estimateOverride: item.estimateMinutesOverride,
            skillLevel: 0,
          },
          0,
        ),
        startDay: p.plannedStart ? (dayOf.get(p.plannedStart) ?? null) : null,
        practice: practice.get(p.subtopicId) ?? 0,
        evidence: null,
      });
    }

    const firstWhere = (ok: (u: CoverageUnit) => boolean) => {
      const u = units.find((x) => !ok(x));
      return u ? { subtopicId: u.subtopicId, title: u.title, day: u.startDay ?? 0 } : null;
    };
    const measured = units.filter((u) => u.lesson.minutes !== null);
    const count = (s: CoverageLessonState) => units.filter((u) => u.lesson.state === s).length;
    const summary: CoverageResponse['summary'] = {
      units: units.length,
      optionalUnits: units.filter((u) => u.optional).length,
      written: units.filter((u) => u.lesson.state !== 'NOT_STARTED').length,
      live: count('LIVE'),
      inReview: count('IN_REVIEW'),
      inProgress: count('IN_PROGRESS'),
      notStarted: count('NOT_STARTED'),
      olderFormat: units.filter((u) => u.lesson.olderFormat).length,
      withPractice: units.filter((u) => u.practice > 0).length,
      plannedMinutes: plan.totalMinutes,
      measuredMinutes: measured.reduce((a, u) => a + (u.lesson.minutes ?? 0), 0),
      measuredUnits: measured.length,
      measuredPlannedMinutes: measured.reduce((a, u) => a + u.plannedLessonMinutes, 0),
      studyDays: plan.days.length,
      deadlineStudyDays,
      fitsWithDailyMinutes:
        plan.feasibility && !plan.feasibility.feasible
          ? plan.feasibility.options.increaseDailyTo
          : null,
      firstNotLive: firstWhere((u) => u.lesson.state === 'LIVE'),
      firstNotWritten: firstWhere((u) => u.lesson.state !== 'NOT_STARTED'),
    };

    const signals = contentSignals(units, summary, scheduleDto);

    let evidence: CoverageEvidence | null = null;
    let evidenceNote: string | null = null;
    if (!opts.superAdmin) {
      evidenceNote = 'Interview evidence is visible to super admins only.';
    } else if (role.slug !== EVIDENCE_ROLE) {
      evidenceNote = 'Interview evidence covers the ML Engineer family only.';
    } else {
      const unitInfo = (key: UnitKey): UnitInfo[] => {
        const s = subtopicByKey.get(key);
        if (!s) return [];
        const item = itemOf.get(s.id);
        return [
          {
            subtopicId: s.id,
            title: s.title,
            inCurriculum: Boolean(item),
            optional: item?.isOptional ?? false,
            priority: item?.priority ?? null,
            state: lessons.get(s.id)?.state ?? 'NOT_STARTED',
          },
        ];
      };
      const band: HiringCtcBand = bracket.minLpa >= 8 ? 'FROM_8_LPA' : 'UNDER_8_LPA';
      const found = await this.evidence(band, unitInfo);
      if (!found) evidenceNote = 'No Hiring Intelligence data has been imported yet.';
      else {
        evidence = found.evidence;
        attachUnitEvidence(units, evidence, found.themeCompanies);
        signals.push(...evidenceSignals(evidence));
      }
    }

    signals.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
    return {
      targets,
      target,
      schedule: scheduleDto,
      summary,
      signals,
      units,
      evidence,
      evidenceNote,
    };
  }

  // ───────────── Targets ─────────────

  private async targets() {
    const rows = await this.db.roleCurriculum.findMany({
      where: { status: 'PUBLISHED' },
      include: { role: true, bracket: true, _count: { select: { items: true } } },
    });
    rows.sort(
      (a, b) =>
        a.role.sortOrder - b.role.sortOrder ||
        a.bracket.sortOrder - b.bracket.sortOrder ||
        b.version - a.version,
    );
    const seen = new Set<string>();
    const targets: CoverageTarget[] = [];
    const live = new Set<string>();
    for (const r of rows) {
      const key = `${r.roleId}:${r.bracketId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (r.role.availability === 'LIVE') live.add(r.roleId);
      targets.push({
        roleId: r.roleId,
        roleTitle: r.role.title,
        roleShortCode: r.role.shortCode,
        colorKey: r.role.colorKey as CoverageTarget['colorKey'],
        bracketId: r.bracketId,
        bracketLabel: r.bracket.label,
        curriculumVersion: r.version,
        units: r._count.items,
      });
    }
    return { targets, live };
  }

  /** The asked-for target, else the plan's package on a live role, else the first one. */
  private async pickTarget(
    targets: CoverageTarget[],
    liveRoles: Set<string>,
    query: CoverageQuery,
    studyPlan: Parameters<typeof planBracketId>[1],
  ) {
    if (query.roleId || query.bracketId) {
      const chosen = targets.find(
        (t) =>
          (!query.roleId || t.roleId === query.roleId) &&
          (!query.bracketId || t.bracketId === query.bracketId),
      );
      if (!chosen) throw notFound('A published curriculum for that role and package');
      return chosen;
    }
    const bracketId = await planBracketId(this.db, studyPlan);
    return (
      targets.find((t) => liveRoles.has(t.roleId) && t.bracketId === bracketId) ??
      targets.find((t) => liveRoles.has(t.roleId)) ??
      targets[0] ??
      null
    );
  }

  // ───────────── Lessons and practice ─────────────

  private async lessonFacts(subtopicIds: string[]): Promise<Map<string, LessonFacts>> {
    const modules = await this.db.learningModule.findMany({
      where: { subtopicId: { in: subtopicIds } },
      include: {
        versions: {
          where: { status: { in: [...WORKING, 'PUBLISHED'] } },
          select: { id: true, status: true, versionNumber: true },
        },
      },
    });
    const out = new Map<string, LessonFacts>();
    for (const m of modules) {
      const published = m.versions.find((v) => v.status === 'PUBLISHED');
      const working = m.versions.find((v) => WORKING.includes(v.status));
      const state: CoverageLessonState = published
        ? 'LIVE'
        : working?.status === 'UNDER_REVIEW' || working?.status === 'APPROVED'
          ? 'IN_REVIEW'
          : working
            ? 'IN_PROGRESS'
            : 'NOT_STARTED';
      out.set(m.subtopicId, {
        state,
        liveVersion: published?.versionNumber ?? null,
        workingVersion: working?.versionNumber ?? null,
        workingStatus: working?.status ?? null,
        measuredVersionId: (published ?? working)?.id ?? null,
      });
    }
    return out;
  }

  /** Published questions per unit that a student on this role can see (as the Practice tab). */
  private async practiceCounts(subtopicIds: string[], roleId: string) {
    const questions = await this.db.practiceQuestion.findMany({
      where: {
        published: true,
        subtopics: { some: { subtopicId: { in: subtopicIds } } },
        OR: [{ roles: { none: {} } }, { roles: { some: { roleId } } }],
      },
      select: { subtopics: { select: { subtopicId: true } } },
    });
    const out = new Map<string, number>();
    for (const q of questions)
      for (const { subtopicId } of q.subtopics) out.set(subtopicId, (out.get(subtopicId) ?? 0) + 1);
    return out;
  }

  // ───────────── Interview evidence (super admins) ─────────────

  /**
   * The ML Engineer family's questions in one CTC band, joined with the lessons. Also returns
   * the companies per theme, for the per-unit reach. Null before any data is imported.
   */
  private async evidence(
    band: HiringCtcBand,
    unitInfo: (key: UnitKey) => UnitInfo[],
  ): Promise<{ evidence: CoverageEvidence; themeCompanies: Map<string, Set<string>> } | null> {
    const snapshot = await this.db.hiringSnapshot.findFirst({ orderBy: { importedAt: 'desc' } });
    if (!snapshot) return null;
    const questions = await this.db.hiringQuestion.findMany({
      where: { snapshotId: snapshot.id, family: { in: ['ML_TITLE', 'AI_TITLE'] }, ctcBand: band },
      select: {
        company: true,
        questionType: true,
        codingType: true,
        theme: true,
        prepTopicSlug: true,
        topic: true,
        domain: true,
        text: true,
      },
    });
    const companies = new Set(questions.map((q) => q.company)).size;
    const share = (n: number) => (companies ? n / companies : 0);
    const refs = (keys: readonly UnitKey[]) => keys.flatMap(unitInfo);

    // Themes, and how much of each question the written / live lessons teach.
    const themeRows = new Map<
      PrepTheme,
      { companies: Set<string>; questions: number; topicSlug: string | null }
    >();
    let written = 0;
    let liveTaught = 0;
    const isTheme = (t: string | null): t is PrepTheme =>
      t !== null && (PREP_THEMES as readonly string[]).includes(t);
    for (const q of questions) {
      if (!isTheme(q.theme)) continue;
      const row = themeRows.get(q.theme) ?? {
        companies: new Set<string>(),
        questions: 0,
        topicSlug: q.prepTopicSlug,
      };
      row.companies.add(q.company);
      row.questions++;
      themeRows.set(q.theme, row);
      const keys = THEME_UNITS[q.theme];
      if (keys.length === 0) continue;
      const units = refs(keys).filter((u) => u.inCurriculum);
      written += units.filter((u) => u.state !== 'NOT_STARTED').length / keys.length;
      liveTaught += units.filter((u) => u.state === 'LIVE').length / keys.length;
    }
    const themes = [...themeRows.entries()]
      .map(([theme, r]) => {
        const units = refs(THEME_UNITS[theme]);
        const s = share(r.companies.size);
        return {
          theme,
          topicSlug: r.topicSlug,
          companies: r.companies.size,
          share: s,
          questions: r.questions,
          units,
          flag: flagOf(units, s),
        };
      })
      .sort((a, b) => b.share - a.share || b.questions - a.questions);

    // Interview formats.
    const formatRows = new Map<string, { companies: Set<string>; questions: number }>();
    for (const q of questions) {
      const f = formatOf(q);
      if (!f) continue;
      const row = formatRows.get(f.key) ?? { companies: new Set(), questions: 0 };
      row.companies.add(q.company);
      row.questions++;
      formatRows.set(f.key, row);
    }
    const formats = INTERVIEW_FORMATS.flatMap((f) => {
      const r = formatRows.get(f.key);
      if (!r) return [];
      const units = refs(f.units);
      const s = share(r.companies.size);
      return [
        {
          key: f.key,
          label: f.label,
          companies: r.companies.size,
          share: s,
          questions: r.questions,
          units,
          flag: flagOf(units, s),
        },
      ];
    }).sort((a, b) => b.share - a.share || b.questions - a.questions);

    // Questions outside every theme, grouped by the dashboard's own topic label.
    const outsideRows = questions.filter((q) => !isTheme(q.theme));
    const groups = new Map<
      string,
      { companies: Set<string>; questions: number; domains: Map<string, number>; example: string }
    >();
    for (const q of outsideRows) {
      const label = q.topic.trim() || 'Unlabelled';
      const g = groups.get(label) ?? {
        companies: new Set(),
        questions: 0,
        domains: new Map(),
        example: '',
      };
      g.companies.add(q.company);
      g.questions++;
      g.domains.set(q.domain, (g.domains.get(q.domain) ?? 0) + 1);
      const text = q.text.replace(/\s+/g, ' ').trim();
      if (!g.example && text && !/^https?:\/\//i.test(text)) g.example = text.slice(0, 180);
      groups.set(label, g);
    }

    const themeCompanies = new Map([...themeRows].map(([t, r]) => [t as string, r.companies]));
    const evidence: CoverageEvidence = {
      dataFrom: fromDbDate(snapshot.dataFrom),
      dataTo: fromDbDate(snapshot.dataTo),
      band,
      companies,
      questions: questions.length,
      writtenShare: questions.length ? written / questions.length : 0,
      liveShare: questions.length ? liveTaught / questions.length : 0,
      themes,
      formats,
      outside: {
        questions: outsideRows.length,
        companies: new Set(outsideRows.map((q) => q.company)).size,
        groups: [...groups.entries()]
          .map(([label, g]) => ({
            label,
            domain: [...g.domains.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
            companies: g.companies.size,
            questions: g.questions,
            example: g.example || 'Link to an assignment document',
          }))
          .sort((a, b) => b.companies - a.companies || b.questions - a.questions)
          .slice(0, OUTSIDE_GROUPS),
      },
    };
    return { evidence, themeCompanies };
  }
}

// ───────────── helpers ─────────────

const notStarted = (): LessonFacts => ({
  state: 'NOT_STARTED',
  liveVersion: null,
  workingVersion: null,
  workingStatus: null,
  measuredVersionId: null,
});

function emptySummary(): CoverageResponse['summary'] {
  return {
    units: 0,
    optionalUnits: 0,
    written: 0,
    live: 0,
    inReview: 0,
    inProgress: 0,
    notStarted: 0,
    olderFormat: 0,
    withPractice: 0,
    plannedMinutes: 0,
    measuredMinutes: 0,
    measuredUnits: 0,
    measuredPlannedMinutes: 0,
    studyDays: 0,
    deadlineStudyDays: null,
    fitsWithDailyMinutes: null,
    firstNotLive: null,
    firstNotWritten: null,
  };
}

export function flagOf(units: UnitInfo[], share: number): CoverageFlag | null {
  if (units.length === 0) return 'NO_UNIT';
  const inCurriculum = units.filter((u) => u.inCurriculum);
  if (inCurriculum.length === 0) return 'NOT_IN_CURRICULUM';
  if (share >= CORE_SHARE && inCurriculum.every((u) => u.optional)) return 'OPTIONAL_ONLY';
  if (share >= HIGH_SHARE && !inCurriculum.some((u) => u.priority === 'HIGH')) return 'NOT_HIGH';
  return null;
}

/** Per unit: the themes it teaches and how many companies in the band asked any of them. */
function attachUnitEvidence(
  units: CoverageUnit[],
  evidence: CoverageEvidence,
  themeCompanies: Map<string, Set<string>>,
) {
  const questionsOf = new Map(evidence.themes.map((t) => [t.theme, t.questions]));
  for (const u of units) {
    const key = unitKey(u.topicSlug, u.slug);
    const themes = PREP_THEMES.filter((t) => THEME_UNITS[t].includes(key));
    const companies = new Set<string>();
    let questions = 0;
    for (const t of themes) {
      for (const c of themeCompanies.get(t) ?? []) companies.add(c);
      questions += questionsOf.get(t) ?? 0;
    }
    u.evidence = {
      themes: [...themes],
      companies: companies.size,
      share: evidence.companies ? companies.size / evidence.companies : 0,
      questions,
    };
  }
}

function contentSignals(
  units: CoverageUnit[],
  s: CoverageResponse['summary'],
  schedule: CoverageResponse['schedule'],
): CoverageSignal[] {
  const out: CoverageSignal[] = [];
  const titles = (list: CoverageUnit[], max = 5) =>
    list.length > max
      ? `${list
          .slice(0, max)
          .map((u) => u.title)
          .join(', ')} and ${list.length - max} more`
      : list.map((u) => u.title).join(', ');

  if (s.units === 0) return out;

  if (s.firstNotLive) {
    const afterReview = units.find(
      (u) => u.lesson.state !== 'LIVE' && u.lesson.state !== 'IN_REVIEW',
    );
    const moves =
      s.inReview > 0
        ? afterReview
          ? ` Publishing the ${s.inReview} lessons in review would move this to day ${afterReview.startDay ?? 0}.`
          : ` Publishing the ${s.inReview} lessons in review would make every unit live.`
        : '';
    out.push({
      tone: s.firstNotLive.day <= 7 ? 'bad' : 'warn',
      title: `Students reach a lesson that isn't live on study day ${s.firstNotLive.day}`,
      detail: `${s.firstNotLive.title} is the first unit without a published lesson. ${s.live} of ${s.units} lessons are live.${moves}`,
      subtopicIds: [s.firstNotLive.subtopicId],
    });
  } else {
    out.push({
      tone: 'ok',
      title: 'Every unit has a live lesson',
      detail: `All ${s.units} units can be opened by students.`,
      subtopicIds: [],
    });
  }

  const highMissing = units.filter(
    (u) => u.priority === 'HIGH' && !u.optional && u.lesson.state === 'NOT_STARTED',
  );
  if (highMissing.length > 0) {
    out.push({
      tone: 'bad',
      title: `${highMissing.length} high-priority ${highMissing.length === 1 ? 'unit has' : 'units have'} no lesson yet`,
      detail: titles(highMissing),
      subtopicIds: highMissing.map((u) => u.subtopicId),
    });
  }

  if (s.withPractice === 0) {
    out.push({
      tone: 'warn',
      title: 'No unit has practice questions',
      detail:
        'The Practice list on every topic is empty. Add questions in Practice and tag them to units.',
      subtopicIds: [],
    });
  } else if (s.withPractice < s.units) {
    out.push({
      tone: 'info',
      title: `${s.withPractice} of ${s.units} units have practice questions`,
      detail: 'Tag questions to the remaining units in Practice.',
      subtopicIds: [],
    });
  }

  const days = `${schedule.dailyMinutes} min a day, ${weekdayPhrase(schedule.studyWeekdays)}`;
  if (s.deadlineStudyDays !== null) {
    if (s.studyDays > s.deadlineStudyDays) {
      out.push({
        tone: 'bad',
        title: `The roadmap needs ${s.studyDays} study days; the deadline allows ${s.deadlineStudyDays}`,
        detail: `At ${days}.${s.fitsWithDailyMinutes ? ` About ${s.fitsWithDailyMinutes} min a day would fit.` : ''} Change the plan in Study plan.`,
        subtopicIds: [],
      });
    } else {
      out.push({
        tone: 'ok',
        title: 'The roadmap fits the deadline',
        detail: `${s.studyDays} of ${s.deadlineStudyDays} study days at ${days}.`,
        subtopicIds: [],
      });
    }
  } else {
    out.push({
      tone: 'info',
      title: `The roadmap takes ${s.studyDays} study days`,
      detail: `At ${days}, with no deadline set.`,
      subtopicIds: [],
    });
  }

  if (s.measuredUnits >= 3 && s.measuredPlannedMinutes > 0) {
    const ratio = s.measuredMinutes / s.measuredPlannedMinutes;
    if (ratio < 0.8 || ratio > 1.2) {
      out.push({
        tone: 'info',
        title: `Written lessons take ${pct(ratio)} of the time the roadmap plans for them`,
        detail: `${hours(s.measuredMinutes)} measured against ${hours(s.measuredPlannedMinutes)} planned for the same ${s.measuredUnits} units, practice time left out. The roadmap sizes units by depth and complexity, so its days are ${ratio < 1 ? 'longer' : 'shorter'} than the lessons need.`,
        subtopicIds: [],
      });
    }
  }

  const older = units.filter((u) => u.lesson.olderFormat);
  if (older.length > 0) {
    const named = older.map((u) => {
      const { state, workingVersion, workingStatus } = u.lesson;
      if (state !== 'LIVE' || workingVersion === null) return u.title;
      const where =
        workingStatus === 'UNDER_REVIEW' || workingStatus === 'APPROVED' ? 'in review' : 'a draft';
      return `${u.title} (v${workingVersion} is ${where})`;
    });
    out.push({
      tone: 'info',
      title: `${older.length} ${older.length === 1 ? 'lesson uses' : 'lessons use'} the older format`,
      detail: `No slide decks in the version students see: ${named.join(', ')}.`,
      subtopicIds: older.map((u) => u.subtopicId),
    });
  }
  return out;
}

function evidenceSignals(e: CoverageEvidence): CoverageSignal[] {
  const out: CoverageSignal[] = [];
  const reach = (r: { companies: number; share: number; questions: number }) =>
    `${r.companies} of ${e.companies} companies in this band (${pct(r.share)}), ${r.questions} questions.`;
  const unitList = (units: Array<{ title: string }>) => units.map((u) => u.title).join(', ');

  if (e.companies < SMALL_SAMPLE) {
    out.push({
      tone: 'info',
      title: `Only ${e.companies} companies in this band: read the shares as rough`,
      detail:
        'One company more or less moves a share by several points. Weigh the flags below with the larger band before changing priorities.',
      subtopicIds: [],
    });
  }

  for (const f of e.formats) {
    if (f.flag !== 'NO_UNIT' || f.share < SIGNAL_SHARE) continue;
    out.push({
      tone: 'warn',
      title: `No unit prepares students for: ${f.label.toLowerCase()}`,
      detail: reach(f),
      subtopicIds: [],
    });
  }
  for (const t of e.themes) {
    if (!t.flag || t.share < SIGNAL_SHARE || CATCH_ALL_THEMES.has(t.theme as PrepTheme)) continue;
    const ids = t.units.map((u) => u.subtopicId);
    const title =
      t.flag === 'NO_UNIT'
        ? `No unit teaches "${t.theme}"`
        : t.flag === 'NOT_IN_CURRICULUM'
          ? `"${t.theme}" is taught only in units outside this curriculum`
          : t.flag === 'OPTIONAL_ONLY'
            ? `"${t.theme}" is asked widely but taught only in optional units`
            : `"${t.theme}" is asked widely but no unit for it is high priority`;
    out.push({
      tone: 'warn',
      title,
      detail: `${reach(t)}${t.units.length ? ` Units: ${unitList(t.units)}.` : ''}`,
      subtopicIds: ids,
    });
  }
  if (e.outside.questions > 0 && e.questions > 0) {
    const top = e.outside.groups
      .slice(0, 3)
      .map((g) => `${g.label} (${g.companies})`)
      .join(', ');
    out.push({
      tone: 'info',
      title: `${pct(e.outside.questions / e.questions)} of interview questions fall outside the curriculum`,
      detail: `${e.outside.questions} questions from ${e.outside.companies} companies. Largest groups: ${top}.`,
      subtopicIds: [],
    });
  }
  out.push({
    tone: 'info',
    title: `Written lessons teach about ${pct(e.writtenShare)} of this band's interview questions`,
    detail: `Live lessons: ${pct(e.liveShare)}. A theme spread over several units counts in equal parts.`,
    subtopicIds: [],
  });
  return out;
}
