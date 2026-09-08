import { describe, expect, it } from 'vitest';
import {
  incomeSnapshot,
  leadershipPool,
  levelReward,
  matchPairs,
  matchingReward,
  referralReward,
  resolveDailyCap,
} from '../income';
import { COMMISSIONABLE_BASE, LEADERSHIP, LEVEL_TIERS, MATCHING, RANKS } from '../config';
import { rupees } from '../money';

describe('commissionable base', () => {
  it('is 20% of the Rs 5,000 deposit, as page 1 spells out', () => {
    expect(COMMISSIONABLE_BASE).toBe(rupees(1_000));
  });
});

describe('referral reward', () => {
  it('pays Rs 100 for each active direct', () => {
    expect(referralReward(1).total).toBe(rupees(100));
    expect(referralReward(10).total).toBe(rupees(1_000));
    expect(referralReward(0).total).toBe(0);
  });

  it('ignores negative and fractional inputs', () => {
    expect(referralReward(-5).total).toBe(0);
    expect(referralReward(3.9).total).toBe(rupees(300));
  });
});

describe('level reward', () => {
  const tenActivePerLevel = Array.from({ length: 10 }, () => 10);

  it('prices each level at the printed rate', () => {
    const expected = [50, 35, 25, 20, 20, 15, 15, 10, 10, 10]; // rupees per member
    const result = levelReward(tenActivePerLevel, 10);
    result.rows.forEach((row, index) => {
      expect(row.perMember).toBe(rupees(expected[index]!));
    });
  });

  it('locks a level until the matching number of directs is held', () => {
    const result = levelReward(tenActivePerLevel, 3);
    expect(result.unlockedLevels).toBe(3);
    expect(result.rows[2]!.earned).toBe(rupees(250));
    expect(result.rows[3]!.earned).toBe(0);
    expect(result.rows[3]!.potential).toBe(rupees(200));
    expect(result.nextLevel?.level).toBe(4);
  });

  it('reports income forfeited to locked levels', () => {
    const result = levelReward(tenActivePerLevel, 3);
    // Levels 4-10: 20 + 20 + 15 + 15 + 10 + 10 + 10 = 100 per member, ten members each.
    expect(result.forfeited).toBe(rupees(1_000));
  });

  it('opens every level at ten directs and has no next level', () => {
    const result = levelReward(tenActivePerLevel, 10);
    expect(result.unlockedLevels).toBe(10);
    expect(result.nextLevel).toBeNull();
    expect(result.forfeited).toBe(0);
    // 10 members x (50+35+25+20+20+15+15+10+10+10) = 10 x 210
    expect(result.total).toBe(rupees(2_100));
  });

  it('tolerates a short input array', () => {
    expect(levelReward([5], 10).total).toBe(rupees(250));
  });

  it('sums to 21% of the base, one point above its printed heading', () => {
    const total = LEVEL_TIERS.reduce((sum, tier) => sum + tier.rate, 0);
    expect(total).toBe(2_100);
  });
});

describe('binary pairing', () => {
  it('forms no pair without volume on both legs', () => {
    expect(matchPairs(10, 0).pairs).toBe(0);
    expect(matchPairs(0, 10).pairs).toBe(0);
  });

  it('needs three units for the first pair', () => {
    expect(matchPairs(1, 1).pairs).toBe(0);
    expect(matchPairs(1, 2).pairs).toBe(1);
    expect(matchPairs(2, 1).pairs).toBe(1);
  });

  it('is capped by the weaker leg', () => {
    expect(matchPairs(1, 100).pairs).toBe(1);
    expect(matchPairs(5, 100).pairs).toBe(5);
  });

  it('is capped by a third of total volume when the legs are balanced', () => {
    expect(matchPairs(30, 30).pairs).toBe(20);
    expect(matchPairs(100, 100).pairs).toBe(66);
  });

  it('never consumes more than each leg holds and carries the rest', () => {
    const cases: Array<[number, number]> = [
      [0, 0], [1, 2], [2, 1], [7, 13], [30, 30], [100, 5], [999, 1001], [3, 3],
    ];
    for (const [left, right] of cases) {
      const result = matchPairs(left, right);
      expect(result.consumedLeft).toBeGreaterThanOrEqual(0);
      expect(result.consumedRight).toBeGreaterThanOrEqual(0);
      expect(result.consumedLeft).toBeLessThanOrEqual(left);
      expect(result.consumedRight).toBeLessThanOrEqual(right);
      expect(result.carryLeft).toBe(left - result.consumedLeft);
      expect(result.carryRight).toBe(right - result.consumedRight);
      // Every pair consumes exactly three units across the two legs.
      expect(result.consumedLeft + result.consumedRight).toBe(result.pairs * 3);
    }
  });

  it('cannot be beaten by any feasible split of 1:2 and 2:1 pairs', () => {
    for (let left = 0; left <= 24; left += 1) {
      for (let right = 0; right <= 24; right += 1) {
        let best = 0;
        for (let a = 0; a <= left; a += 1) {
          for (let b = 0; a + 2 * b <= left && 2 * a + b <= right; b += 1) {
            best = Math.max(best, a + b);
          }
        }
        expect(matchPairs(left, right).pairs).toBe(best);
      }
    }
  });
});

