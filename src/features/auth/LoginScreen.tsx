import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { SEED_ADMIN, SEED_MEMBER } from '@/lib/auth/store';

const MESSAGES = {
  unknown: 'No account carries that ID. Check it with your sponsor or the admin.',
  password: 'That password does not match this ID.',
  suspended: 'This account is suspended. The admin can reactivate it.',
} as const;

export function LoginScreen() {
  const { signIn } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    const result = await signIn(id, password);
    if (!result.ok) setError(MESSAGES[result.reason]);
    setBusy(false);
  }

  function fill(nextId: string, nextPassword: string) {
    setId(nextId);
    setPassword(nextPassword);
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] animate-fade-up">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2.5 12.3 7l5 .7-3.6 3.5.85 5-4.55-2.4-4.55 2.4.85-5L2.7 7.7l5-.7z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-[19px] font-semibold leading-tight text-ink">Suvarna Sparsh</h1>
            <p className="text-[12px] uppercase tracking-wider text-faint">Digital gold SIP</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card p-6">
          <h2 className="text-[15px] font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Members and the admin use the same door. Your ID decides what you see.
          </p>

          <label className="mt-5 block">
            <span className="text-[12px] font-medium uppercase tracking-wider text-faint">Member ID</span>
            <input
              className="mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2 text-[14px] text-ink placeholder:text-faint"
              value={id}
              onChange={(event) => setId(event.target.value)}
              placeholder="SS-100244"
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              required
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[12px] font-medium uppercase tracking-wider text-faint">Password</span>
            <input
              className="mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2 text-[14px] text-ink placeholder:text-faint"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-[13px] text-critical"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-gold px-4 py-2.5 text-[14px] font-semibold text-canvas transition-opacity disabled:opacity-60"
          >
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>

        <div className="card mt-4 p-5">
          <p className="text-[12px] font-medium uppercase tracking-wider text-faint">Demo accounts</p>
          <div className="mt-3 space-y-2">
            <DemoRow
              label="Main admin"
              id={SEED_ADMIN.id}
              password={SEED_ADMIN.password}
              onUse={() => fill(SEED_ADMIN.id, SEED_ADMIN.password)}
            />
            <DemoRow
              label="Member"
              id={SEED_MEMBER.id}
              password={SEED_MEMBER.password}
              onUse={() => fill(SEED_MEMBER.id, SEED_MEMBER.password)}
            />
          </div>
        </div>

        <p className="mt-4 px-1 text-[12px] leading-relaxed text-faint">
          This build has no server. Accounts are held in your browser so the two dashboards can be kept apart for
          review. Treat it as a working prototype of the access model, not as production security.
        </p>
      </div>
    </div>
  );
}

function DemoRow({
  label,
  id,
  password,
  onUse,
}: {
  label: string;
  id: string;
  password: string;
  onUse: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-raised px-3 py-2">
      <div className="min-w-0">
        <p className="text-[13px] text-ink">{label}</p>
        <p className="tnum truncate text-[12px] text-faint">
          {id} · {password}
        </p>
      </div>
      <button
        type="button"
        onClick={onUse}
        className="shrink-0 rounded-md border border-line px-2.5 py-1 text-[12px] font-medium text-gold"
      >
        Use
      </button>
    </div>
  );
}
