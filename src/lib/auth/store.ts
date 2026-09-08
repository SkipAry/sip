/**
 * The account and draw store.
 *
 * Everything lives in one versioned local-storage document so the whole demo
 * state can be inspected, exported or cleared in one place. The shape mirrors
 * what a server would return, and every mutation is an async function, so
 * replacing this file with API calls does not change any caller.
 */

import {
  generateMemberId,
  generatePassword,
  hashPassword,
  randomChoice,
  verifyPassword,
  type PasswordRecord,
} from './crypto';

export type Role = 'admin' | 'member';
export type AccountStatus = 'active' | 'suspended';

export interface Account {
  id: string;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  password: PasswordRecord;
  /** True until the member signs in and sets their own password. */
  mustChangePassword: boolean;
  lastSignInAt: string | null;
}

export interface Draw {
  month: number;
  drawnAt: string;
  winnerId: string;
  winnerName: string;
  /** Gold value awarded, in paise. */
  benefit: number;
  poolSize: number;
  /** The admin account that ran the draw. */
  drawnBy: string;
}

export interface StoreDocument {
  version: number;
  accounts: Account[];
  draws: Draw[];
}

const STORAGE_KEY = 'suvarna-sparsh:store:v1';
const VERSION = 1;

/** The one built-in account, so a fresh install can be signed into at all. */
export const SEED_ADMIN = {
  id: 'ADMIN-001',
  name: 'Main Admin',
  password: 'SUVARNA-ADMIN-2026',
} as const;

/** The demo member the generated dashboard describes. */
export const SEED_MEMBER = {
  id: 'SS-100244',
  name: 'Priya Deshmukh',
  password: 'SUVARNA-MEMBER-2026',
} as const;

let cache: StoreDocument | null = null;

function emptyDocument(): StoreDocument {
  return { version: VERSION, accounts: [], draws: [] };
}

function read(): StoreDocument {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreDocument;
      if (parsed.version === VERSION && Array.isArray(parsed.accounts)) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    // A corrupt or unreadable document is replaced rather than crashing the app.
  }
  cache = emptyDocument();
  return cache;
}

function write(document: StoreDocument): void {
  cache = document;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  } catch {
    // Private browsing can refuse writes; the session still works in memory.
  }
}

/** Create the built-in admin and demo member the first time the app runs. */
export async function ensureSeeded(): Promise<void> {
  const document = read();
  if (document.accounts.length > 0) return;

  const [adminPassword, memberPassword] = await Promise.all([
    hashPassword(SEED_ADMIN.password),
    hashPassword(SEED_MEMBER.password),
  ]);

  write({
    ...document,
    accounts: [
      {
        id: SEED_ADMIN.id,
        name: SEED_ADMIN.name,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        password: adminPassword,
        mustChangePassword: false,
        lastSignInAt: null,
      },
      {
        id: SEED_MEMBER.id,
        name: SEED_MEMBER.name,
        role: 'member',
        status: 'active',
        createdAt: new Date().toISOString(),
        password: memberPassword,
        mustChangePassword: false,
        lastSignInAt: null,
      },
    ],
  });
}

export function listAccounts(): Account[] {
  return [...read().accounts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function findAccount(id: string): Account | null {
  const needle = id.trim().toUpperCase();
  return read().accounts.find((account) => account.id.toUpperCase() === needle) ?? null;
}

export type SignInResult =
  { ok: true; account: Account } | { ok: false; reason: 'unknown' | 'password' | 'suspended' };

export async function signIn(id: string, password: string): Promise<SignInResult> {
  const account = findAccount(id);
  if (!account) return { ok: false, reason: 'unknown' };
  if (account.status === 'suspended') return { ok: false, reason: 'suspended' };

  const matches = await verifyPassword(password, account.password);
  if (!matches) return { ok: false, reason: 'password' };

  const stamped: Account = { ...account, lastSignInAt: new Date().toISOString() };
  replaceAccount(stamped);
  return { ok: true, account: stamped };
}

export interface NewMember {
  account: Account;
  /** Shown to the admin once, at creation, and never recoverable afterwards. */
  password: string;
}

/** Provision a member with a unique id and a generated password. */
export async function createMember(name: string): Promise<NewMember> {
  const document = read();
  const taken = new Set(document.accounts.map((account) => account.id));
  const id = generateMemberId(taken);
  const password = generatePassword();

  const account: Account = {
    id,
    name: name.trim() || 'New member',
    role: 'member',
    status: 'active',
    createdAt: new Date().toISOString(),
    password: await hashPassword(password),
    mustChangePassword: true,
    lastSignInAt: null,
  };

  write({ ...document, accounts: [...document.accounts, account] });
  return { account, password };
}

/** Issue a fresh password for an existing account. */
export async function resetPassword(id: string): Promise<NewMember> {
  const account = findAccount(id);
  if (!account) throw new Error(`No account with id ${id}`);

  const password = generatePassword();
  const updated: Account = {
    ...account,
    password: await hashPassword(password),
    mustChangePassword: true,
  };
  replaceAccount(updated);
  return { account: updated, password };
}

/** Change a password from the account's own settings. */
export async function changePassword(id: string, next: string): Promise<Account> {
  const account = findAccount(id);
  if (!account) throw new Error(`No account with id ${id}`);

  const updated: Account = {
    ...account,
    password: await hashPassword(next),
    mustChangePassword: false,
  };
  replaceAccount(updated);
  return updated;
}

export function setStatus(id: string, status: AccountStatus): Account {
  const account = findAccount(id);
  if (!account) throw new Error(`No account with id ${id}`);
  const updated = { ...account, status };
  replaceAccount(updated);
  return updated;
}

/* --------------------------- lucky spin draws --------------------------- */

export function listDraws(): Draw[] {
  return [...read().draws].sort((a, b) => b.month - a.month);
}

export interface DrawCandidate {
  id: string;
  name: string;
}

/**
 * Run one monthly draw and publish the result.
 *
 * Only an admin reaches this: the winner is chosen with rejection-sampled
 * randomness, recorded against the month, and from then on every member sees
 * the same published outcome. A month can only be drawn once.
 */
export function runDraw(input: {
  month: number;
  benefit: number;
  candidates: readonly DrawCandidate[];
  drawnBy: string;
}): Draw {
  const document = read();
  if (document.draws.some((draw) => draw.month === input.month)) {
    throw new Error(`Month ${input.month} has already been drawn.`);
  }
  if (input.candidates.length === 0) {
    throw new Error('No eligible members are in the draw pool.');
  }

  const winner = randomChoice(input.candidates);
  const draw: Draw = {
    month: input.month,
    drawnAt: new Date().toISOString(),
    winnerId: winner.id,
    winnerName: winner.name,
    benefit: input.benefit,
    poolSize: input.candidates.length,
    drawnBy: input.drawnBy,
  };

  write({ ...document, draws: [...document.draws, draw] });
  return draw;
}

/** Remove every published draw. Used by the admin's reset control. */
export function clearDraws(): void {
  write({ ...read(), draws: [] });
}

/** Wipe the whole store, including accounts. */
export function resetStore(): void {
  cache = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

function replaceAccount(account: Account): void {
  const document = read();
  write({
    ...document,
    accounts: document.accounts.map((entry) => (entry.id === account.id ? account : entry)),
  });
}

/** Test seam: drop the in-memory cache so a fresh read hits storage. */
export function __resetCache(): void {
  cache = null;
}
