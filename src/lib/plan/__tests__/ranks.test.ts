import { describe, expect, it } from 'vitest';
import { currentRank, evaluateAllRanks, evaluateRank, nextRank, type Standing } from '../ranks';
import { RANKS, RANK_BY_ID } from '../config';

const strong: Standing = {
  directs: 12,
  teamSize: 6_000,
  businessVolume: 6_000,
  activeMembers: 90,
  matchingPairs: 40,
};

const beginner: Standing = {
  directs: 3,
  teamSize: 18,
  businessVolume: 12,
  activeMembers: 4,
  matchingPairs: 0,
};

describe('printed qualification table', () => {
  it('matches page 2 and 3 row for row', () => {
    const printed = [
      ['associate', 10, 100, null, 10],
      ['silver', 10, 300, 300, 20],
      ['gold', 10, 700, 700, 30],
      ['ruby', 10, 1_500, 1_500, 40],
      ['diamond', 10, 3_000, 3_000, 50],
      ['crown', 10, 5_000, 5_000, 75],
    ] as const;

    for (const [id, directs, team, bv, active] of printed) {
      const rank = RANK_BY_ID[id];
      expect(rank.directsRequired).toBe(directs);
      expect(rank.teamRequired).toBe(team);
      expect(rank.bvRequired).toBe(bv);
      expect(rank.activeRequired).toBe(active);
    }
  });

  it('requires ten directs at every rank', () => {
    expect(RANKS.every((rank) => rank.directsRequired === 10)).toBe(true);
  });
});

describe('evaluateRank', () => {
  it('qualifies a member who clears every criterion', () => {
    const progress = evaluateRank(RANK_BY_ID.crown, strong);
    expect(progress.qualified).toBe(true);
    expect(progress.blockers).toHaveLength(0);
    expect(progress.progress).toBe(1);
  });

  it('lists exactly what is short', () => {
    const progress = evaluateRank(RANK_BY_ID.silver, beginner);
    expect(progress.qualified).toBe(false);
    expect(progress.blockers.map((entry) => entry.id).sort()).toEqual(
      ['active', 'bv', 'directs', 'pairs', 'team'].sort(),
    );
  });

  it('never lets an unspecified threshold block qualification', () => {
    const progress = evaluateRank(RANK_BY_ID.associate, {
      directs: 10,
      teamSize: 100,
      businessVolume: 0,
      activeMembers: 10,
      matchingPairs: 1,
    });
    const bv = progress.criteria.find((entry) => entry.id === 'bv')!;
    expect(bv.unspecified).toBe(true);
    expect(bv.met).toBe(true);
    expect(progress.qualified).toBe(true);
  });

  it('requires at least one matched pair for a rank update', () => {
    const progress = evaluateRank(RANK_BY_ID.associate, {
      directs: 10,
      teamSize: 100,
      businessVolume: 100,
      activeMembers: 10,
      matchingPairs: 0,
    });
    expect(progress.qualified).toBe(false);
    expect(progress.blockers.map((entry) => entry.id)).toEqual(['pairs']);
  });

  it('clamps progress into 0..1', () => {
    for (const progress of evaluateAllRanks(strong)) {
      for (const entry of progress.criteria) {
        expect(entry.progress).toBeGreaterThanOrEqual(0);
        expect(entry.progress).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('currentRank and nextRank', () => {
  it('returns null for a member below Associate', () => {
    expect(currentRank(beginner)).toBeNull();
    expect(nextRank(beginner)?.rank.id).toBe('associate');
  });

  it('returns the highest rank actually held', () => {
    expect(currentRank(strong)?.id).toBe('crown');
    expect(nextRank(strong)).toBeNull();
  });

  it('stops at the rank whose team size is not yet reached', () => {
    const standing: Standing = {
      directs: 10,
      teamSize: 800,
      businessVolume: 800,
      activeMembers: 35,
      matchingPairs: 5,
    };
    expect(currentRank(standing)?.id).toBe('gold');
    expect(nextRank(standing)?.rank.id).toBe('ruby');
  });
});
