/**
 * Rank qualification.
 *
 * [p2] "Qualification Rules: 10 Direct Required for All Rank. Team Size
 * Required for every Rank achievement. Matching Pair Required for RankWise
 * Update. Active Members Required for Every RankWise."
 */

import { RANKS, type RankDefinition, type RankId } from './config';
import { clamp, ratio } from './money';

export interface Standing {
  directs: number;
  teamSize: number;
  businessVolume: number;
  activeMembers: number;
  /** Matching pairs formed — [p2] requires pairs for a rank update. */
  matchingPairs: number;
}

export type CriterionId = 'directs' | 'team' | 'bv' | 'active' | 'pairs';

export interface Criterion {
  id: CriterionId;
  label: string;
  current: number;
  required: number;
  met: boolean;
  /** 0..1, for progress bars. */
  progress: number;
  /** True when the plan document does not state a threshold for this rank. */
  unspecified: boolean;
}

export interface RankProgress {
  rank: RankDefinition;
  criteria: Criterion[];
  qualified: boolean;
  /** 0..1 across all criteria, so a member sees how close they are overall. */
  progress: number;
  /** The criteria still short. */
  blockers: Criterion[];
}

/** At least one pair is needed before any rank update takes effect. */
export const MIN_PAIRS_FOR_RANK = 1;

export function evaluateRank(rank: RankDefinition, standing: Standing): RankProgress {
  const criteria: Criterion[] = [
    criterion('directs', 'Direct referrals', standing.directs, rank.directsRequired, false),
    criterion('team', 'Team size', standing.teamSize, rank.teamRequired, false),
    criterion(
      'bv',
      'Business volume',
      standing.businessVolume,
      rank.bvRequired ?? 0,
      rank.bvRequired === null,
    ),
    criterion('active', 'Active members', standing.activeMembers, rank.activeRequired, false),
    criterion('pairs', 'Matching pairs', standing.matchingPairs, MIN_PAIRS_FOR_RANK, false),
  ];

  const blockers = criteria.filter((entry) => !entry.met);

  return {
    rank,
    criteria,
    qualified: blockers.length === 0,
    progress: criteria.reduce((total, entry) => total + entry.progress, 0) / criteria.length,
    blockers,
  };
}

/** Evaluate every rank, lowest tier first. */
export function evaluateAllRanks(standing: Standing): RankProgress[] {
  return RANKS.map((rank) => evaluateRank(rank, standing));
}

/** The highest rank the member currently qualifies for, or `null`. */
export function currentRank(standing: Standing): RankDefinition | null {
  const qualified = evaluateAllRanks(standing).filter((entry) => entry.qualified);
  return qualified.length === 0 ? null : qualified[qualified.length - 1]!.rank;
}

/** The next rank to chase, or `null` once Crown is held. */
export function nextRank(standing: Standing): RankProgress | null {
  return evaluateAllRanks(standing).find((entry) => !entry.qualified) ?? null;
}

export function rankById(id: RankId | null): RankDefinition | null {
  return id === null ? null : (RANKS.find((rank) => rank.id === id) ?? null);
}

function criterion(
  id: CriterionId,
  label: string,
  current: number,
  required: number,
  unspecified: boolean,
): Criterion {
  // An unspecified threshold cannot block qualification.
  const met = unspecified || current >= required;
  return {
    id,
    label,
    current,
    required,
    met,
    progress: unspecified ? 1 : clamp(ratio(current, required), 0, 1),
    unspecified,
  };
}
