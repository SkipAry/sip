import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface NavItem {
  id: string;
  label: string;
  hint: string;
  icon: ReactNode;
}

export function Shell({
  nav,
  active,
  onNavigate,
  user,
  onSignOut,
  children,
}: {
  nav: readonly NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  user: { name: string; id: string; role: 'admin' | 'member'; detail: string };
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = nav.find((item) => item.id === active);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar */}
      <aside
        className={cn(
          'border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:border-r',
          menuOpen ? 'block border-b' : 'hidden lg:block',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="hidden items-center gap-2.5 px-5 py-5 lg:flex">
            <Mark />
            <div>
              <p className="text-[14px] font-semibold leading-tight text-ink">Suvarna Sparsh</p>
              <p className="text-[11px] uppercase tracking-wider text-faint">Saving plan</p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 px-3 py-3 lg:py-0" aria-label="Sections">
            {nav.map((item) => {
              const selected = item.id === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => {
                    onNavigate(item.id);
                    setMenuOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                    selected
                      ? 'bg-gold/12 font-medium text-gold'
                      : 'text-muted hover:bg-raised hover:text-ink',
                  )}
                >
                  <span className="shrink-0" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <p className="min-w-0 truncate text-[13px] font-medium text-ink">{user.name}</p>
              {user.role === 'admin' ? (
                <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                  Admin
                </span>
              ) : null}
            </div>
            <p className="tnum text-[12px] text-faint">{user.id}</p>
            <p className="mt-1 text-[12px] text-gold">{user.detail}</p>
            <button
              type="button"
              onClick={onSignOut}
              className="mt-3 w-full rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              className="rounded-lg border border-line p-1.5 text-muted lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-ink">{current?.label}</h1>
              <p className="truncate text-[12px] text-faint">{current?.hint}</p>
            </div>

            <ThemeToggle />
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1180px] animate-fade-up">{children}</div>
        </main>

        <footer className="border-t border-line px-4 py-6 text-[12px] leading-relaxed text-faint sm:px-6 lg:px-8">
          <p className="mx-auto max-w-[1180px]">
            Figures are computed from the plan document by the engine in{' '}
            <code className="rounded bg-raised px-1 py-0.5 text-[11px]">src/lib/plan</code>. Demo data is
            generated locally and never leaves the browser.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Mark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2.5 12.3 7l5 .7-3.6 3.5.85 5-4.55-2.4-4.55 2.4.85-5L2.7 7.7l5-.7z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

type Theme = 'light' | 'dark';

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 2v1.8M10 16.2V18M18 10h-1.8M3.8 10H2M15.7 4.3l-1.3 1.3M5.6 14.4l-1.3 1.3M15.7 15.7l-1.3-1.3M5.6 5.6 4.3 4.3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
