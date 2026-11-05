import { FullPageSpinner } from '@app/ui';
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { GuestOnly, RequireAuth, RequireOnboarded } from './lib/auth';
import { AppShell } from './pages/app/AppShell';
import { HomePage } from './pages/app/HomePage';
import { PlanPage } from './pages/app/PlanPage';
import { ProfilePage } from './pages/app/ProfilePage';
import { RoadmapPage } from './pages/app/RoadmapPage';
import { TopicPage } from './pages/app/TopicPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SignupPage } from './pages/auth/SignupPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';

// The lesson player (renderers, code highlighting, Python runner) loads only when a lesson opens.
const LessonPage = lazy(() =>
  import('./pages/learn/LessonPage').then((m) => ({ default: m.LessonPage })),
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  {
    path: '/signup',
    element: (
      <GuestOnly>
        <SignupPage />
      </GuestOnly>
    ),
  },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  {
    path: '/onboarding',
    element: (
      <RequireAuth>
        <OnboardingPage />
      </RequireAuth>
    ),
  },
  {
    // Lessons are full-screen and focused, outside the main navigation.
    path: '/learn/:topicSlug/:subtopicSlug',
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <Suspense fallback={<FullPageSpinner />}>
            <LessonPage />
          </Suspense>
        </RequireOnboarded>
      </RequireAuth>
    ),
  },
  {
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <AppShell />
        </RequireOnboarded>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'roadmap', element: <RoadmapPage /> },
      { path: 'topics/:slug', element: <TopicPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
