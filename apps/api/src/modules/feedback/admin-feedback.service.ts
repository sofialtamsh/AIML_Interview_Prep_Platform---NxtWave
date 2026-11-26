import type { AdminFeedbackItem, AdminFeedbackResponse, FeedbackKind } from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';

const PAGE_SIZE = 25;

/**
 * Every piece of student feedback in one place, the 11★ loop for the team: step thumbs, lesson
 * ratings, page feedback and practice-question ratings, with the written "11★ ideas".
 */
export class AdminFeedbackService {
  constructor(private readonly ctx: AppContext) {}

  private get db() {
    return this.ctx.db;
  }

  async list(query: {
    kind?: FeedbackKind;
    withText?: boolean;
    page: number;
  }): Promise<AdminFeedbackResponse> {
    const where: Prisma.FeedbackWhereInput = {
      ...(query.kind ? { targetType: query.kind } : {}),
      ...(query.withText ? { AND: [{ text: { not: null } }, { text: { not: '' } }] } : {}),
    };
    const [rows, total, byKind, ideas] = await Promise.all([
      this.db.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          student: { select: { email: true, studentProfile: { select: { fullName: true } } } },
          moduleVersion: { select: { title: true } },
          sectionRevision: { select: { title: true, sectionKey: true } },
          practiceQuestion: { select: { title: true } },
        },
      }),
      this.db.feedback.count({ where }),
      this.db.feedback.groupBy({
        by: ['targetType'],
        _count: { _all: true },
        _avg: { rating: true },
      }),
      this.db.feedback.groupBy({
        by: ['targetType'],
        where: { AND: [{ text: { not: null } }, { text: { not: '' } }] },
        _count: { _all: true },
      }),
    ]);
    const ideaCount = new Map(ideas.map((r) => [r.targetType, r._count._all]));
    return {
      items: rows.map(
        (f): AdminFeedbackItem => ({
          id: f.id,
          kind: f.targetType,
          source:
            f.targetType === 'PAGE'
              ? (f.page ?? 'Page')
              : f.targetType === 'PRACTICE_QUESTION'
                ? (f.practiceQuestion?.title ?? 'Practice question')
                : f.targetType === 'SECTION'
                  ? `${f.moduleVersion?.title ?? 'Lesson'} · ${f.sectionRevision?.title ?? f.sectionKey ?? 'step'}`
                  : (f.moduleVersion?.title ?? 'Lesson'),
          rating: f.rating,
          thumbs: f.thumbs,
          tags: f.tags,
          text: f.text,
          student: f.student.studentProfile?.fullName || f.student.email,
          createdAt: f.createdAt.toISOString(),
        }),
      ),
      page: query.page,
      total,
      summary: (['LESSON', 'SECTION', 'PRACTICE_QUESTION', 'PAGE'] as const).map((kind) => {
        const r = byKind.find((x) => x.targetType === kind);
        return {
          kind,
          count: r?._count._all ?? 0,
          averageRating:
            r?._avg.rating === null || r?._avg.rating === undefined
              ? null
              : Math.round(r._avg.rating * 10) / 10,
          ideas: ideaCount.get(kind) ?? 0,
        };
      }),
    };
  }
}
