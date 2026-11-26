import { cn, Logo } from '@app/ui';
import {
  Activity,
  BookOpenText,
  CalendarClock,
  Dumbbell,
  FileSearch,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  MessageSquareHeart,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { api, queryClient, setAdminMe, useAdminMe } from '../../lib/api';

type NavItem = {
  to: string;
  label: string;
  Icon: typeof LayoutDashboard;
  superOnly?: boolean;
  end?: boolean;
};

// Sections appear here as each delivery phase ships (docs/08-ux-strategy.md §4).
const NAV: NavItem[] = [
  { to: '/', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Students', Icon: Users },
  { to: '/analytics', label: 'Analytics', Icon: Activity },
  { to: '/study-plan', label: 'Study plan', Icon: CalendarClock },
  { to: '/catalog', label: 'Catalog', Icon: Library },
  { to: '/curriculum', label: 'Curriculum', Icon: Network },
  { to: '/lessons', label: 'Lessons', Icon: BookOpenText },
  { to: '/coverage', label: 'Coverage', Icon: Gauge },
  { to: '/practice', label: 'Practice', Icon: Dumbbell },
  { to: '/feedback', label: 'Feedback', Icon: MessageSquareHeart },
  { to: '/ai', label: 'AI', Icon: Sparkles },
  { to: '/access', label: 'Access', Icon: KeyRound },
  { to: '/hiring', label: 'Hiring data', Icon: FileSearch, superOnly: true },
  { to: '/admins', label: 'Admins', Icon: ShieldCheck, superOnly: true },
];

export function AdminShell() {
  const { data: me } = useAdminMe();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Under `lg` there is no room for a sidebar, so the sections fold into this menu.
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter((n) => !n.superOnly || me?.role === 'SUPER_ADMIN');

  // Opening a section closes the menu; Esc closes it without leaving the page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the path change is the trigger
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen]);

  async function signOut() {
    await api.post('/auth/logout').catch(() => undefined);
    setAdminMe(null);
    queryClient.clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <Logo subtitle="Admin console" />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="admin-sections"
          className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-2 px-3 text-sm font-semibold hover:border-ink-2"
        >
          {menuOpen ? (
            <X className="size-4" aria-hidden />
          ) : (
            <Menu className="size-4" aria-hidden />
          )}
          Menu
        </button>
      </header>

      <aside
        id="admin-sections"
        className={cn(
          'min-w-0 flex-col border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:border-r lg:border-b-0',
          menuOpen ? 'flex border-b' : 'hidden',
        )}
      >
        <div className="hidden px-4 py-4 lg:block">
          <Logo subtitle="Admin console" />
        </div>
        {/* The list scrolls inside the sidebar, so a short window never hides a section. */}
        <nav
          className="flex max-h-[70dvh] min-h-0 flex-col gap-1 overflow-y-auto px-2 py-2 lg:max-h-none lg:flex-1 lg:py-0 lg:pb-2"
          aria-label="Admin sections"
        >
          {items.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-ink-2 hover:bg-surface-2 lg:min-h-9',
                  isActive && 'bg-brand-soft font-semibold text-brand-deep',
                )
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto shrink-0 border-t border-line p-3">
          <div className="truncate text-sm font-semibold">{me?.fullName}</div>
          <div className="truncate text-xs text-muted">{me?.email}</div>
          <div className="mt-1 font-mono text-[10.5px] font-semibold tracking-wider text-brand uppercase">
            {me?.role.replace('_', ' ')}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2 lg:min-h-0"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
