import { describe, expect, it } from 'vitest';
import { generateAccount } from '../generate';
import { matchPairs } from '@/lib/plan';

const TODAY = new Date(2026, 8, 8); // 8 Sep 2026, fixed so the suite is stable.

describe('demo dataset', () => {
  const account = generateAccount({ today: TODAY });

  it('is deterministic for a given seed', () => {
    const again = generateAccount({ today: TODAY });
    expect(again.standing).toEqual(account.standing);
    expect(again.income.total).toBe(account.income.total);
    expect(again.team.length).toBe(account.team.length);
  });

  it('moves with the seed', () => {
    const other = generateAccount({ today: TODAY, seed: 99 });
    expect(other.team.length).not.toBe(account.team.length);
  });

  it('holds the ten directs every rank requires', () => {
    expect(account.standing.directs).toBeGreaterThanOrEqual(10);
  });

  it('derives standing from the tree rather than hard-coding it', () => {
    expect(account.standing.teamSize).toBe(account.team.length);
    expect(account.standing.activeMembers).toBe(account.team.filter((m) => m.active).length);
    expect(account.standing.businessVolume).toBe(
      account.team.reduce((total, member) => total + member.instalmentsPaid, 0),
    );
  });

  it('splits every member into exactly one leg', () => {
    expect(account.legs.left.members + account.legs.right.members).toBe(account.team.length);
  });

  it('matches pairs consistently with the leg volumes', () => {
    const expected = matchPairs(account.legs.left.volume, account.legs.right.volume);
    expect(account.standing.matchingPairs).toBe(expected.pairs);
    expect(account.income.matching.pairs).toBe(expected.pairs);
  });

  it('reaches a rank and knows what is next', () => {
    expect(account.rank).not.toBeNull();
    if (account.nextRank) {
      expect(account.nextRank.rank.tier).toBeGreaterThan(account.rank!.tier);
      expect(account.nextRank.blockers.length).toBeGreaterThan(0);
    }
  });

  it('breaks income down into parts that sum to the total', () => {
    const summed = account.income.breakdown.reduce((total, entry) => total + entry.amount, 0);
    expect(summed).toBe(account.income.total);
    expect(account.income.total).toBeGreaterThan(0);
  });

  it('produces twelve months of history ending at the current month', () => {
    expect(account.history).toHaveLength(12);
    const last = account.history[account.history.length - 1]!;
    expect(last.date.getMonth()).toBe(TODAY.getMonth());
    for (const month of account.history) {
      expect(month.total).toBe(month.referral + month.level + month.matching + month.leadership);
    }
  });

  it('lists one spin draw per elapsed month, newest first', () => {
    expect(account.draws.length).toBeGreaterThan(0);
    for (let index = 1; index < account.draws.length; index += 1) {
      expect(account.draws[index]!.month).toBeLessThan(account.draws[index - 1]!.month);
    }
  });

  it('keeps every team member inside the 30-month term', () => {
    for (const member of account.team) {
      expect(member.instalmentsPaid).toBeGreaterThanOrEqual(1);
      expect(member.instalmentsPaid).toBeLessThanOrEqual(30);
      expect(member.level).toBeGreaterThanOrEqual(1);
      expect(member.level).toBeLessThanOrEqual(10);
    }
  });

  it('runs a daily matching pass against the rank cap', () => {
    const run = account.dailyRun;
    expect(run.result.pairs).toBeGreaterThan(0);
    expect(run.result.payable).toBeLessThanOrEqual(run.result.capApplied);
    expect(run.result.payable + run.result.flushed).toBe(run.result.gross);
    // The demo day is deliberately over the cap so the interface can show a flush.
    expect(run.result.flushed).toBeGreaterThan(0);
  });

  it('sizes the month-to-date cap by the days already run', () => {
    expect(account.daysElapsed).toBe(TODAY.getDate());
    expect(account.income.matching.capApplied).toBe(
      account.daysElapsed * (account.rank?.dailyMatchingCap ?? 0),
    );
  });

  it('keeps the ledger and position in step', () => {
    expect(account.ledger).toHaveLength(30);
    expect(account.position.monthsPaid).toBe(22);
    expect(account.position.paid + account.position.outstanding).toBe(30 * 5_000 * 100);
  });
});
