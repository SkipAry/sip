/**
 * Plan self-audit.
 *
 * The source document has a handful of places where the stated headline does
 * not reconcile with the table underneath it, and a couple where a column is
 * simply missing. Those gaps matter — they change what a member is paid — so
 * the engine recomputes each one from the encoded data and reports what it
 * finds instead of quietly picking a value.
 *
 * The dashboard surfaces these on a "Plan integrity" panel so an operator sees
 * exactly which rules are unambiguous and which need a policy decision.
 */

import {
  COMMISSIONABLE_BASE,
  LEADERSHIP,
  LEVEL_TIERS,
  MATCHING,
  PROJECTION_STATED,
  RANKS,
  REWARD_BUCKETS,
  SAVINGS,
} from './config';
import { benefitForMonth, cumulativeDeposit } from './savings';
import { statedProjection } from './projection';
import { BPS_DENOMINATOR, sum } from './money';

export type FindingLevel = 'ok' | 'info' | 'warning';

export interface Finding {
  id: string;
  level: FindingLevel;
  title: string;
  detail: string;
  /** How the engine behaves given the finding. */
  resolution: string;
  source: string;
}

export function checkPlanIntegrity(): Finding[] {
  const findings: Finding[] = [];

  /* --- Reward buckets ------------------------------------------------ */

  const bucketTotal = sum(REWARD_BUCKETS.map((bucket) => bucket.share));
  findings.push({
    id: 'bucket-allocation',
    level: bucketTotal === BPS_DENOMINATOR ? 'ok' : 'info',
    title: `Reward buckets allocate ${pct(bucketTotal)} of the commissionable base`,
    detail: `Referral 10%, level 20%, matching 40% and leadership 10% add up to ${pct(
      bucketTotal,
    )}. The remaining ${pct(BPS_DENOMINATOR - bucketTotal)} of the Rs 1,000 base is not assigned to a member reward in the document.`,
    resolution:
      'The unallocated share is treated as company retention and is excluded from member payout maths.',
    source: 'Page 2, reward headings',
  });

  /* --- Level table --------------------------------------------------- */

  const levelTotal = sum(LEVEL_TIERS.map((tier) => tier.rate));
  const levelBucket = REWARD_BUCKETS.find((bucket) => bucket.id === 'level')!.share;
  findings.push({
    id: 'level-table-sum',
    level: levelTotal === levelBucket ? 'ok' : 'warning',
    title:
      levelTotal === levelBucket
        ? 'Level table reconciles with its 20% heading'
        : `Level table sums to ${pct(levelTotal)}, not the ${pct(levelBucket)} in its heading`,
    detail: `The ten level rates (5, 3.5, 2.5, 2, 2, 1.5, 1.5, 1, 1, 1) total ${pct(
      levelTotal,
    )} of the base, which is ${pct(Math.abs(levelTotal - levelBucket))} more than the "SUVARNA LEVEL REWARD (20%)" heading.`,
    resolution:
      'The engine pays the ten per-level rates exactly as tabulated. The heading is treated as a label, not a cap.',
    source: 'Page 2, "SUVARNA LEVEL REWARD (20%)"',
  });

  /* --- Missing daily cap --------------------------------------------- */

  const missingCaps = RANKS.filter((rank) => rank.dailyMatchingCap === null);
  if (missingCaps.length > 0) {
    findings.push({
      id: 'missing-daily-cap',
      level: 'warning',
      title: `No daily matching cap stated for ${listOf(missingCaps.map((rank) => rank.label))}`,
      detail:
        'The daily capping list runs Associate, Silver, Gold, Diamond, Crown. Ruby Leader sits between Gold and Diamond in every other table but has no cap of its own.',
      resolution:
        'A rank with no stated cap inherits the nearest lower stated cap, and every payout computed that way is flagged as a fallback.',
      source: 'Page 2, "Daily Capping Rankwise"',
    });
  }

  /* --- Missing BV requirement ---------------------------------------- */

  const missingBv = RANKS.filter((rank) => rank.bvRequired === null);
  if (missingBv.length > 0) {
    findings.push({
      id: 'missing-bv-requirement',
      level: 'info',
      title: `No business-volume requirement stated for ${listOf(missingBv.map((rank) => rank.label))}`,
      detail:
        'Every rank from Silver upward states a BV threshold equal to its team size. The Associate row lists directs, team and active members but no BV.',
      resolution: 'The BV criterion is shown as "not specified" and cannot block Associate qualification.',
      source: 'Page 2, "INCOME CRITERIA / QUALIFICATION"',
    });
  }

  findings.push({
    id: 'bv-basis',
    level: 'warning',
    title: 'The document never defines what one BV unit is',
    detail:
      'Ranks list a BV threshold alongside a team size of the same number (300 team / 300 BV), but no rule says whether BV counts registrations, current-month deposits, or deposits since joining.',
    resolution:
      'The engine counts one BV unit per Rs 5,000 instalment received anywhere in the team since joining, and counts "active members" separately as the team members who deposited this month. Both are shown as raw counts so the basis can be re-pointed without touching the rank rules.',
    source: 'Page 2, "INCOME CRITERIA / QUALIFICATION"',
  });

  /* --- Leadership pool ------------------------------------------------ */

  const poolShares = sum(RANKS.map((rank) => rank.leadershipPoolShare));
  const referencePool = LEADERSHIP.referenceContributors * LEADERSHIP.contributionPerMember;
  findings.push({
    id: 'leadership-pool',
    level: poolShares === BPS_DENOMINATOR && referencePool === LEADERSHIP.referencePool ? 'ok' : 'warning',
    title: 'Leadership pool shares reconcile',
    detail: `The six rank shares total ${pct(poolShares)}, and 100 contributions of Rs 100 build exactly the Rs 10,000 reference pool.`,
    resolution: 'Each rank takes its stated share of the live pool, divided between that rank’s qualifiers.',
    source: 'Page 2, "SUVARNA LEADERSHIP REWARD (10%)"',
  });

  /* --- Savings arithmetic --------------------------------------------- */

  const computedTotal = SAVINGS.termMonths * SAVINGS.monthlyDeposit;
  findings.push({
    id: 'deposit-total',
    level: computedTotal === SAVINGS.statedTotalDeposit ? 'ok' : 'warning',
    title: 'Deposit ladder reconciles with the stated total',
    detail: `30 instalments of Rs 5,000 total Rs ${inr(computedTotal)}, matching the stated Rs ${inr(
      SAVINGS.statedTotalDeposit,
    )}.`,
    resolution: 'No adjustment needed.',
    source: 'Page 1, deposit summary',
  });

  const finalBenefit = benefitForMonth(SAVINGS.termMonths);
  const finalDeposit = cumulativeDeposit(SAVINGS.termMonths);
  findings.push({
    id: 'maturity-vs-benefit',
    level: 'info',
    title: 'Holding to maturity beats every spin outcome',
    detail: `A month-30 spin win returns Rs ${inr(finalBenefit)} against Rs ${inr(
      finalDeposit,
    )} deposited, while the month-31 maturity returns Rs ${inr(SAVINGS.maturityValue)}. The benefit chart is worth more the earlier it lands.`,
    resolution: 'Both outcomes are modelled; the ledger shows whichever applies to the member.',
    source: 'Page 1, benefit chart and maturity note',
  });

  findings.push({
    id: 'maturity-cohort',
    level: 'info',
    title: 'Maturity cohort is expressed as a range',
    detail:
      'The document says "between 31 to 100 people" receive the maturity amount in month 31, which reads as a group size rather than a per-member guarantee.',
    resolution: 'The dashboard states the maturity value per member and labels the cohort figure as stated.',
    source: 'Page 1, maturity note',
  });

  /* --- Projection ----------------------------------------------------- */

  const projection = statedProjection();
  const teamMatches = projection.teamIncome === PROJECTION_STATED.teamIncome;
  const monthlyMatches = projection.monthlyIncome === PROJECTION_STATED.monthlyIncome;
  findings.push({
    id: 'projection-arithmetic',
    level: teamMatches && monthlyMatches ? 'ok' : 'warning',
    title: 'Four-level illustration adds up',
    detail: `Level totals sum to Rs ${inr(projection.teamIncome)} and, with Rs ${inr(
      PROJECTION_STATED.binaryIncome,
    )} of binary income, reach Rs ${inr(projection.monthlyIncome)} — both matching the stated figures. That binary figure implies ${projection.binaryPairs.toLocaleString('en-IN')} matched pairs at Rs ${inr(MATCHING.payoutPerPair)} each.`,
    resolution:
      'The illustration is reproduced as printed and clearly labelled as a maximum-duplication scenario, not a forecast.',
    source: 'Page 3, "ESTIMATED EARNING FOR 1 ID"',
  });

  findings.push({
    id: 'projection-assumption',
    level: 'warning',
    title: 'The illustration assumes a perfectly duplicated 11,110-member team',
    detail: `Reaching Rs ${inr(PROJECTION_STATED.monthlyIncome)} a month requires every member to sponsor ten actives across four levels, all paying every month. Typical teams neither fill nor stay active at that rate.`,
    resolution:
      'The dashboard pairs the printed illustration with a calculator driven by real width, depth, activity and leg balance.',
    source: 'Page 3',
  });

  return findings;
}

/** Convenience: worst severity across all findings. */
export function integritySummary(findings: readonly Finding[]): {
  ok: number;
  info: number;
  warning: number;
  worst: FindingLevel;
} {
  const counts = { ok: 0, info: 0, warning: 0 };
  for (const finding of findings) counts[finding.level] += 1;
  const worst: FindingLevel = counts.warning > 0 ? 'warning' : counts.info > 0 ? 'info' : 'ok';
  return { ...counts, worst };
}

/** Commissionable value generated by one active member in one month. */
export const BASE_PER_MEMBER_MONTH = COMMISSIONABLE_BASE;

function pct(bps: number): string {
  const value = bps / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function inr(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
