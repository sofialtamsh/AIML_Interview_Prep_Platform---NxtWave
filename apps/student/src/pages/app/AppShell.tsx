import { cn, Logo } from '@app/ui';
import { House, LogOut, Route, SlidersHorizontal, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { FeedbackButton } from '../../features/feedback/FeedbackButton';
import { api, queryClient, setMe, useMe } from '../../lib/api';

const NAV = [
  { to: '/', label: 'Home', end: true, Icon: House },
  { to: '/roadmap', label: 'Roadmap', end: false, Icon: Route },
  { to: '/plan', label: 'My plan', end: false, Icon: SlidersHorizontal },
] as const;

export function AppShell() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !menuRef.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  async function signOut() {
    await api.post('/auth/logout').catch(() => undefined);
    setMe(null);
    queryClient.clear();
    navigate('/login', { replace: true });
  }

  const initials = (me?.fullName || me?.email || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-15 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Home">
            <Logo subtitle="Interview Prep" />
          </Link>
          <nav className="hidden gap-1 sm:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2',
                    isActive && 'bg-surface-2 font-semibold text-ink',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="relative ml-auto" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-full bg-ink font-mono text-xs font-bold text-surface"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="Account menu"
            >
              {initials}
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)]"
              >
                <div className="border-b border-line px-3 py-2.5">
                  <b className="block truncate">{me?.fullName}</b>
                  <span className="block truncate text-[12.5px] text-muted">{me?.email}</span>
                </div>
                <Link
                  role="menuitem"
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-2"
                >
                  <UserRound className="size-4" aria-hidden /> Profile & security
                </Link>
                <button
                  role="menuitem"
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-surface-2"
                >
                  <LogOut className="size-4" aria-hidden /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-7 pb-24 sm:px-6 sm:pb-7">
        <Outlet />
      </main>
      <FeedbackButton />

      {/* Phones: thumb-reachable tab bar instead of the header links. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
        aria-label="Main"
      >
        <div className="grid grid-cols-3">
          {NAV.map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2.5 text-[11.5px] font-medium text-muted',
                  isActive && 'font-semibold text-brand',
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
