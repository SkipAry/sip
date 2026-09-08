/**
 * The four reward engines: referral, level, binary matching and leadership.
 *
 * Each function is pure and takes integer inputs, so a payout run is fully
 * reproducible from the member's snapshot.
 */

import {
  COMMISSIONABLE_BASE,
  LEADERSHIP,
  LEVEL_TIERS,
  MATCHING,
  RANKS,
  RANK_BY_ID,
  REFERRAL_RATE,
  type RankId,
} from './config';
import { applyBps, sum, type Paise } from './money';

/* ------------------------------------------------------------------ *
 * Referral reward — 10% of the base, per active direct                *
 * ------------------------------------------------------------------ */

export interface ReferralResult {
  activeDirects: number;
  perDirect: Paise;
  total: Paise;
}

export function referralReward(activeDirects: number): ReferralResult {
  const perDirect = applyBps(COMMISSIONABLE_BASE, REFERRAL_RATE);
  return {
    activeDirects,
    perDirect,
    total: perDirect * Math.max(0, Math.trunc(activeDirects)),
  };
}

/* ------------------------------------------------------------------ *
 * Level reward — ten levels, unlocked one direct at a time            *
 * ------------------------------------------------------------------ */

export interface LevelRewardRow {
  level: number;
  rate: number;
  directsRequired: number;
  /** Active members sitting at this depth of the sponsor tree. */
  activeMembers: number;
  unlocked: boolean;
  perMember: Paise;
  /** Zero while the level is locked. */
  earned: Paise;
  /** What this level would pay if the member unlocked it. */
  potential: Paise;
}

export interface LevelRewardResult {
  rows: LevelRewardRow[];
  total: Paise;
  /** Income currently forfeited because the level is locked. */
  forfeited: Paise;
  unlockedLevels: number;
  /** The next level to unlock, or `null` when all ten are open. */
  nextLevel: LevelRewardRow | null;
}

/**
 * @param activeByLevel Active members at depth 1..10; index 0 is level 1.
 * @param directs       The member's own direct referrals.
 */
