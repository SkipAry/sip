import { useEffect, useMemo, useState } from 'react';
import { Shell, type NavItem } from '@/components/layout/Shell';
import { Overview } from '@/features/Overview';
import { Savings } from '@/features/Savings';
import { Income } from '@/features/Income';
import { Team } from '@/features/Team';
import { Rank } from '@/features/Rank';
import { Calculator } from '@/features/Calculator';
import { PlanRules } from '@/features/PlanRules';
import { SpinConsole } from '@/features/admin/SpinConsole';
import { Members } from '@/features/admin/Members';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { generateAccount } from '@/data/generate';
import { SidebarSummary } from '@/features/SidebarSummary';
import type { Role } from '@/lib/auth/store';

interface Section extends NavItem {
  roles: readonly Role[];
}

/**
 * Sections are declared with the roles allowed to see them, and both the
 * navigation and the router read that one list. A member cannot reach the spin
 * console by typing its hash: an out-of-role route resolves to their first
 * permitted section instead.
 */
const SECTIONS: readonly Section[] = [
  {
    id: 'overview',
    group: 'Portfolio',
    label: 'Overview',
    hint: 'Everything at a glance',
    roles: ['member'],
    icon: <Icon path="M3 10.5 10 4l7 6.5V16a1 1 0 0 1-1 1h-3v-4H7v4H4a1 1 0 0 1-1-1z" />,
  },
  {
    id: 'savings',
    group: 'Portfolio',
    label: 'Savings',
    hint: 'Your 30-month ladder and the monthly spin results',
    roles: ['member'],
    icon: <Icon path="M4 6h12v9H4zM4 9h12M7 12h3" />,
  },
  {
    id: 'income',
    group: 'Earnings',
    label: 'Income',
    hint: 'Referral, level, matching and leadership rewards',
    roles: ['member'],
    icon: <Icon path="M4 15V8M8 15V5M12 15v-4M16 15V9" />,
  },
  {
    id: 'team',
    group: 'Earnings',
    label: 'Team',
    hint: 'Your downline, level by level and leg by leg',
    roles: ['member'],
    icon: (
      <Icon path="M7 9a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 7 9m6 0a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 13 9M3 16c0-2.2 1.8-3.6 4-3.6s4 1.4 4 3.6m2 0c0-2.2 1.4-3.6 3-3.6" />
    ),
  },
  {
    id: 'rank',
    group: 'Earnings',
    label: 'Rank',
    hint: 'Qualification, caps and the leadership pool',
    roles: ['member'],
    icon: <Icon path="M10 3.5 12 8l4.6.5-3.4 3.1.9 4.6L10 14l-4.1 2.2.9-4.6L3.4 8.5 8 8z" />,
  },
  {
    id: 'spin',
    group: 'Operations',
    label: 'Spin & Win',
    hint: 'Run the monthly draw. Admin only.',
    roles: ['admin'],
    icon: <Icon path="M10 3a7 7 0 1 1-7 7M10 3v7l5 3M10 3 8 1M3 10H1" />,
  },
  {
    id: 'members',
    group: 'Operations',
    label: 'Members',
    hint: 'Provision IDs and passwords',
    roles: ['admin'],
    icon: (
      <Icon path="M8 9a2.4 2.4 0 1 0 0-4.8A2.4 2.4 0 0 0 8 9m-5 8c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2M14 7h4M16 5v4" />
    ),
  },
  {
    id: 'calculator',
    group: 'Reference',
    label: 'Projection',
    hint: 'What a real team shape actually pays',
    roles: ['member', 'admin'],
    icon: <Icon path="M6 3h8v14H6zM8 6h4M8 9h1.5M11 9h1.5M8 12h1.5M11 12h1.5" />,
  },
  {
    id: 'rules',
    group: 'Reference',
    label: 'Plan rules',
    hint: 'How the engine reads the plan, and where it is ambiguous',
    roles: ['member', 'admin'],
    icon: <Icon path="M5 3h7l3 3v11H5zM12 3v3h3M8 10h4M8 13h4" />,
  },
];

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

function Dashboard() {
  const { account: user, ready, signOut } = useAuth();
  const data = useMemo(() => generateAccount(), []);
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#/, ''));

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash.replace(/^#/, ''));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Keep the address bar honest. An out-of-role or unknown hash renders the
  // fallback section, and leaving the original in the URL would mean a refresh,
  // a bookmark or a shared link pointed somewhere the viewer cannot go.
  useEffect(() => {
    if (!user) return;
    const permitted = SECTIONS.filter((section) => section.roles.includes(user.role));
    const resolved = permitted.some((section) => section.id === hash) ? hash : permitted[0]!.id;
    if (resolved !== hash) {
      window.history.replaceState(null, '', `#${resolved}`);
      setHash(resolved);
    }
  }, [user, hash]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[13px] text-faint">Loading…</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const allowed = SECTIONS.filter((section) => section.roles.includes(user.role));
  const fallback = allowed[0]!.id;
  const route = allowed.some((section) => section.id === hash) ? hash : fallback;

  const navigate = (id: string) => {
    window.location.hash = id;
    setHash(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Shell
      nav={allowed}
      active={route}
      onNavigate={navigate}
      onSignOut={signOut}
      aside={user.role === 'member' ? <SidebarSummary account={data} /> : null}
      user={{
        name: user.name,
        id: user.id,
        role: user.role,
        detail: user.role === 'admin' ? 'Main admin' : (data.rank?.label ?? 'No rank yet'),
      }}
    >
      {route === 'overview' ? <Overview account={data} onNavigate={navigate} /> : null}
      {route === 'savings' ? <Savings account={data} /> : null}
      {route === 'income' ? <Income account={data} /> : null}
      {route === 'team' ? <Team account={data} /> : null}
      {route === 'rank' ? <Rank account={data} /> : null}
      {route === 'spin' ? <SpinConsole account={data} adminId={user.id} /> : null}
      {route === 'members' ? <Members /> : null}
      {route === 'calculator' ? <Calculator /> : null}
      {route === 'rules' ? <PlanRules /> : null}
    </Shell>
  );
}

function Icon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d={path} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
