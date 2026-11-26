/**
 * The Hiring Intelligence dashboard export (the JSON its app loads from /api/hiring), validated
 * and decoded into plain rows. The file is untrusted input: every index is range-checked and every
 * string length-capped before anything reaches the database.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { bandOf, familyOf, familyOfAll, themeOf } from './hiring-rules.ts';

const Index = z.number().int().min(0);
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Name = z.string().max(300);
const Lpa = z.number().min(0).max(1000).nullable().optional();

export const HiringExport = z.object({
  dicts: z.object({
    round: z.array(Name),
    company: z.array(Name),
    role: z.array(Name),
    domain: z.array(Name),
    skill: z.array(Name),
    topic: z.array(Name),
    qtype: z.array(Name),
    coding: z.array(Name),
    date: z.array(Day),
  }),
  opportunities: z
    .array(
      z.object({
        k: z.string().max(300),
        co: Index,
        roles: z.array(Index).max(50),
        domains: z.array(Index).max(100),
        skills: z.array(Index).max(500),
        mn: Lpa,
        mx: Lpa,
        op: z.number().int().min(0).max(100_000).nullable().optional(),
        from: Day,
        to: Day,
        nq: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(20_000),
  // [opportunity, company, role, domain, skills[], topic, subtopic, question type, coding type,
  //  round, difficulty (0 Easy, 1 Medium, 2 Hard, -1 unknown), date, text]
  questions: z
    .array(
      z.tuple([
        Index,
        Index,
        Index,
        Index,
        z.array(Index).max(50),
        Index,
        z.string().max(300).nullable(),
        Index,
        Index,
        Index,
        z.number().int().min(-1).max(2).nullable(),
        Index,
        z.string().min(1).max(5000),
      ]),
    )
    .min(1)
    .max(500_000),
  meta: z.object({
    source: z.string().max(200),
    dateFrom: Day,
    dateTo: Day,
    companies: z.number().int().min(0),
    openings: z.number().int().min(0),
  }),
});
export type HiringExport = z.infer<typeof HiringExport>;

const DIFFICULTY = ['Easy', 'Medium', 'Hard'] as const;

export interface DecodedOpportunity {
  position: number;
  externalKey: string;
  company: string;
  roles: string[];
  domains: string[];
  skills: string[];
  ctcMinLpa: number | null;
  ctcMaxLpa: number | null;
  ctcBand: ReturnType<typeof bandOf>;
  openings: number | null;
  firstInterview: string;
  lastInterview: string;
  questionCount: number;
  family: ReturnType<typeof familyOf>;
}

export interface DecodedQuestion {
  opportunity: number;
  company: string;
  role: string;
  domain: string;
  skills: string[];
  topic: string;
  subtopic: string | null;
  questionType: string;
  codingType: string;
  round: string;
  difficulty: string | null;
  askedOn: string;
  text: string;
  family: ReturnType<typeof familyOf>;
  ctcBand: ReturnType<typeof bandOf>;
  theme: string | null;
  prepTopicSlug: string | null;
}

export interface DecodedExport {
  checksum: string;
  source: string;
  dataFrom: string;
  dataTo: string;
  companyCount: number;
  openingCount: number;
  opportunities: DecodedOpportunity[];
  questions: DecodedQuestion[];
}

export class HiringExportError extends Error {}

/** sha-256 of the export's canonical JSON, so re-saving the same data gives the same checksum. */
export const exportChecksum = (data: HiringExport) =>
  createHash('sha256').update(JSON.stringify(data)).digest('hex');

/** Validates and decodes an export. Throws HiringExportError with a readable message. */
export function decodeHiringExport(raw: unknown): DecodedExport {
  const parsed = HiringExport.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HiringExportError(
      `This is not a Hiring Intelligence export (${issue?.path.join('.') || 'file'}: ${issue?.message}).`,
    );
  }
  const data = parsed.data;
  const D = data.dicts;
  const pick = (list: string[], i: number, what: string) => {
    const v = list[i];
    if (v === undefined)
      throw new HiringExportError(`The export refers to a missing ${what} (#${i}).`);
    return v.trim();
  };

  const opportunities: DecodedOpportunity[] = data.opportunities.map((o, position) => {
    const roles = o.roles.map((r) => pick(D.role, r, 'job title'));
    const min = o.mn ?? null;
    const max = o.mx ?? null;
    return {
      position,
      externalKey: o.k,
      company: pick(D.company, o.co, 'company'),
      roles,
      domains: o.domains.map((i) => pick(D.domain, i, 'domain')),
      skills: o.skills.map((i) => pick(D.skill, i, 'skill')),
      ctcMinLpa: min,
      ctcMaxLpa: max,
      ctcBand: bandOf(min, max),
      openings: o.op ?? null,
      firstInterview: o.from,
      lastInterview: o.to,
      questionCount: o.nq,
      family: familyOfAll(roles),
    };
  });

  const questions: DecodedQuestion[] = data.questions.map((q) => {
    const [opp, co, ro, dom, sk, top, sub, qt, cod, rnd, diff, day, text] = q;
    const opportunity = opportunities[opp];
    if (!opportunity)
      throw new HiringExportError(`A question refers to a missing opening (#${opp}).`);
    const decoded = {
      opportunity: opp,
      company: pick(D.company, co, 'company'),
      role: pick(D.role, ro, 'job title'),
      domain: pick(D.domain, dom, 'domain'),
      skills: sk.map((i) => pick(D.skill, i, 'skill')),
      topic: pick(D.topic, top, 'topic'),
      subtopic: sub?.trim() || null,
      questionType: pick(D.qtype, qt, 'question type'),
      codingType: pick(D.coding, cod, 'coding type'),
      round: pick(D.round, rnd, 'round'),
      difficulty: diff !== null && diff >= 0 ? (DIFFICULTY[diff] ?? null) : null,
      askedOn: pick(D.date, day, 'date'),
      text: text.trim(),
    };
    return {
      ...decoded,
      family: familyOf(decoded.role),
      ctcBand: opportunity.ctcBand,
      ...themeOf({ ...decoded, subtopic: decoded.subtopic ?? '' }),
    };
  });

  return {
    checksum: exportChecksum(data),
    source: data.meta.source,
    dataFrom: data.meta.dateFrom,
    dataTo: data.meta.dateTo,
    companyCount: new Set(opportunities.map((o) => o.company)).size,
    openingCount: data.meta.openings,
    opportunities,
    questions,
  };
}