export function levelReward(activeByLevel: readonly number[], directs: number): LevelRewardResult {
  const rows: LevelRewardRow[] = LEVEL_TIERS.map((tier, index) => {
    const activeMembers = Math.max(0, Math.trunc(activeByLevel[index] ?? 0));
    const unlocked = directs >= tier.directsRequired;
    const perMember = applyBps(COMMISSIONABLE_BASE, tier.rate);
    const potential = perMember * activeMembers;
    return {
      level: tier.level,
      rate: tier.rate,
      directsRequired: tier.directsRequired,
      activeMembers,
      unlocked,
      perMember,
      earned: unlocked ? potential : 0,
      potential,
    };
  });

  return {
    rows,
    total: sum(rows.map((row) => row.earned)),
    forfeited: sum(rows.filter((row) => !row.unlocked).map((row) => row.potential)),
    unlockedLevels: rows.filter((row) => row.unlocked).length,
    nextLevel: rows.find((row) => !row.unlocked) ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * Binary matching — ratio 1:2 or 2:1                                  *
 * ------------------------------------------------------------------ */

export interface PairingResult {
  pairs: number;
  consumedLeft: number;
  consumedRight: number;
  carryLeft: number;
  carryRight: number;
}

/**
 * Maximum number of pairs formable from `left` and `right` business volume
 * when a pair may be either (1 left + 2 right) or (2 left + 1 right).
 *
 * Let `a` pairs use 1:2 and `b` pairs use 2:1, with p = a + b. The two leg
 * constraints are a + 2b <= left and 2a + b <= right. Adding them gives
 * 3p <= left + right; each on its own gives p <= left and p <= right. All
 * three bounds are simultaneously attainable, so:
 *
 *     pairs = min(left, right, floor((left + right) / 3))
 *
 * Leftover volume on each leg carries forward to the next run, which is what
 * makes a binary plan reward balanced legs rather than one runaway leg.
 */
export function matchPairs(left: number, right: number): PairingResult {
  const l = Math.max(0, Math.trunc(left));
  const r = Math.max(0, Math.trunc(right));
  const pairs = Math.min(l, r, Math.floor((l + r) / 3));

  // Choose the split of 2:1 pairs that keeps both legs feasible.
  const twoOnLeft = Math.min(Math.max(2 * pairs - r, 0), l - pairs);
  const consumedLeft = pairs + twoOnLeft;
  const consumedRight = 2 * pairs - twoOnLeft;

  return {
    pairs,
    consumedLeft,
    consumedRight,
    carryLeft: l - consumedLeft,
    carryRight: r - consumedRight,
  };
}

export interface MatchingInput {
  /** Fresh business volume on each leg, plus anything carried in. */
  leftVolume: number;
  rightVolume: number;
  rank: RankId | null;
  /** Days in the payout window. The cap is a *daily* ceiling. */
  days?: number;
}

export interface MatchingResult extends PairingResult {
  rank: RankId | null;
  payoutPerPair: Paise;
  /** Gross value of every pair formed, before the cap. */
  gross: Paise;
  /** Cap applied across the window. */
  capApplied: Paise;
  /** Whether the cap came from a lower rank because the plan omits this one. */
  capIsFallback: boolean;
  /** Amount actually payable. */
  payable: Paise;
  /** Value lost to the daily cap. */
  flushed: Paise;
  pairsPaid: number;
  pairsFlushed: number;
}

/**
 * Resolve a rank's daily matching cap.
 *
 * [p2] lists caps for Associate, Silver, Gold, Diamond and Crown but omits
 * Ruby. Rather than invent a number, Ruby inherits the nearest lower stated
 * cap and the result is flagged so the interface can say so out loud.
 */
export function resolveDailyCap(rank: RankId | null): { cap: Paise; isFallback: boolean } {
  if (rank === null) return { cap: MATCHING.unrankedDailyCap, isFallback: false };

  const definition = RANK_BY_ID[rank];
  if (definition.dailyMatchingCap !== null) {
    return { cap: definition.dailyMatchingCap, isFallback: false };
  }

  const lower = [...RANKS]
    .filter((candidate) => candidate.tier < definition.tier && candidate.dailyMatchingCap !== null)
    .sort((a, b) => b.tier - a.tier)[0];

  return { cap: lower?.dailyMatchingCap ?? MATCHING.unrankedDailyCap, isFallback: true };
}

export function matchingReward(input: MatchingInput): MatchingResult {
  const days = Math.max(1, Math.trunc(input.days ?? 1));
  const pairing = matchPairs(input.leftVolume, input.rightVolume);
  const { cap, isFallback } = resolveDailyCap(input.rank);

  const gross = pairing.pairs * MATCHING.payoutPerPair;
  const capApplied = cap * days;
  const payable = Math.min(gross, capApplied);
  const pairsPaid = MATCHING.payoutPerPair === 0 ? 0 : Math.floor(payable / MATCHING.payoutPerPair);

  return {
    ...pairing,
    rank: input.rank,
    payoutPerPair: MATCHING.payoutPerPair,
    gross,
    capApplied,
    capIsFallback: isFallback,
    payable,
    flushed: gross - payable,
    pairsPaid,
    pairsFlushed: pairing.pairs - pairsPaid,
  };
}

/* ------------------------------------------------------------------ *
 * Leadership pool                                                     *
 * ------------------------------------------------------------------ */

export interface LeadershipSlice {
  rank: RankId;
  label: string;
  share: number;
  qualifiers: number;
  /** The rank's slice of the pool. */
  slice: Paise;
  /** Slice divided between everyone holding the rank. */
  perQualifier: Paise;
  /** The document's headline figure at the 100-contributor reference pool. */
  indicative: Paise;
}

export interface LeadershipResult {
  contributors: number;
  pool: Paise;
  slices: LeadershipSlice[];
  distributed: Paise;
  /** Slices with no qualifier this month; nothing is paid out of them. */
  undistributed: Paise;
}

/**
 * [p2] Every leadership income contributes Rs 100 to a shared monthly pool;
 * 100 of them make the Rs 10,000 reference pool. Each rank takes a fixed share
 * of whatever the pool actually is, split between that rank's qualifiers.
 */
export function leadershipPool(
  contributors: number,
  qualifiersByRank: Partial<Record<RankId, number>> = {},
): LeadershipResult {
  const count = Math.max(0, Math.trunc(contributors));
  const pool = count * LEADERSHIP.contributionPerMember;

  const slices: LeadershipSlice[] = RANKS.map((rank) => {
    const qualifiers = Math.max(0, Math.trunc(qualifiersByRank[rank.id] ?? 0));
    const slice = applyBps(pool, rank.leadershipPoolShare);
    return {
      rank: rank.id,
      label: rank.label,
      share: rank.leadershipPoolShare,
      qualifiers,
      slice,
      perQualifier: qualifiers > 0 ? Math.floor(slice / qualifiers) : 0,
      indicative: rank.indicativeLeadershipReward,
    };
  });

  return {
    contributors: count,
    pool,
    slices,
    distributed: sum(slices.filter((slice) => slice.qualifiers > 0).map((slice) => slice.slice)),
    undistributed: sum(slices.filter((slice) => slice.qualifiers === 0).map((slice) => slice.slice)),
  };
}

/* ------------------------------------------------------------------ *
 * Aggregate                                                           *
 * ------------------------------------------------------------------ */

export interface IncomeSnapshotInput {
  activeDirects: number;
  directs: number;
  activeByLevel: readonly number[];
  leftVolume: number;
  rightVolume: number;
  rank: RankId | null;
  days?: number;
  leadershipContributors?: number;
  leadershipQualifiers?: Partial<Record<RankId, number>>;
}

export interface IncomeSnapshot {
  referral: ReferralResult;
  level: LevelRewardResult;
  matching: MatchingResult;
  leadership: { result: LeadershipResult; earned: Paise };
  total: Paise;
  breakdown: Array<{ id: string; label: string; amount: Paise }>;
}

export function incomeSnapshot(input: IncomeSnapshotInput): IncomeSnapshot {
  const referral = referralReward(input.activeDirects);
  const level = levelReward(input.activeByLevel, input.directs);
  const matching = matchingReward({
    leftVolume: input.leftVolume,
    rightVolume: input.rightVolume,
    rank: input.rank,
    days: input.days,
  });

  const pool = leadershipPool(input.leadershipContributors ?? 0, input.leadershipQualifiers ?? {});
  const earnedLeadership =
    input.rank === null ? 0 : (pool.slices.find((slice) => slice.rank === input.rank)?.perQualifier ?? 0);

  const breakdown = [
    { id: 'referral', label: 'Referral', amount: referral.total },
    { id: 'level', label: 'Level', amount: level.total },
    { id: 'matching', label: 'Matching', amount: matching.payable },
    { id: 'leadership', label: 'Leadership', amount: earnedLeadership },
  ];

  return {
    referral,
    level,
    matching,
    leadership: { result: pool, earned: earnedLeadership },
    total: sum(breakdown.map((entry) => entry.amount)),
    breakdown,
  };
}
