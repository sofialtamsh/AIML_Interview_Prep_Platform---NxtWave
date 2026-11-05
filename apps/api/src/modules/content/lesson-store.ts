/**
 * Persistence for lesson documents: a version is an ordered list of pointers to immutable
 * section revisions (docs/03 §7). Identical sections reuse the same revision (SHA-256 of the
 * canonical JSON), so saving a whole document only creates revisions for what changed.
 */
import { createHash } from 'node:crypto';
import {
  canonicalJson,
  canonicalSection,
  LessonDocument,
  Objective,
  Section,
  type SectionKind,
} from '@app/content';
import type { ContentIssue } from '@app/contracts';
import type { z } from 'zod';
import type { Db, Prisma } from '../../db/prisma.ts';
import type { ContentOrigin } from '../../generated/prisma/enums.ts';
import { AppError } from '../../lib/errors.ts';

type Tx = Prisma.TransactionClient | Db;

export const sectionHash = (s: Section) =>
  createHash('sha256')
    .update(canonicalJson(canonicalSection(s)))
    .digest('hex');

/** Zod issues → `{ path, message }` with a readable dotted path. */
export function issuesOf(error: z.ZodError, prefix: Array<string | number> = []): ContentIssue[] {
  return error.issues.map((i) => ({
    path: [...prefix, ...i.path].map(String).join('.') || '(document)',
    message: i.message,
  }));
}

export function invalidContent(issues: ContentIssue[], message?: string): AppError {
  const first = issues[0];
  return new AppError(
    'VALIDATION_ERROR',
    message ??
      (issues.length === 1 && first
        ? `This lesson has a problem at ${first.path}: ${first.message}`
        : `This lesson has ${issues.length} problems. Fix them and try again.`),
    { issues: issues.slice(0, 50) },
  );
}

/** Validates the shape, then the references (concept keys and role slugs) against the database. */
export async function parseDocument(db: Tx, raw: unknown): Promise<LessonDocument> {
  const parsed = LessonDocument.safeParse(raw);
  if (!parsed.success) throw invalidContent(issuesOf(parsed.error));
  await assertReferences(db, parsed.data.sections);
  return { ...parsed.data, sections: parsed.data.sections.map(canonicalSection) };
}

export async function parseSection(db: Tx, raw: unknown, path: Array<string | number>) {
  const parsed = Section.safeParse(raw);
  if (!parsed.success) throw invalidContent(issuesOf(parsed.error, path));
  await assertReferences(db, [parsed.data], path);
  return canonicalSection(parsed.data);
}

async function assertReferences(db: Tx, sections: Section[], prefix?: Array<string | number>) {
  const conceptKeys = [...new Set(sections.flatMap((s) => s.conceptKeys))];
  const roleSlugs = [...new Set(sections.flatMap((s) => s.roleScope))];
  const [concepts, roles] = await Promise.all([
    conceptKeys.length
      ? db.concept.findMany({ where: { key: { in: conceptKeys } }, select: { key: true } })
      : [],
    roleSlugs.length
      ? db.careerRole.findMany({ where: { slug: { in: roleSlugs } }, select: { slug: true } })
      : [],
  ]);
  const knownConcepts = new Set(concepts.map((c) => c.key));
  const knownRoles = new Set(roles.map((r) => r.slug));
  const issues: ContentIssue[] = [];
  sections.forEach((s, i) => {
    const at = prefix ?? ['sections', i];
    for (const k of s.conceptKeys) {
      if (!knownConcepts.has(k)) {
        issues.push({
          path: [...at, 'conceptKeys'].join('.'),
          message: `Unknown concept "${k}". Add it under Curriculum → Topics & subtopics first.`,
        });
      }
    }
    for (const r of s.roleScope) {
      if (!knownRoles.has(r)) {
        issues.push({ path: [...at, 'roleScope'].join('.'), message: `Unknown role "${r}"` });
      }
    }
  });
  if (issues.length) throw invalidContent(issues);
}

/**
 * Points a version at these sections, in this order. Unchanged sections reuse their existing
 * revision; changed ones get a new immutable revision (with its concept tags).
 */
