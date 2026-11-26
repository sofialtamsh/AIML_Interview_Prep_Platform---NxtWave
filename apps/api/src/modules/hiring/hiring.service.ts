import type {
  HiringFacetsResponse,
  HiringImportResponse,
  HiringOpeningQuery,
  HiringOpeningsResponse,
  HiringOverviewResponse,
  HiringQuestionQuery,
  HiringQuestionsResponse,
  HiringScope,
  HiringSnapshotDto,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Db, Prisma } from '../../db/prisma.ts';
import { fromDbDate, toDbDate } from '../../lib/dates.ts';
import { isUniqueViolation } from '../../lib/db-errors.ts';
import { AppError } from '../../lib/errors.ts';
import { AuditService } from '../audit/audit.service.ts';
import { type DecodedExport, decodeHiringExport, HiringExportError } from './hiring-export.ts';

interface Actor {
  id: string;
  ip: string | null;
}

type Snapshot = NonNullable<Awaited<ReturnType<Db['hiringSnapshot']['findFirst']>>>;

const BATCH = 2000;

const familyWhere = (scope: HiringScope) =>
  scope === 'ALL'
    ? {}
    : scope === 'ML_FAMILY'
      ? { family: { in: ['ML_TITLE' as const, 'AI_TITLE' as const] } }
      : { family: scope };

const counts = <T extends Record<string, unknown>>(
  rows: Array<T & { _count: { _all: number } }>,
  key: keyof T,
) =>
  rows
    .map((r) => ({ value: String(r[key] ?? ''), count: r._count._all }))
    .filter((r) => r.value)
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

/** The imported Hiring Intelligence data. Super admins only (the routes enforce it). */
export class HiringService {
  private readonly audit: AuditService;

  constructor(private readonly ctx: AppContext) {
    this.audit = new AuditService(ctx);
  }

  private get db() {
    return this.ctx.db;
  }

  private current() {
    return this.db.hiringSnapshot.findFirst({ orderBy: { importedAt: 'desc' } });
  }

  private async snapshotDto(s: Snapshot): Promise<HiringSnapshotDto> {
    const by = s.importedById
      ? await this.db.user.findUnique({
          where: { id: s.importedById },
          select: { email: true, adminProfile: { select: { fullName: true } } },
        })
      : null;
    return {
      id: s.id,
      source: s.source,
      dataFrom: fromDbDate(s.dataFrom),
      dataTo: fromDbDate(s.dataTo),
      companies: s.companyCount,
      opportunities: s.opportunityCount,
      openings: s.openingCount,
      questions: s.questionCount,
      importedAt: s.importedAt.toISOString(),
      importedBy: by ? (by.adminProfile?.fullName ?? by.email) : null,
    };
  }

