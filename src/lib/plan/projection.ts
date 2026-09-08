/**
 * The illustrative four-level projection from [p3], plus a live calculator so a
 * member can substitute their own team shape instead of the document's.
 */

import { MATCHING, PROJECTION_STATED, PROJECTION_TIERS } from './config';
import { matchPairs } from './income';
import { sum, type Paise } from './money';

export interface ProjectionRow {
  level: number;
  members: number;
  incomePerMember: Paise;
  total: Paise;
}

export interface ProjectionResult {
  rows: ProjectionRow[];
  teamIncome: Paise;
  binaryIncome: Paise;
  monthlyIncome: Paise;
  binaryPairs: number;
}

/** Reproduce the document's own illustration, unchanged. */
export function statedProjection(): ProjectionResult {
  const rows = PROJECTION_TIERS.map((tier) => ({
    level: tier.level,
    members: tier.members,
    incomePerMember: tier.incomePerMember,
    total: tier.members * tier.incomePerMember,
  }));

  return {
    rows,
    teamIncome: sum(rows.map((row) => row.total)),
    binaryIncome: PROJECTION_STATED.binaryIncome,
    monthlyIncome: sum(rows.map((row) => row.total)) + PROJECTION_STATED.binaryIncome,
    binaryPairs: PROJECTION_STATED.binaryIncome / MATCHING.payoutPerPair,
  };
}

export interface ProjectionInput {
  /** Direct referrals at level 1. */
  width: number;
  /** How many levels deep the duplication runs, 1..4. */
  depth: number;
  /** Share of the team that is active and paying, 0..1. */
  activeRate: number;
  /** Share of team volume that lands on the weaker leg, 0..0.5. */
  weakLegShare: number;
}

/**
 * Project income for a team of the member's own shape.
 *
 * Level income per member uses the document's own taper ([p3]: Rs 100, Rs 50,
 * Rs 35, Rs 25 for levels 1-4). Binary income pairs the two legs with the same
 * 1:2 / 2:1 rule the live engine uses.
 */
export function projectTeam(input: ProjectionInput): ProjectionResult {
  const depth = Math.max(1, Math.min(PROJECTION_TIERS.length, Math.trunc(input.depth)));
  const width = Math.max(0, Math.trunc(input.width));
  const activeRate = Math.max(0, Math.min(1, input.activeRate));
  const weakLegShare = Math.max(0, Math.min(0.5, input.weakLegShare));

  const rows: ProjectionRow[] = [];
  for (let level = 1; level <= depth; level += 1) {
    const tier = PROJECTION_TIERS[level - 1]!;
    const members = Math.round(width ** level * activeRate);
    rows.push({
      level,
      members,
      incomePerMember: tier.incomePerMember,
      total: members * tier.incomePerMember,
    });
  }

  const teamSize = sum(rows.map((row) => row.members));
  const weakLeg = Math.floor(teamSize * weakLegShare);
  const strongLeg = teamSize - weakLeg;
  const { pairs } = matchPairs(weakLeg, strongLeg);

  const teamIncome = sum(rows.map((row) => row.total));
  const binaryIncome = pairs * MATCHING.payoutPerPair;

  return {
    rows,
    teamIncome,
    binaryIncome,
    monthlyIncome: teamIncome + binaryIncome,
    binaryPairs: pairs,
  };
}