export async function writeSections(
  tx: Prisma.TransactionClient,
  opts: {
    moduleId: string;
    versionId: string;
    sections: Section[];
    origin: ContentOrigin;
    actorId: string | null;
    /** Provenance stored on new revisions, by section key (AI job, prompt, model, code checks). */
    meta?: Record<string, Prisma.InputJsonValue>;
  },
) {
  const hashed = opts.sections.map((s) => ({ s, hash: sectionHash(s) }));
  const existing = await tx.sectionRevision.findMany({
    where: {
      moduleId: opts.moduleId,
      OR: hashed.map(({ s, hash }) => ({ sectionKey: s.key, contentHash: hash })),
    },
    select: { id: true, sectionKey: true, contentHash: true },
  });
  const found = new Map(existing.map((r) => [`${r.sectionKey}#${r.contentHash}`, r.id]));

  const conceptIds = new Map(
    (
      await tx.concept.findMany({
        where: { key: { in: [...new Set(opts.sections.flatMap((s) => s.conceptKeys))] } },
        select: { id: true, key: true },
      })
    ).map((c) => [c.key, c.id]),
  );

  const pointers: Array<{ sectionKey: string; sectionRevisionId: string; orderIndex: number }> = [];
  for (const [orderIndex, { s, hash }] of hashed.entries()) {
    let id = found.get(`${s.key}#${hash}`);
    if (!id) {
      const created = await tx.sectionRevision.create({
        data: {
          moduleId: opts.moduleId,
          sectionKey: s.key,
          kind: s.kind,
          title: s.title ?? null,
          depthRank: s.depthRank,
          slotKey: s.slotKey ?? null,
          roleScope: s.roleScope,
          estimatedMinutes: s.estimatedMinutes ?? null,
          body: s.body as Prisma.InputJsonValue,
          contentHash: hash,
          origin: opts.origin,
          ...(opts.meta?.[s.key] ? { generationMeta: opts.meta[s.key] } : {}),
          createdById: opts.actorId,
          concepts: {
            create: s.conceptKeys.flatMap((k) => {
              const conceptId = conceptIds.get(k);
              return conceptId ? [{ conceptId }] : [];
            }),
          },
        },
        select: { id: true },
      });
      id = created.id;
      found.set(`${s.key}#${hash}`, id);
    }
    pointers.push({ sectionKey: s.key, sectionRevisionId: id, orderIndex });
  }

  await tx.moduleVersionSection.deleteMany({ where: { moduleVersionId: opts.versionId } });
  await tx.moduleVersionSection.createMany({
    data: pointers.map((p) => ({ ...p, moduleVersionId: opts.versionId })),
  });
}

const revisionSelect = {
  id: true,
  sectionKey: true,
  kind: true,
  title: true,
  depthRank: true,
  slotKey: true,
  roleScope: true,
  estimatedMinutes: true,
  body: true,
  contentHash: true,
  origin: true,
  createdAt: true,
  concepts: { select: { concept: { select: { key: true } } } },
} satisfies Prisma.SectionRevisionSelect;

export type StoredRevision = Prisma.SectionRevisionGetPayload<{ select: typeof revisionSelect }>;

/** A stored revision back as a lesson section (the shape authors write). */
export function toSection(r: StoredRevision): Section {
  return {
    key: r.sectionKey,
    kind: r.kind as SectionKind,
    ...(r.title ? { title: r.title } : {}),
    depthRank: r.depthRank,
    ...(r.slotKey ? { slotKey: r.slotKey } : {}),
    roleScope: [...r.roleScope].sort(),
    conceptKeys: r.concepts.map((c) => c.concept.key).sort(),
    ...(r.estimatedMinutes ? { estimatedMinutes: r.estimatedMinutes } : {}),
    body: r.body,
  } as Section;
}

/** The sections of a version, in order, with the revisions behind them. */
export async function loadSections(db: Tx, versionId: string) {
  const rows = await db.moduleVersionSection.findMany({
    where: { moduleVersionId: versionId },
    orderBy: { orderIndex: 'asc' },
    include: { revision: { select: revisionSelect } },
  });
  return rows.map((r) => ({ revision: r.revision, section: toSection(r.revision) }));
}

export async function loadDocument(db: Tx, versionId: string) {
  const version = await db.moduleVersion.findUnique({ where: { id: versionId } });
  if (!version) return null;
  const sections = await loadSections(db, versionId);
  const document: LessonDocument = {
    title: version.title,
    ...(version.subtitle ? { subtitle: version.subtitle } : {}),
    objectives: Objective.array().parse(version.objectives),
    sections: sections.map((s) => s.section),
  };
  return { version, document, sections };
}
