import { cn, Logo } from '@app/ui';
import {
  BookOpenText,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
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
  { to: '/catalog', label: 'Catalog', Icon: Library },
  { to: '/curriculum', label: 'Curriculum', Icon: Network },
  { to: '/lessons', label: 'Lessons', Icon: BookOpenText },
  { to: '/ai', label: 'AI', Icon: Sparkles },
  { to: '/access', label: 'Access', Icon: KeyRound },
  { to: '/admins', label: 'Admins', Icon: ShieldCheck, superOnly: true },
];

export function AdminShell() {
  const { data: me } = useAdminMe();
  const navigate = useNavigate();
  const items = NAV.filter((n) => !n.superOnly || me?.role === 'SUPER_ADMIN');

  async function signOut() {
    await api.post('/auth/logout').catch(() => undefined);
    setAdminMe(null);
    queryClient.clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[232px_1fr] md:grid-rows-none">
      <aside className="flex flex-col border-b border-line bg-surface md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="px-4 py-4">
          <Logo subtitle="Admin console" />
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0"
          aria-label="Admin sections"
        >
          {items.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-ink-2 hover:bg-surface-2',
                  isActive && 'bg-brand-soft font-semibold text-brand-deep',
                )
              }
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-line p-3 md:block">
          <div className="truncate text-sm font-semibold">{me?.fullName}</div>
          <div className="truncate text-xs text-muted">{me?.email}</div>
          <div className="mt-1 font-mono text-[10.5px] font-semibold tracking-wider text-brand uppercase">
            {me?.role.replace('_', ' ')}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8">
        <Outlet />
        <button
          type="button"
          onClick={signOut}
          className="mt-10 text-sm font-medium text-muted underline md:hidden"
        >
          Sign out
        </button>
      </main>
    </div>
  );
}
