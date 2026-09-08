/**
 * SUVARNA SPARSH SAVING PLAN — machine-readable plan definition.
 *
 * Every constant below is transcribed directly from the plan document
 * (SUVARNA_SPARSH_SAVING_PLAN.pdf). Where the document is silent or
 * internally inconsistent, the gap is encoded as `null` and reported by
 * `checkPlanIntegrity()` rather than being silently invented here.
 *
 * Source references use the form [p1] .. [p3] for the document's pages.
 */

import { rupees, type Bps, type Paise } from './money';

/* ------------------------------------------------------------------ *
 * 1. The savings contract                                             *
 * ------------------------------------------------------------------ */

export const SAVINGS = {
  /** [p1] "EVERY MONTH DEPOSIT: Rs 5,000" */
  monthlyDeposit: rupees(5_000) as Paise,
  /** [p1] "TOTAL YOU WILL DEPOSIT: Rs 1,50,000 (30 MONTHS)" */
  termMonths: 30,
  statedTotalDeposit: rupees(1_50_000) as Paise,
  /** [p1] "...gold worth Rs 1,70,000 as the maturity amount ... in the 31st month." */
  maturityMonth: 31,
  maturityValue: rupees(1_70_000) as Paise,
  /** [p1] Benefit chart: month 1 pays Rs 20,000 and each later month adds Rs 5,000. */
  firstMonthBenefit: rupees(20_000) as Paise,
  benefitStep: rupees(5_000) as Paise,
  /** [p1] "Between 31 to 100 people will receive gold worth Rs 1,70,000". */
  maturityCohort: { min: 31, max: 100 },
} as const;

/* ------------------------------------------------------------------ *
 * 2. The commissionable base                                          *
 * ------------------------------------------------------------------ */

/**
 * [p1] "All these earnings are based on 20% of the deposit amount; for example,
 * if the deposit amount is Rs 5,000, the earnings are calculated on 20% of that
 * meaning Rs 1,000."
 *
 * Every reward below is a share of this base, not of the full deposit.
 */
export const COMMISSIONABLE_RATE: Bps = 2_000; // 20.00%

/** Rs 1,000 of commissionable value per active member per month. */
export const COMMISSIONABLE_BASE: Paise = rupees(1_000);

/**
 * One unit of Business Volume (BV) is one active member-month. The rank
 * qualification table on [p2] counts BV in these units ("300 BV" for Silver
 * alongside a 300-member team), so BV and head-count share a scale.
 */
export const BV_PER_ACTIVE_MEMBER_MONTH = 1;

/* ------------------------------------------------------------------ *
 * 3. The four reward buckets                                          *
 * ------------------------------------------------------------------ */

export type RewardBucketId = 'referral' | 'level' | 'matching' | 'leadership';

export const REWARD_BUCKETS: ReadonlyArray<{
  id: RewardBucketId;
  label: string;
  /** Share of the commissionable base, in basis points. */
  share: Bps;
  blurb: string;
}> = [
  {
    id: 'referral',
    label: 'Suvarna Referral Reward',
    share: 1_000, // [p2] "SUVARNA REFERRAL REWARD (10%)"
    blurb: 'Paid on every direct referral, every month they stay active.',
  },
  {
    id: 'level',
    label: 'Suvarna Level Reward',
    share: 2_000, // [p2] "SUVARNA LEVEL REWARD (20%)"
    blurb: 'Ten levels deep, unlocked one level at a time by direct referrals.',
  },
  {
    id: 'matching',
    label: 'Suvarna Matching Reward',
    share: 4_000, // [p2] "SUVARNA MATCHING REWARD (40%)"
    blurb: 'Binary pair matching on the two legs, capped daily by rank.',
  },
  {
    id: 'leadership',
    label: 'Suvarna Leadership Reward',
    share: 1_000, // [p2] "SUVARNA LEADERSHIP REWARD (10%)"
    blurb: 'A shared monthly pool split between the six leadership ranks.',
  },
];

/* ------------------------------------------------------------------ *
 * 4. Referral reward                                                  *
 * ------------------------------------------------------------------ */

/** [p2] 10% of the commissionable base, per direct referral, per month. */
export const REFERRAL_RATE: Bps = 1_000;

/* ------------------------------------------------------------------ *
 * 5. Level reward                                                     *
 * ------------------------------------------------------------------ */

export interface LevelTier {
  /** Depth in the sponsor tree, 1-indexed. */
  level: number;
  /** Share of the commissionable base earned on each active member at this depth. */
  rate: Bps;
  /** Direct referrals the member must personally hold to unlock this level. */
  directsRequired: number;
}

/**
 * [p2] "Level 1: 1 Direct | 5% Reward ... Level 10: +1 Direct | 1% Reward".
 * Each row adds one more required direct, so level N needs N directs.
 */
export const LEVEL_TIERS: readonly LevelTier[] = [
  { level: 1, rate: 500, directsRequired: 1 },
  { level: 2, rate: 350, directsRequired: 2 },
  { level: 3, rate: 250, directsRequired: 3 },
  { level: 4, rate: 200, directsRequired: 4 },
  { level: 5, rate: 200, directsRequired: 5 },
  { level: 6, rate: 150, directsRequired: 6 },
  { level: 7, rate: 150, directsRequired: 7 },
  { level: 8, rate: 100, directsRequired: 8 },
  { level: 9, rate: 100, directsRequired: 9 },
  { level: 10, rate: 100, directsRequired: 10 },
];

/* ------------------------------------------------------------------ *
 * 6. Ranks                                                            *
 * ------------------------------------------------------------------ */

