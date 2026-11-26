import type {
  GoalResponse,
  LessonResponse,
  OnboardingState,
  RoadmapResponse,
  StudentCatalogResponse,
  StudentPracticeResponse,
  StudentStudyPlan,
  TopicPageResponse,
} from '@app/contracts';
import { useQuery } from '@tanstack/react-query';
import { api, meKey, queryClient } from './api';

export const keys = {
  catalog: ['catalog'] as const,
  goal: ['goal'] as const,
  onboarding: ['onboarding'] as const,
  roadmap: ['roadmap'] as const,
  studyPlan: ['study-plan'] as const,
  practice: ['practice'] as const,
  topic: (slug: string) => ['topic', slug] as const,
  lesson: (topicSlug: string, subtopicSlug: string) => ['lesson', topicSlug, subtopicSlug] as const,
};

export const useCatalog = () =>
  useQuery({
    queryKey: keys.catalog,
    queryFn: () => api.get<StudentCatalogResponse>('/student/catalog'),
  });

export const useGoal = () =>
  useQuery({ queryKey: keys.goal, queryFn: () => api.get<GoalResponse>('/student/goal') });

export const useOnboarding = () =>
  useQuery({
    queryKey: keys.onboarding,
    queryFn: () => api.get<OnboardingState>('/student/onboarding'),
    staleTime: Number.POSITIVE_INFINITY,
  });

export const useRoadmap = () =>
  useQuery({ queryKey: keys.roadmap, queryFn: () => api.get<RoadmapResponse>('/student/roadmap') });

/**
 * The team's study plan: daily time, days, deadline and a note, plus which choices students
 * make themselves. While a choice is the team's, its picker stays hidden.
 */
export const useStudyPlan = () =>
  useQuery({
    queryKey: keys.studyPlan,
    queryFn: () => api.get<StudentStudyPlan>('/student/study-plan'),
    staleTime: 5 * 60_000,
  });

export const usePractice = () =>
  useQuery({
    queryKey: keys.practice,
    queryFn: () => api.get<StudentPracticeResponse>('/student/practice'),
  });

export const useTopic = (slug: string, enabled = true) =>
  useQuery({
    queryKey: keys.topic(slug),
    queryFn: () => api.get<TopicPageResponse>(`/student/topics/${encodeURIComponent(slug)}`),
    enabled,
  });

export const lessonPath = (topicSlug: string, subtopicSlug: string) =>
  `/student/lessons/${encodeURIComponent(topicSlug)}/${encodeURIComponent(subtopicSlug)}`;

/** The lesson at this student's depth. Progress is kept locally while they work through it. */
export const useLesson = (topicSlug: string, subtopicSlug: string) =>
  useQuery({
    queryKey: keys.lesson(topicSlug, subtopicSlug),
    queryFn: () => api.get<LessonResponse>(lessonPath(topicSlug, subtopicSlug)),
    staleTime: Number.POSITIVE_INFINITY,
  });

/** Finishing a lesson changes the roadmap (done items, minutes) and the topic page. */
export function afterLessonProgress() {
  void queryClient.invalidateQueries({ queryKey: keys.roadmap });
  void queryClient.invalidateQueries({ queryKey: ['topic'] });
}

/** A changed goal re-plans the roadmap on the server, so its cached copies are stale too. */
export function setGoal(goal: GoalResponse) {
  queryClient.setQueryData(keys.goal, goal);
  void queryClient.invalidateQueries({ queryKey: meKey });
  void queryClient.invalidateQueries({ queryKey: keys.roadmap });
  void queryClient.invalidateQueries({ queryKey: ['topic'] });
}

export function setRoadmap(roadmap: RoadmapResponse) {
  queryClient.setQueryData(keys.roadmap, roadmap);
  void queryClient.invalidateQueries({ queryKey: ['topic'] });
}
