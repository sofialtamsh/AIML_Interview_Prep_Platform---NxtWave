import { useCallback, useMemo, useState } from 'react';
import { FinalCTA } from '../../features/practice-hub/components/FinalCTA';
import { HeroSection } from '../../features/practice-hub/components/HeroSection';
import { HowItWorks } from '../../features/practice-hub/components/HowItWorks';
import { PreparationExpectations } from '../../features/practice-hub/components/PreparationExpectations';
import { PreparationRoadmap } from '../../features/practice-hub/components/PreparationRoadmap';
import { QuestionExplorer } from '../../features/practice-hub/components/QuestionExplorer';
import { CATEGORIES } from '../../features/practice-hub/data/categories';
import { QUESTIONS } from '../../features/practice-hub/data/questions';
import { scrollToId } from '../../features/practice-hub/lib/hooks';
import { readFilters, writeFilters } from '../../features/practice-hub/lib/url-state';
import type { Filters } from '../../features/practice-hub/types';
import { ALL } from '../../features/practice-hub/types';

/**
 * The Practice tab: the AI/ML practice question hub, the same page students already use at
 * nxtwave-aiml-practice-questions.vercel.app, inside the app. Its sections come over as they are
 * (features/practice-hub, copied from the nxtwave-ml-prep project); only its own navbar and
 * footer are left out, because the app has a header. "Solve Question" and "Watch concept" still
 * open NxtWave Academy in a new tab, and here each click is recorded for the signed-in student.
 */
export function PracticeHubPage() {
  const [filters, setFilters] = useState<Filters>(() => readFilters(CATEGORIES.map((c) => c.id)));

  const update = useCallback((next: Partial<Filters>) => {
    setFilters((f) => {
      const merged = { ...f, ...next };
      writeFilters(merged);
      return merged;
    });
  }, []);

  // Everything shown as a number is counted from the question sheet, never typed in.
  const categories = useMemo(
    () =>
      CATEGORIES.map((c) => {
        const items = QUESTIONS.filter((q) => q.categoryId === c.id);
        return { ...c, count: items.length };
      }).filter((c) => c.count > 0),
    [],
  );
  const totals = useMemo(
    () => ({
      questions: QUESTIONS.length,
      categories: categories.length,
      courses: new Set(QUESTIONS.map((q) => q.course)).size,
      videos: QUESTIONS.filter((q) => q.videoUrl).length,
    }),
    [categories.length],
  );
  // A friendly first question: the first Beginner one in roadmap order.
  const starter = useMemo(() => {
    const order = new Map(categories.map((c, i) => [c.id, i]));
    const byRoadmap = [...QUESTIONS].sort(
      (a, b) =>
        (order.get(a.categoryId) ?? 99) - (order.get(b.categoryId) ?? 99) || a.order - b.order,
    );
    return byRoadmap.find((q) => q.difficulty === 'Beginner' && !q.draft) ?? byRoadmap[0];
  }, [categories]);

  const selectCategory = (id: string) => {
    update({ category: id, difficulty: ALL });
    scrollToId('practice');
  };

  return (
    <div className="practice-hub">
      <HeroSection
        totals={totals}
        categories={categories}
        starter={starter}
        onStart={() => scrollToId('practice')}
        onExplore={() => scrollToId('roadmap')}
        onSelectCategory={selectCategory}
      />
      <PreparationRoadmap categories={categories} />
      <QuestionExplorer
        questions={QUESTIONS}
        categories={categories}
        filters={filters}
        onChange={update}
      />
      <HowItWorks />
      <PreparationExpectations total={totals.questions} />
      <FinalCTA
        onExplore={() => {
          update({ category: ALL, difficulty: ALL });
          scrollToId('practice');
        }}
      />
    </div>
  );
}