  async overview(): Promise<HiringOverviewResponse> {
    const s = await this.current();
    const empty = {
      companies: 0,
      opportunities: 0,
      questions: 0,
      companiesUnder8: 0,
      companiesFrom8: 0,
      mlTitleCompanies: 0,
      aiTitleCompanies: 0,
    };
    if (!s) return { snapshot: null, family: empty, topics: [], rounds: [], difficulty: [] };

    const where = { snapshotId: s.id, ...familyWhere('ML_FAMILY') };
    const [opportunities, byBand, byFamily, coverage, rounds, difficulty, topics] =
      await Promise.all([
        this.db.hiringOpportunity.count({ where }),
        this.db.$queryRaw<
          Array<{ band: string | null; total: number; companies: number; questions: number }>
        >`
          SELECT ctc_band::text AS band, GROUPING(ctc_band)::int AS total,
                 COUNT(DISTINCT company)::int AS companies, COUNT(*)::int AS questions
          FROM hiring_question WHERE snapshot_id = ${s.id}::uuid AND family IS NOT NULL
          GROUP BY ROLLUP (ctc_band)`,
        this.db.$queryRaw<Array<{ family: string; companies: number }>>`
          SELECT family::text AS family, COUNT(DISTINCT company)::int AS companies
          FROM hiring_question WHERE snapshot_id = ${s.id}::uuid AND family IS NOT NULL
          GROUP BY family`,
        this.db.$queryRaw<
          Array<{
            slug: string;
            band: string | null;
            total: number;
            companies: number;
            questions: number;
          }>
        >`
          SELECT prep_topic_slug AS slug, ctc_band::text AS band, GROUPING(ctc_band)::int AS total,
                 COUNT(DISTINCT company)::int AS companies, COUNT(*)::int AS questions
          FROM hiring_question
          WHERE snapshot_id = ${s.id}::uuid AND family IS NOT NULL AND prep_topic_slug IS NOT NULL
          GROUP BY GROUPING SETS ((prep_topic_slug), (prep_topic_slug, ctc_band))`,
        this.db.hiringQuestion.groupBy({ by: ['round'], where, _count: { _all: true } }),
        this.db.hiringQuestion.groupBy({ by: ['difficulty'], where, _count: { _all: true } }),
        this.db.topic.findMany({ select: { slug: true, title: true, sortOrder: true } }),
      ]);

    // GROUPING(...) = 1 marks the all-bands total (a plain null band means "CTC unknown").
    const total = byBand.find((r) => r.total === 1) ?? { companies: 0, questions: 0 };
    const bandCompanies = (band: string) =>
      byBand.find((r) => r.total === 0 && r.band === band)?.companies ?? 0;
    const under8 = bandCompanies('UNDER_8_LPA');
    const from8 = bandCompanies('FROM_8_LPA');

    const topicBySlug = new Map(topics.map((t) => [t.slug, t]));
    const share = (n: number, of: number) => (of ? n / of : null);
    const bySlug = new Map<
      string,
      { questions: number; companies: number; u8: number; f8: number }
    >();
    for (const r of coverage) {
      const row = bySlug.get(r.slug) ?? { questions: 0, companies: 0, u8: 0, f8: 0 };
      if (r.total === 1) Object.assign(row, { questions: r.questions, companies: r.companies });
      else if (r.band === 'UNDER_8_LPA') row.u8 = r.companies;
      else if (r.band === 'FROM_8_LPA') row.f8 = r.companies;
      bySlug.set(r.slug, row);
    }
    return {
      snapshot: await this.snapshotDto(s),
      family: {
        companies: total.companies,
        opportunities,
        questions: total.questions,
        companiesUnder8: under8,
        companiesFrom8: from8,
        mlTitleCompanies: byFamily.find((r) => r.family === 'ML_TITLE')?.companies ?? 0,
        aiTitleCompanies: byFamily.find((r) => r.family === 'AI_TITLE')?.companies ?? 0,
      },
      topics: [...bySlug.entries()]
        .map(([slug, r]) => ({
          slug,
          title: topicBySlug.get(slug)?.title ?? slug,
          questions: r.questions,
          companies: r.companies,
          share: share(r.companies, total.companies) ?? 0,
          shareUnder8: share(r.u8, under8),
          shareFrom8: share(r.f8, from8),
        }))
        .sort((a, b) => b.share - a.share || a.title.localeCompare(b.title)),
      rounds: counts(rounds, 'round'),
      difficulty: counts(difficulty, 'difficulty'),
    };
  }

