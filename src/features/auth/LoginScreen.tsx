import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { SEED_ADMIN, SEED_MEMBER } from '@/lib/auth/store';
import { Button, TextField } from '@/components/ui';

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
    <div className="relative z-[1] flex min-h-[100dvh] items-center justify-center px-4 py-12">
      {/* A single warm light behind the card, rather than a flat field. */}
      <span
        className="pointer-events-none absolute left-1/2 top-1/4 h-[420px] w-[560px] -translate-x-1/2 rounded-full bg-gold/[0.06] blur-[100px]"
        aria-hidden
      />

      <div className="relative w-full max-w-[404px] stagger">
        <div className="mb-8 flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-gold-soft/25 to-gold/10 text-gold ring-1 ring-inset ring-gold/25"
            aria-hidden
          >
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
            <h1 className="text-head font-semibold text-ink">Suvarna Sparsh</h1>
            <p className="eyebrow mt-0.5">Digital gold SIP</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card p-6">
          <h2 className="text-title font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-small text-muted">
            Members and the admin use the same door. Your ID decides what you see.
          </p>

          <div className="mt-6 space-y-4">
            <TextField
              label="Member ID"
              value={id}
              onChange={setId}
              placeholder="SS-100244"
              autoComplete="username"
              required
            />
            <TextField
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2.5 text-small text-critical"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={busy} full className="mt-6">
            {busy ? 'Checking…' : 'Sign in'}
          </Button>
        </form>

        <div className="card mt-4 p-5">
          <p className="eyebrow">Demo accounts</p>
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

        <p className="mt-5 px-1 text-tiny leading-relaxed text-faint">
          This build has no server. Accounts are held in your browser so the two dashboards can be kept apart
          for review. Treat it as a working prototype of the access model, not as production security.
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
    <div className="well flex items-center justify-between gap-3 px-3 py-2.5 transition-colors duration-200 hover:border-line-strong">
      <div className="min-w-0">
        <p className="text-small text-ink">{label}</p>
        <p className="truncate font-mono text-[11px] text-faint">
          {id} · {password}
        </p>
      </div>
      <button
        type="button"
        onClick={onUse}
        className="shrink-0 rounded-md border border-line px-2.5 py-1 text-tiny font-medium text-gold transition-all duration-200 hover:border-gold/40 active:scale-95"
      >
        Use
      </button>
    </div>
  );
}
