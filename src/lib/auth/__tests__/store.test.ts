import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetCache,
  clearDraws,
  createMember,
  ensureSeeded,
  findAccount,
  listAccounts,
  listDraws,
  resetPassword,
  resetStore,
  runDraw,
  SEED_ADMIN,
  SEED_MEMBER,
  setStatus,
  signIn,
  changePassword,
} from '../store';

beforeEach(() => {
  resetStore();
  __resetCache();
});

describe('seeding', () => {
  it('creates one admin and one member on first run', async () => {
    await ensureSeeded();
    const accounts = listAccounts();
    expect(accounts).toHaveLength(2);
    expect(accounts.filter((account) => account.role === 'admin')).toHaveLength(1);
    expect(findAccount(SEED_ADMIN.id)?.role).toBe('admin');
    expect(findAccount(SEED_MEMBER.id)?.role).toBe('member');
  });

  it('is idempotent', async () => {
    await ensureSeeded();
    await ensureSeeded();
    expect(listAccounts()).toHaveLength(2);
  });
});

describe('sign in', () => {
  beforeEach(async () => {
    await ensureSeeded();
  });

  it('accepts the seeded credentials', async () => {
    const result = await signIn(SEED_ADMIN.id, SEED_ADMIN.password);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.account.role).toBe('admin');
  });

  it('is case-insensitive on the id but not the password', async () => {
    expect((await signIn(SEED_MEMBER.id.toLowerCase(), SEED_MEMBER.password)).ok).toBe(true);
    expect((await signIn(SEED_MEMBER.id, SEED_MEMBER.password.toLowerCase())).ok).toBe(false);
  });

  it('reports why a sign-in failed', async () => {
    expect(await signIn('SS-000000', 'anything')).toEqual({ ok: false, reason: 'unknown' });
    expect(await signIn(SEED_MEMBER.id, 'wrong')).toEqual({ ok: false, reason: 'password' });

    setStatus(SEED_MEMBER.id, 'suspended');
    expect(await signIn(SEED_MEMBER.id, SEED_MEMBER.password)).toEqual({ ok: false, reason: 'suspended' });
  });

  it('stamps the last sign-in time', async () => {
    expect(findAccount(SEED_MEMBER.id)?.lastSignInAt).toBeNull();
    await signIn(SEED_MEMBER.id, SEED_MEMBER.password);
    expect(findAccount(SEED_MEMBER.id)?.lastSignInAt).not.toBeNull();
  });
});

describe('member provisioning', () => {
  beforeEach(async () => {
    await ensureSeeded();
  });

  it('issues a unique id and a working password', async () => {
    const created = await createMember('Anjali Verma');
    expect(created.account.id).toMatch(/^SS-\d{6}$/);
    expect(created.account.role).toBe('member');
    expect(created.account.mustChangePassword).toBe(true);

    const result = await signIn(created.account.id, created.password);
    expect(result.ok).toBe(true);
  });

  it('never gives two members the same id', async () => {
    const ids = new Set<string>();
    for (let index = 0; index < 20; index += 1) {
      ids.add((await createMember(`Member ${index}`)).account.id);
    }
    expect(ids.size).toBe(20);
  });

  it('falls back to a placeholder name rather than storing an empty one', async () => {
    expect((await createMember('   ')).account.name).toBe('New member');
  });

  it('replaces the old password on reset', async () => {
    const created = await createMember('Rahul Nair');
    const reissued = await resetPassword(created.account.id);

    expect(reissued.password).not.toBe(created.password);
    expect((await signIn(created.account.id, created.password)).ok).toBe(false);
    expect((await signIn(created.account.id, reissued.password)).ok).toBe(true);
  });

  it('clears the change-password flag once the member sets their own', async () => {
    const created = await createMember('Sneha Rao');
    await changePassword(created.account.id, 'a-password-they-chose');

    expect(findAccount(created.account.id)?.mustChangePassword).toBe(false);
    expect((await signIn(created.account.id, 'a-password-they-chose')).ok).toBe(true);
  });

  it('refuses to touch an account that does not exist', async () => {
    await expect(resetPassword('SS-999999')).rejects.toThrow();
  });
});

describe('lucky spin draws', () => {
  const candidates = [
    { id: 'SS-200001', name: 'A' },
    { id: 'SS-200002', name: 'B' },
    { id: 'SS-200003', name: 'C' },
  ];

  beforeEach(async () => {
    await ensureSeeded();
  });

  it('publishes a draw with a winner from the pool', () => {
    const draw = runDraw({ month: 1, benefit: 20_00_000, candidates, drawnBy: SEED_ADMIN.id });
    expect(candidates.map((c) => c.id)).toContain(draw.winnerId);
    expect(draw.poolSize).toBe(3);
    expect(draw.drawnBy).toBe(SEED_ADMIN.id);
    expect(listDraws()).toHaveLength(1);
  });

  it('refuses to draw the same month twice', () => {
    runDraw({ month: 1, benefit: 20_00_000, candidates, drawnBy: SEED_ADMIN.id });
    expect(() => runDraw({ month: 1, benefit: 20_00_000, candidates, drawnBy: SEED_ADMIN.id })).toThrow(
      /already been drawn/,
    );
  });

  it('refuses to draw from an empty pool', () => {
    expect(() => runDraw({ month: 2, benefit: 0, candidates: [], drawnBy: SEED_ADMIN.id })).toThrow(
      /No eligible members/,
    );
  });

  it('lists draws newest month first', () => {
    runDraw({ month: 1, benefit: 1, candidates, drawnBy: SEED_ADMIN.id });
    runDraw({ month: 3, benefit: 3, candidates, drawnBy: SEED_ADMIN.id });
    runDraw({ month: 2, benefit: 2, candidates, drawnBy: SEED_ADMIN.id });
    expect(listDraws().map((draw) => draw.month)).toEqual([3, 2, 1]);
  });

  it('reaches every candidate across many draws', () => {
    const winners = new Set<string>();
    for (let month = 1; month <= 30; month += 1) {
      winners.add(runDraw({ month, benefit: 1, candidates, drawnBy: SEED_ADMIN.id }).winnerId);
    }
    expect(winners.size).toBe(3);
  });

  it('clears results without touching accounts', () => {
    runDraw({ month: 1, benefit: 1, candidates, drawnBy: SEED_ADMIN.id });
    clearDraws();
    expect(listDraws()).toHaveLength(0);
    expect(listAccounts()).toHaveLength(2);
  });
});