  async facets(scope: HiringScope): Promise<HiringFacetsResponse> {
    const s = await this.current();
    if (!s) {
      return {
        companies: [],
        roles: [],
        domains: [],
        rounds: [],
        questionTypes: [],
        themes: [],
        prepTopics: [],
      };
    }
    const where = { snapshotId: s.id, ...familyWhere(scope) };
    const _count = { _all: true } as const;
    const [companies, roles, domains, rounds, questionTypes, themes, prep, topics] =
      await Promise.all([
        this.db.hiringQuestion.groupBy({ by: ['company'], where, _count }),
        this.db.hiringQuestion.groupBy({ by: ['role'], where, _count }),
        this.db.hiringQuestion.groupBy({ by: ['domain'], where, _count }),
        this.db.hiringQuestion.groupBy({ by: ['round'], where, _count }),
        this.db.hiringQuestion.groupBy({ by: ['questionType'], where, _count }),
        this.db.hiringQuestion.groupBy({ by: ['theme'], where, _count }),
        this.db.hiringQuestion.groupBy({ by: ['prepTopicSlug'], where, _count }),
        this.db.topic.findMany({ select: { slug: true, title: true, sortOrder: true } }),
      ]);
    const topicBySlug = new Map(topics.map((t) => [t.slug, t]));
    return {
      companies: counts(companies, 'company'),
      roles: counts(roles, 'role'),
      domains: counts(domains, 'domain'),
      rounds: counts(rounds, 'round'),
      questionTypes: counts(questionTypes, 'questionType'),
      themes: counts(themes, 'theme'),
      prepTopics: prep
        .map((p) => {
          const t = p.prepTopicSlug ? topicBySlug.get(p.prepTopicSlug) : undefined;
          return {
            slug: p.prepTopicSlug ?? 'none',
            title: p.prepTopicSlug ? (t?.title ?? p.prepTopicSlug) : 'Outside the curriculum',
            count: p._count._all,
            order: p.prepTopicSlug ? (t?.sortOrder ?? 9_000) : 10_000,
          };
        })
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
        .map(({ order: _order, ...rest }) => rest),
    };
  }

