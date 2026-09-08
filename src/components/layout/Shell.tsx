import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface NavItem {
  id: string;
  label: string;
  hint: string;
  /** Groups the item under a labelled heading in the sidebar. */
  group: string;
  icon: ReactNode;
}

export function Shell({
  nav,
  active,
  onNavigate,
  user,
  onSignOut,
  aside,
  children,
}: {
  nav: readonly NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  user: { name: string; id: string; role: 'admin' | 'member'; detail: string };
  onSignOut: () => void;
  /** Optional contextual panel shown under the navigation. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = nav.find((item) => item.id === active);

  // Preserve the sidebar's declared order while grouping.
  const groups: Array<{ name: string; items: NavItem[] }> = [];
  for (const item of nav) {
    const existing = groups.find((group) => group.name === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }

  return (
    <div className="relative z-[1] min-h-screen lg:grid lg:grid-cols-[252px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-small focus:shadow-pop"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          'border-line bg-surface/70 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-r',
          menuOpen ? 'block border-b' : 'hidden lg:block',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="hidden items-center gap-3 px-5 py-5 lg:flex">
            <Mark />
            <div className="min-w-0">
              <p className="truncate text-small font-semibold leading-tight text-ink">Suvarna Sparsh</p>
              <p className="eyebrow mt-0.5">Digital gold SIP</p>
            </div>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3 lg:py-1" aria-label="Sections">
            {groups.map((group) => (
              <div key={group.name}>
                <p className="eyebrow px-3 pb-1.5">{group.name}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
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
                          'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-small',
                          'transition-colors duration-200 ease-out',
                          selected
                            ? 'bg-gold/10 font-medium text-gold'
                            : 'text-muted hover:bg-raised hover:text-ink',
                        )}
                      >
                        {selected ? (
                          <span
                            className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-gold"
                            aria-hidden
                          />
                        ) : null}
                        <span className="shrink-0 opacity-90" aria-hidden>
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {aside ? <div className="px-3 pb-3 pt-1">{aside}</div> : null}

          <div className="border-t border-line p-3">
            <div className="well flex items-center gap-3 p-3">
              <Avatar name={user.name} admin={user.role === 'admin'} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-small font-medium leading-tight text-ink">{user.name}</p>
                <p className="truncate font-mono text-[11px] text-faint">{user.id}</p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:text-critical"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M8 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3H8M13 13.5 16.5 10 13 6.5M16.5 10H7.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-gold">{user.detail}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <button
              type="button"
              className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                  d="M3 5h14M3 10h14M3 15h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-title font-semibold text-ink">{current?.label}</h1>
              <p className="truncate text-tiny text-faint">{current?.hint}</p>
            </div>

            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="px-4 py-7 sm:px-6 lg:px-8">
          {/*
            Keyed on the route so the cascade replays on navigation. Content
            arriving in sequence reads as one page settling rather than
            everything appearing at once.
          */}
          <div key={active} className="stagger mx-auto max-w-[1240px] space-y-section">
            {children}
          </div>
        </main>

        <footer className="border-t border-line px-4 py-6 text-tiny leading-relaxed text-faint sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
            <p>
              Figures are computed from the plan document by the engine in{' '}
              <code className="rounded bg-raised px-1 py-0.5 font-mono text-[11px]">src/lib/plan</code>.
            </p>
            <p>Demo data is generated locally and never leaves the browser.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Mark() {
  return (
    <span
      className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-gold-soft/25 to-gold/10 text-gold ring-1 ring-inset ring-gold/25"
      aria-hidden
    >
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

/** Rounded-square initials rather than the default avatar circle. */
function Avatar({ name, admin }: { name: string; admin: boolean }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-semibold ring-1 ring-inset',
        admin ? 'bg-gold/12 text-gold ring-gold/25' : 'bg-raised text-muted ring-line',
      )}
      aria-hidden
    >
      {initials}
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
      className="rounded-lg border border-line bg-surface p-2 text-muted transition-all duration-200 ease-out hover:border-line-strong hover:text-ink active:scale-95"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 2v1.8M10 16.2V18M18 10h-1.8M3.8 10H2M15.7 4.3l-1.3 1.3M5.6 14.4l-1.3 1.3M15.7 15.7l-1.3-1.3M5.6 5.6 4.3 4.3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
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