export type RankId = 'associate' | 'silver' | 'gold' | 'ruby' | 'diamond' | 'crown';

export interface RankDefinition {
  id: RankId;
  label: string;
  /** Ordering, 1 = entry rank. */
  tier: number;
  /** [p2/p3] Direct referrals required — 10 for every rank. */
  directsRequired: number;
  /** [p2/p3] Team size required. */
  teamRequired: number;
  /** [p2/p3] Business volume required. `null` where the document omits it. */
  bvRequired: number | null;
  /** [p2/p3] Active members required. */
  activeRequired: number;
  /**
   * [p2] Daily matching cap. `null` where the document's cap list omits the
   * rank; `resolveDailyCap()` falls back to the nearest lower stated rank.
   */
  dailyMatchingCap: Paise | null;
  /** [p2] Share of the monthly leadership pool. */
  leadershipPoolShare: Bps;
  /** [p2] Indicative monthly leadership reward at the reference pool. */
  indicativeLeadershipReward: Paise;
}

export const RANKS: readonly RankDefinition[] = [
  {
    id: 'associate',
    label: 'Suvarna Associate',
    tier: 1,
    directsRequired: 10,
    teamRequired: 100,
    bvRequired: null, // [p2] BV column is absent for Associate.
    activeRequired: 10,
    dailyMatchingCap: rupees(2_000),
    leadershipPoolShare: 500, // 5%
    indicativeLeadershipReward: rupees(500),
  },
  {
    id: 'silver',
    label: 'Silver Leader',
    tier: 2,
    directsRequired: 10,
    teamRequired: 300,
    bvRequired: 300,
    activeRequired: 20,
    dailyMatchingCap: rupees(5_000),
    leadershipPoolShare: 1_000, // 10%
    indicativeLeadershipReward: rupees(1_000),
  },
  {
    id: 'gold',
    label: 'Gold Leader',
    tier: 3,
    directsRequired: 10,
    teamRequired: 700,
    bvRequired: 700,
    activeRequired: 30,
    dailyMatchingCap: rupees(10_000),
    leadershipPoolShare: 1_500, // 15%
    indicativeLeadershipReward: rupees(1_500),
  },
  {
    id: 'ruby',
    label: 'Ruby Leader',
    tier: 4,
    directsRequired: 10,
    teamRequired: 1_500,
    bvRequired: 1_500,
    activeRequired: 40,
    dailyMatchingCap: null, // [p2] The daily capping list skips Ruby.
    leadershipPoolShare: 2_000, // 20%
    indicativeLeadershipReward: rupees(2_000),
  },
  {
    id: 'diamond',
    label: 'Diamond Leader',
    tier: 5,
    directsRequired: 10,
    teamRequired: 3_000,
    bvRequired: 3_000,
    activeRequired: 50,
    dailyMatchingCap: rupees(20_000),
    leadershipPoolShare: 2_000, // 20%
    indicativeLeadershipReward: rupees(2_000),
  },
  {
    id: 'crown',
    label: 'Crown Leader',
    tier: 6,
    directsRequired: 10,
    teamRequired: 5_000,
    bvRequired: 5_000,
    activeRequired: 75,
    dailyMatchingCap: rupees(30_000),
    leadershipPoolShare: 3_000, // 30%
    indicativeLeadershipReward: rupees(3_000),
  },
];

export const RANK_BY_ID: Readonly<Record<RankId, RankDefinition>> = Object.fromEntries(
  RANKS.map((rank) => [rank.id, rank]),
) as Record<RankId, RankDefinition>;

/* ------------------------------------------------------------------ *
 * 7. Binary matching                                                  *
 * ------------------------------------------------------------------ */

export const MATCHING = {
  /** [p2] "All Ratio 1:2 OR 2:1." A pair consumes 1 BV on one leg and 2 on the other. */
  ratio: { weak: 1, strong: 2 },
  /** [p3] "Binary Income per Pair = 400% / Rs 400". */
  payoutPerPair: rupees(400) as Paise,
  /** Cap applied to an unranked member, before any rank is achieved. */
  unrankedDailyCap: rupees(0) as Paise,
} as const;

/* ------------------------------------------------------------------ *
 * 8. Leadership pool                                                  *
 * ------------------------------------------------------------------ */

export const LEADERSHIP = {
  /** [p2] "100 Leadership Incomes Create Leadership Pool Rs 10,000 Per Month." */
  referenceContributors: 100,
  referencePool: rupees(10_000) as Paise,
  /** Each contributing member-month adds 10% of the commissionable base. */
  contributionPerMember: rupees(100) as Paise,
} as const;

/* ------------------------------------------------------------------ *
 * 9. Illustrative four-level projection                               *
 * ------------------------------------------------------------------ */

export interface ProjectionTier {
  level: number;
  members: number;
  incomePerMember: Paise;
}

/** [p3] "ESTIMATED EARNING FOR 1 ID (4 LEVEL BUSINESS)". */
export const PROJECTION_TIERS: readonly ProjectionTier[] = [
  { level: 1, members: 10, incomePerMember: rupees(100) },
  { level: 2, members: 100, incomePerMember: rupees(50) },
  { level: 3, members: 1_000, incomePerMember: rupees(35) },
  { level: 4, members: 10_000, incomePerMember: rupees(25) },
];

/** [p3] Stated totals, kept so the engine can assert against the document. */
export const PROJECTION_STATED = {
  teamIncome: rupees(2_91_000) as Paise,
  binaryIncome: rupees(13_33_200) as Paise,
  monthlyIncome: rupees(16_24_200) as Paise,
} as const;
