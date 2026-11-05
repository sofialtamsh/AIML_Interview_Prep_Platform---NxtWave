import { Alert, ApiError, buttonClass, errorMessage, FullPageSpinner } from '@app/ui';
import { ArrowLeft, Hourglass } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useLesson } from '../../lib/queries';
import { LessonPlayer } from './LessonPlayer';

/** /learn/:topicSlug/:subtopicSlug — a focused, full-screen lesson. */
export function LessonPage() {
  const { topicSlug = '', subtopicSlug = '' } = useParams();
  const lesson = useLesson(topicSlug, subtopicSlug);

  if (lesson.isPending) return <FullPageSpinner />;
  if (lesson.isError) {
    const comingSoon =
      lesson.error instanceof ApiError &&
      lesson.error.status === 404 &&
      (lesson.error.details as { comingSoon?: boolean } | undefined)?.comingSoon === true;
    return (
      <div className="mx-auto grid min-h-dvh max-w-lg content-center gap-5 px-4 py-10 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Hourglass className="size-7" aria-hidden />
        </span>
        {comingSoon ? (
          <>
            <h1 className="text-2xl">This lesson is on its way</h1>
            <p className="text-ink-2">
              It is being written and reviewed for your level. Everything else on your roadmap is
              ready to go.
            </p>
          </>
        ) : (
          <Alert tone="bad">{errorMessage(lesson.error)}</Alert>
        )}
        <Link to={`/topics/${topicSlug}`} className={buttonClass('secondary', 'md')}>
          <ArrowLeft className="size-4" aria-hidden /> Back to the topic
        </Link>
      </div>
    );
  }
  return <LessonPlayer key={lesson.data.lesson.moduleVersionId} data={lesson.data} />;
}
