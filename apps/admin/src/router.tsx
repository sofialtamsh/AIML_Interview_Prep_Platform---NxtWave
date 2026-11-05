import { Spinner } from '@app/ui';
import { lazy, type ReactNode, Suspense } from 'react';
import { createBrowserRouter, Link } from 'react-router';
import { GuestOnly, RequireAdmin, RequireSuperAdmin } from './lib/auth';
import { AccessPage } from './pages/app/AccessPage';
import { AdminShell } from './pages/app/AdminShell';
import { AdminsPage } from './pages/app/AdminsPage';
import { CatalogPage } from './pages/app/CatalogPage';
import { CurriculumPage } from './pages/app/CurriculumPage';
import { OverviewPage } from './pages/app/OverviewPage';
import { StudentsPage } from './pages/app/StudentsPage';
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/auth/PasswordPages';

// The lesson workspace (renderers, editors, Python runner) loads only when opened.
const LessonsPage = lazy(() =>
  import('./pages/app/lessons/LessonsPage').then((m) => ({ default: m.LessonsPage })),
);
const LessonWorkspace = lazy(() =>
  import('./pages/app/lessons/LessonWorkspace').then((m) => ({ default: m.LessonWorkspace })),
);
const AiSettingsPage = lazy(() =>
  import('./pages/app/AiSettingsPage').then((m) => ({ default: m.AiSettingsPage })),
);
const later = (node: ReactNode) => <Suspense fallback={<Spinner />}>{node}</Suspense>;

function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-mono text-sm font-bold text-brand">404</p>
        <h1 className="mt-2 text-2xl">Page not found</h1>
        <Link to="/" className="mt-4 inline-block font-semibold text-brand hover:underline">
          ← Overview
        </Link>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: (
      <RequireAdmin>
        <AdminShell />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'curriculum', element: <CurriculumPage /> },
      { path: 'lessons', element: later(<LessonsPage />) },
      { path: 'lessons/:subtopicId', element: later(<LessonWorkspace />) },
      { path: 'ai', element: later(<AiSettingsPage />) },
      { path: 'access', element: <AccessPage /> },
      {
        path: 'admins',
        element: (
          <RequireSuperAdmin>
            <AdminsPage />
          </RequireSuperAdmin>
        ),
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
