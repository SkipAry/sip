import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { changePassword, ensureSeeded, findAccount, signIn, type Account, type SignInResult } from './store';

const SESSION_KEY = 'suvarna-sparsh:session:v1';

interface AuthValue {
  account: Account | null;
  ready: boolean;
  signIn: (id: string, password: string) => Promise<SignInResult>;
  signOut: () => void;
  updatePassword: (next: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await ensureSeeded();
      if (cancelled) return;

      // A session stores only the account id. The record itself is re-read, so
      // a suspended or deleted account cannot keep a stale session alive.
      try {
        const savedId = sessionStorage.getItem(SESSION_KEY);
        if (savedId) {
          const found = findAccount(savedId);
          if (found && found.status === 'active') setAccount(found);
          else sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {
        // Session storage may be unavailable; sign-in simply will not persist.
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignIn = useCallback(async (id: string, password: string) => {
    const result = await signIn(id, password);
    if (result.ok) {
      setAccount(result.account);
      try {
        sessionStorage.setItem(SESSION_KEY, result.account.id);
      } catch {
        // Non-fatal: the session lasts until reload instead.
      }
    }
    return result;
  }, []);

  const handleSignOut = useCallback(() => {
    setAccount(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Nothing to clean up.
    }
  }, []);

  const handleUpdatePassword = useCallback(
    async (next: string) => {
      if (!account) throw new Error('No one is signed in.');
      setAccount(await changePassword(account.id, next));
    },
    [account],
  );

  const value = useMemo<AuthValue>(
    () => ({
      account,
      ready,
      signIn: handleSignIn,
      signOut: handleSignOut,
      updatePassword: handleUpdatePassword,
    }),
    [account, ready, handleSignIn, handleSignOut, handleUpdatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside an AuthProvider.');
  return value;
}