  async questions(query: HiringQuestionQuery): Promise<HiringQuestionsResponse> {
    const { page, pageSize } = query;
    const s = await this.current();
    if (!s) return { items: [], page, pageSize, total: 0 };
    const where: Prisma.HiringQuestionWhereInput = {
      snapshotId: s.id,
      ...familyWhere(query.scope),
      ...(query.prepTopic
        ? { prepTopicSlug: query.prepTopic === 'none' ? null : query.prepTopic }
        : {}),
      ...(query.theme ? { theme: query.theme } : {}),
      ...(query.company ? { company: query.company } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.domain ? { domain: query.domain } : {}),
      ...(query.round ? { round: query.round } : {}),
      ...(query.questionType ? { questionType: query.questionType } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.band ? { ctcBand: query.band } : {}),
      ...(query.q
        ? {
            OR: [
              { text: { contains: query.q, mode: 'insensitive' as const } },
              { topic: { contains: query.q, mode: 'insensitive' as const } },
              { subtopic: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.db.hiringQuestion.count({ where }),
      this.db.hiringQuestion.findMany({
        where,
        orderBy: [{ askedOn: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: rows.map((q) => ({
        id: q.id,
        text: q.text,
        company: q.company,
        role: q.role,
        domain: q.domain,
        topic: q.topic,
        subtopic: q.subtopic,
        skills: q.skills,
        questionType: q.questionType,
        codingType: q.codingType,
        round: q.round,
        difficulty: q.difficulty,
        askedOn: fromDbDate(q.askedOn),
        family: q.family,
        band: q.ctcBand,
        theme: q.theme,
        prepTopicSlug: q.prepTopicSlug,
      })),
    };
  }

  /** Openings are few (hundreds), so they are filtered in memory. */
  async openings(query: HiringOpeningQuery): Promise<HiringOpeningsResponse> {
    const { page, pageSize } = query;
    const s = await this.current();
    if (!s) return { items: [], page, pageSize, total: 0 };
    const rows = await this.db.hiringOpportunity.findMany({
      where: {
        snapshotId: s.id,
        ...familyWhere(query.scope),
        ...(query.band ? { ctcBand: query.band } : {}),
      },
      orderBy: [{ lastInterview: 'desc' }, { position: 'asc' }],
    });
    const needle = query.q?.toLowerCase();
    const found = needle
      ? rows.filter(
          (o) =>
            o.company.toLowerCase().includes(needle) ||
            o.roles.some((r) => r.toLowerCase().includes(needle)),
        )
      : rows;
    return {
      page,
      pageSize,
      total: found.length,
      items: found.slice((page - 1) * pageSize, page * pageSize).map((o) => ({
        id: o.id,
        company: o.company,
        roles: o.roles,
        domains: o.domains,
        skills: o.skills,
        ctcMinLpa: o.ctcMinLpa,
        ctcMaxLpa: o.ctcMaxLpa,
        band: o.ctcBand,
        openings: o.openings,
        firstInterview: fromDbDate(o.firstInterview),
        lastInterview: fromDbDate(o.lastInterview),
        questions: o.questionCount,
        family: o.family,
      })),
    };
  }

  /** Replaces the current data with an export. Importing the current file again is a no-op. */
  async import(raw: unknown, actor: Actor | null): Promise<HiringImportResponse> {
    let data: DecodedExport;
    try {
      data = decodeHiringExport(raw);
    } catch (err) {
      if (err instanceof HiringExportError) throw new AppError('VALIDATION_ERROR', err.message);
      throw err;
    }
    const existing = await this.db.hiringSnapshot.findUnique({
      where: { checksum: data.checksum },
    });
    if (existing) return { snapshot: await this.snapshotDto(existing), imported: false };

    let snapshot: Snapshot;
    try {
      snapshot = await this.db.$transaction(
        async (tx) => {
          await tx.hiringSnapshot.deleteMany({});
          const created = await tx.hiringSnapshot.create({
            data: {
              source: data.source,
              checksum: data.checksum,
              dataFrom: toDbDate(data.dataFrom),
              dataTo: toDbDate(data.dataTo),
              companyCount: data.companyCount,
              opportunityCount: data.opportunities.length,
              openingCount: data.openingCount,
              questionCount: data.questions.length,
              importedById: actor?.id ?? null,
            },
          });
          const opps = await tx.hiringOpportunity.createManyAndReturn({
            data: data.opportunities.map((o) => ({
              snapshotId: created.id,
              position: o.position,
              externalKey: o.externalKey,
              company: o.company,
              roles: o.roles,
              domains: o.domains,
              skills: o.skills,
              ctcMinLpa: o.ctcMinLpa,
              ctcMaxLpa: o.ctcMaxLpa,
              ctcBand: o.ctcBand,
              openings: o.openings,
              firstInterview: toDbDate(o.firstInterview),
              lastInterview: toDbDate(o.lastInterview),
              questionCount: o.questionCount,
              family: o.family,
            })),
            select: { id: true, position: true },
          });
          const oppId = new Map(opps.map((o) => [o.position, o.id]));
          for (let i = 0; i < data.questions.length; i += BATCH) {
            await tx.hiringQuestion.createMany({
              data: data.questions.slice(i, i + BATCH).map((q) => ({
                snapshotId: created.id,
                opportunityId: oppId.get(q.opportunity) as string,
                company: q.company,
                role: q.role,
                domain: q.domain,
                skills: q.skills,
                topic: q.topic,
                subtopic: q.subtopic,
                questionType: q.questionType,
                codingType: q.codingType,
                round: q.round,
                difficulty: q.difficulty,
                askedOn: toDbDate(q.askedOn),
                text: q.text,
                family: q.family,
                ctcBand: q.ctcBand,
                theme: q.theme,
                prepTopicSlug: q.prepTopicSlug,
              })),
            });
          }
          return created;
        },
        { timeout: 180_000, maxWait: 10_000 },
      );
    } catch (err) {
      // Someone imported the same file at the same moment.
      if (isUniqueViolation(err)) {
        const again = await this.db.hiringSnapshot.findUniqueOrThrow({
          where: { checksum: data.checksum },
        });
        return { snapshot: await this.snapshotDto(again), imported: false };
      }
      throw err;
    }
    await this.audit.record({
      actorId: actor?.id ?? null,
      action: 'hiring.snapshot.imported',
      entityType: 'hiring_snapshot',
      entityId: snapshot.id,
      after: {
        source: data.source,
        dataFrom: data.dataFrom,
        dataTo: data.dataTo,
        questions: data.questions.length,
        opportunities: data.opportunities.length,
      },
      ip: actor?.ip ?? null,
    });
    return { snapshot: await this.snapshotDto(snapshot), imported: true };
  }
}