describe('matching reward', () => {
  it('pays Rs 400 a pair up to the rank cap', () => {
    const result = matchingReward({ leftVolume: 3, rightVolume: 6, rank: 'silver' });
    expect(result.pairs).toBe(3);
    expect(result.gross).toBe(rupees(1_200));
    expect(result.payable).toBe(rupees(1_200));
    expect(result.flushed).toBe(0);
  });

  it('flushes value above the daily cap', () => {
    // Associate caps at Rs 2,000 a day, which is five pairs.
    const result = matchingReward({ leftVolume: 30, rightVolume: 30, rank: 'associate' });
    expect(result.pairs).toBe(20);
    expect(result.gross).toBe(rupees(8_000));
    expect(result.payable).toBe(rupees(2_000));
    expect(result.pairsPaid).toBe(5);
    expect(result.pairsFlushed).toBe(15);
    expect(result.flushed).toBe(rupees(6_000));
  });

  it('scales the cap across a multi-day window', () => {
    const result = matchingReward({ leftVolume: 30, rightVolume: 30, rank: 'associate', days: 30 });
    expect(result.capApplied).toBe(rupees(60_000));
    expect(result.payable).toBe(result.gross);
  });

  it('pays nothing to an unranked member', () => {
    const result = matchingReward({ leftVolume: 30, rightVolume: 30, rank: null });
    expect(result.payable).toBe(0);
    expect(result.flushed).toBe(result.gross);
  });

  it('applies each printed rank cap', () => {
    const printed: Array<[Parameters<typeof resolveDailyCap>[0], number]> = [
      ['associate', 2_000],
      ['silver', 5_000],
      ['gold', 10_000],
      ['diamond', 20_000],
      ['crown', 30_000],
    ];
    for (const [rank, cap] of printed) {
      const resolved = resolveDailyCap(rank);
      expect(resolved.cap).toBe(rupees(cap));
      expect(resolved.isFallback).toBe(false);
    }
  });

  it('falls back to the Gold cap for Ruby, and says so', () => {
    const resolved = resolveDailyCap('ruby');
    expect(resolved.cap).toBe(rupees(10_000));
    expect(resolved.isFallback).toBe(true);
    expect(matchingReward({ leftVolume: 90, rightVolume: 90, rank: 'ruby' }).capIsFallback).toBe(true);
  });
});

describe('leadership pool', () => {
  it('builds the Rs 10,000 reference pool from 100 contributions', () => {
    const pool = leadershipPool(LEADERSHIP.referenceContributors);
    expect(pool.pool).toBe(LEADERSHIP.referencePool);
  });

  it('reproduces every printed monthly reward with one qualifier per rank', () => {
    const pool = leadershipPool(100, {
      associate: 1, silver: 1, gold: 1, ruby: 1, diamond: 1, crown: 1,
    });
    const printed = {
      associate: 500, silver: 1_000, gold: 1_500, ruby: 2_000, diamond: 2_000, crown: 3_000,
    };
    for (const slice of pool.slices) {
      expect(slice.perQualifier).toBe(rupees(printed[slice.rank]));
      expect(slice.perQualifier).toBe(slice.indicative);
    }
    expect(pool.distributed).toBe(LEADERSHIP.referencePool);
    expect(pool.undistributed).toBe(0);
  });

  it('splits a rank slice between its qualifiers', () => {
    const pool = leadershipPool(100, { gold: 3 });
    const gold = pool.slices.find((slice) => slice.rank === 'gold')!;
    expect(gold.slice).toBe(rupees(1_500));
    expect(gold.perQualifier).toBe(rupees(500));
  });

  it('leaves unclaimed slices undistributed', () => {
    const pool = leadershipPool(100, { crown: 1 });
    expect(pool.distributed).toBe(rupees(3_000));
    expect(pool.undistributed).toBe(rupees(7_000));
  });

  it('shares total exactly 100% of the pool', () => {
    const shares = RANKS.reduce((sum, rank) => sum + rank.leadershipPoolShare, 0);
    expect(shares).toBe(10_000);
  });
});

describe('income snapshot', () => {
  it('adds the four rewards into one payable total', () => {
    const snapshot = incomeSnapshot({
      activeDirects: 10,
      directs: 10,
      activeByLevel: [10, 40, 90, 120, 0, 0, 0, 0, 0, 0],
      leftVolume: 60,
      rightVolume: 90,
      rank: 'gold',
      days: 30,
      leadershipContributors: 100,
      leadershipQualifiers: { gold: 1 },
    });

    expect(snapshot.referral.total).toBe(rupees(1_000));
    // 10x50 + 40x35 + 90x25 + 120x20 = 500 + 1400 + 2250 + 2400
    expect(snapshot.level.total).toBe(rupees(6_550));
    expect(snapshot.matching.pairs).toBe(50);
    expect(snapshot.matching.payable).toBe(rupees(20_000));
    expect(snapshot.leadership.earned).toBe(rupees(1_500));
    expect(snapshot.total).toBe(rupees(29_050));
    expect(snapshot.breakdown.reduce((sum, entry) => sum + entry.amount, 0)).toBe(snapshot.total);
  });

  it('pays no matching or leadership income before a rank is held', () => {
    const snapshot = incomeSnapshot({
      activeDirects: 2,
      directs: 2,
      activeByLevel: [2, 4],
      leftVolume: 30,
      rightVolume: 30,
      rank: null,
      leadershipContributors: 100,
    });
    expect(snapshot.matching.payable).toBe(0);
    expect(snapshot.leadership.earned).toBe(0);
    expect(snapshot.total).toBe(snapshot.referral.total + snapshot.level.total);
  });
});

describe('plan constants', () => {
  it('pays Rs 400 a matched pair, as page 3 states', () => {
    expect(MATCHING.payoutPerPair).toBe(rupees(400));
  });
});
