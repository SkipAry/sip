/**
 * Deterministic demo dataset.
 *
 * There is no backend in this repository, so the dashboard is driven by a
 * seeded generator that builds a real sponsor tree and then *derives* every
 * headline number from it with the same engine a production payout run would
 * use. Nothing on screen is a hard-coded figure: change the seed and every
 * total, rank and chart moves together, which is exactly the property you want
 * when wiring this to a real API later.
 */

import {
  buildLedger,
  cumulativeSpinOdds,
  currentRank,
  incomeSnapshot,
  leadershipPool,
  matchPairs,
  matchingReward,
  nextRank,
  SAVINGS,
  summarisePosition,
  type IncomeSnapshot,
  type InstalmentRow,
  type MatchingResult,
  type Paise,
  type RankDefinition,
  type RankId,
  type RankProgress,
  type SavingsPosition,
  type Standing,
} from '@/lib/plan';
import { addMonths } from '@/lib/plan/savings';
import { createRandom, intBetween, pick } from './random';

export type Leg = 'left' | 'right';

export interface TeamMember {
  id: string;
  name: string;
  city: string;
  /** Depth below the signed-in member; 1 = a direct referral. */
  level: number;
  leg: Leg;
  sponsorId: string;
  joinedAt: Date;
  instalmentsPaid: number;
  /** Deposited in the current month. */
  active: boolean;
  /** Month the member's number came up in the spin, if it has. */
  spinWonInMonth: number | null;
}

export interface SpinDraw {
  month: number;
  drawnAt: Date;
  winnerName: string;
  winnerId: string;
  benefit: Paise;
  poolSize: number;
  /** True when the signed-in member won this draw. */
  isYou: boolean;
}

export interface IncomeMonth {
  label: string;
  date: Date;
  referral: Paise;
  level: Paise;
  matching: Paise;
  leadership: Paise;
  total: Paise;
}

/** One day's matching run — this is where the rank's daily cap actually bites. */
export interface DailyRun {
  date: Date;
  freshLeft: number;
  freshRight: number;
  carryLeft: number;
  carryRight: number;
  result: MatchingResult;
}

export interface LegSnapshot {
  leg: Leg;
  members: number;
  activeMembers: number;
  /** Business volume available to match this run, including carry-in. */
  volume: number;
  carryIn: number;
}

export interface Account {
  member: {
    id: string;
    name: string;
    city: string;
    joinedAt: Date;
    sponsorName: string;
  };
  ledger: InstalmentRow[];
  position: SavingsPosition;
  team: TeamMember[];
  standing: Standing;
  rank: RankDefinition | null;
  nextRank: RankProgress | null;
  legs: Record<Leg, LegSnapshot>;
  activeByLevel: number[];
  income: IncomeSnapshot;
  /** Month-to-date days already run, used to size the cumulative cap. */
  daysElapsed: number;
  dailyRun: DailyRun;
  history: IncomeMonth[];
  draws: SpinDraw[];
  /** Probability of winning a draw in the months still to run. */
  spinChance: { thisMonth: number; remainingTerm: number; poolSize: number };
  leadership: ReturnType<typeof leadershipPool>;
  /** Members across the whole company still paying into the plan. */
  companyPool: number;
  generatedAt: Date;
}

const FIRST_NAMES = [
  'Aarav',
  'Ananya',
  'Rohan',
  'Meera',
  'Vikram',
  'Divya',
  'Kabir',
  'Nisha',
  'Arjun',
  'Priya',
  'Sameer',
  'Ishita',
  'Rahul',
  'Kavya',
  'Manish',
  'Sneha',
  'Yash',
  'Pooja',
  'Aditya',
  'Ritu',
  'Karan',
  'Shreya',
  'Nikhil',
  'Anjali',
  'Devansh',
  'Tara',
  'Harsh',
  'Neha',
  'Omkar',
  'Lata',
];

const LAST_NAMES = [
  'Sharma',
  'Patel',
  'Reddy',
  'Iyer',
  'Nair',
  'Desai',
  'Gupta',
  'Joshi',
  'Mehta',
  'Rao',
  'Kulkarni',
  'Bose',
  'Chauhan',
  'Pillai',
  'Shetty',
  'Bhat',
  'Kapoor',
  'Verma',
  'Sinha',
  'Menon',
];

const CITIES = [
  'Pune',
  'Nashik',
  'Nagpur',
  'Kolhapur',
  'Aurangabad',
  'Solapur',
  'Thane',
  'Satara',
  'Sangli',
  'Ahmednagar',
  'Jalgaon',
  'Latur',
];

export interface GenerateOptions {
  seed?: number;
  /** Injected so the dataset is stable under test. */
  today?: Date;
}

export function generateAccount(options: GenerateOptions = {}): Account {
  const seed = options.seed ?? 20_260_908;
  const today = options.today ?? new Date();
  const random = createRandom(seed);

  const joinedAt = addMonths(startOfMonth(today), -22);
  const monthsIn = 23;
  const instalmentsPaid = 22;

  /* ---- the sponsor tree ------------------------------------------- */

  const team = buildTeam(random, joinedAt, today);

  const directs = team.filter((member) => member.level === 1);
  const activeMembers = team.filter((member) => member.active);
  const activeDirects = directs.filter((member) => member.active);

  const activeByLevel = Array.from(
    { length: 10 },
    (_, index) => team.filter((member) => member.level === index + 1 && member.active).length,
  );

  /* ---- binary legs -------------------------------------------------- */

  const legs = {
    left: legSnapshot(team, 'left', intBetween(random, 2, 6)),
    right: legSnapshot(team, 'right', intBetween(random, 2, 6)),
  } satisfies Record<Leg, LegSnapshot>;

  const pairing = matchPairs(legs.left.volume, legs.right.volume);

  /* ---- standing and rank -------------------------------------------- */

  // One BV unit per Rs 5,000 instalment received anywhere in the team.
  const businessVolume = team.reduce((total, member) => total + member.instalmentsPaid, 0);

  const standing: Standing = {
    directs: directs.length,
    teamSize: team.length,
    businessVolume,
    activeMembers: activeMembers.length,
    matchingPairs: pairing.pairs,
  };

  const rank = currentRank(standing);
  const rankId: RankId | null = rank?.id ?? null;

  /* ---- leadership pool ---------------------------------------------- */

  const leadershipContributors = 60 + Math.floor(activeMembers.length * 1.8);
  const qualifiers = {
    associate: intBetween(random, 14, 22),
    silver: intBetween(random, 6, 11),
    gold: intBetween(random, 3, 6),
    ruby: intBetween(random, 1, 3),
    diamond: intBetween(random, 0, 2),
    crown: intBetween(random, 0, 1),
  };
  const leadership = leadershipPool(leadershipContributors, qualifiers);

  /* ---- this month's income ------------------------------------------ */

  // The matching cap is a *daily* ceiling, so a month-to-date figure is
  // measured against the cap multiplied by the days already run.
  const daysElapsed = today.getDate();

  const income = incomeSnapshot({
    activeDirects: activeDirects.length,
    directs: directs.length,
    activeByLevel,
    leftVolume: legs.left.volume,
    rightVolume: legs.right.volume,
    rank: rankId,
    days: daysElapsed,
    leadershipContributors,
    leadershipQualifiers: qualifiers,
  });

  // Today's run: instalments that landed today, plus volume carried from
  // yesterday's unmatched leg.
  const freshLeft = Math.round(legs.left.activeMembers * 0.06) + intBetween(random, 0, 4);
  const freshRight = Math.round(legs.right.activeMembers * 0.05) + intBetween(random, 0, 4);
  const carryLeft = intBetween(random, 14, 22);
  const carryRight = intBetween(random, 36, 46);

  const dailyRun: DailyRun = {
    date: today,
    freshLeft,
    freshRight,
    carryLeft,
    carryRight,
    result: matchingReward({
      leftVolume: freshLeft + carryLeft,
      rightVolume: freshRight + carryRight,
      rank: rankId,
      days: 1,
    }),
  };

  /* ---- savings ledger ------------------------------------------------ */

  const ledgerInput = { startDate: joinedAt, instalmentsPaid, spinWonInMonth: null, today };
  const ledger = buildLedger(ledgerInput);
  const position = summarisePosition(ledger, ledgerInput);

  /* ---- history and draws ---------------------------------------------- */

  const history = buildHistory(random, income, today, Math.min(12, monthsIn));
  const companyPool = 640 + intBetween(random, -40, 40);
  const draws = buildDraws(random, team, joinedAt, today, monthsIn, companyPool);

  return {
    member: {
      id: 'SS-100244',
      name: 'Priya Deshmukh',
      city: 'Pune',
      joinedAt,
      sponsorName: 'Rajesh Kulkarni',
    },
    ledger,
    position,
    team,
    standing,
    rank,
    nextRank: nextRank(standing),
    legs,
    activeByLevel,
    income,
    daysElapsed,
    dailyRun,
    history,
    draws,
    spinChance: {
      thisMonth: companyPool > 0 ? 1 / companyPool : 0,
      remainingTerm: cumulativeSpinOdds(companyPool, SAVINGS.termMonths - instalmentsPaid),
      poolSize: companyPool,
    },
    leadership,
    companyPool,
    generatedAt: today,
  };
}

/* ------------------------------------------------------------------ *
 * Builders                                                            *
 * ------------------------------------------------------------------ */

function buildTeam(random: () => number, rootJoinedAt: Date, today: Date): TeamMember[] {
  const team: TeamMember[] = [];
  // Level 1 is hand-set to 11 directs so the member clears the "10 Direct"
  // gate that every rank requires; deeper levels taper the way real teams do.
  const widthByLevel = [11, 3.2, 2.3, 1.7, 1.3, 1, 0.8, 0.6, 0.45, 0.3];
  // Share of each level that is still depositing this month.
  const activityByLevel = [0.82, 0.71, 0.63, 0.55, 0.48, 0.42, 0.36, 0.3, 0.26, 0.22];

  let frontier: Array<{ id: string; leg: Leg; joinedAt: Date }> = [
    { id: 'root', leg: 'left', joinedAt: rootJoinedAt },
  ];

  for (let level = 1; level <= 10; level += 1) {
    const width = widthByLevel[level - 1]!;
    const activity = activityByLevel[level - 1]!;
    const next: Array<{ id: string; leg: Leg; joinedAt: Date }> = [];

    for (const parent of frontier) {
      const children = level === 1 ? width : sampleWidth(random, width);

      for (let index = 0; index < children; index += 1) {
        const joinedAt = addMonths(parent.joinedAt, intBetween(random, 1, 3));
        if (joinedAt > today) continue;

        const monthsMember = Math.max(1, Math.min(SAVINGS.termMonths, monthsBetween(joinedAt, today) + 1));
        const active = random() < activity;
        const instalmentsPaid = active ? monthsMember : Math.max(1, monthsMember - intBetween(random, 1, 4));

        const id = `SS-${(200_000 + team.length * 7 + index).toString()}`;
        const leg: Leg = level === 1 ? (index % 2 === 0 ? 'left' : 'right') : parent.leg;

        team.push({
          id,
          name: `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`,
          city: pick(random, CITIES),
          level,
          leg,
          sponsorId: parent.id,
          joinedAt,
          instalmentsPaid: Math.min(instalmentsPaid, SAVINGS.termMonths),
          active,
          spinWonInMonth: random() < 0.012 ? intBetween(random, 1, monthsMember) : null,
        });

        next.push({ id, leg, joinedAt });
      }
    }

    frontier = next;
    if (frontier.length === 0) break;
    // Keep the demo tree to a size a browser can render comfortably.
    if (team.length > 1_400) break;
  }

  return team;
}

/** Turn a fractional average width into a whole number of children. */
function sampleWidth(random: () => number, average: number): number {
  const floor = Math.floor(average);
  return floor + (random() < average - floor ? 1 : 0);
}

function legSnapshot(team: readonly TeamMember[], leg: Leg, carryIn: number): LegSnapshot {
  const members = team.filter((member) => member.leg === leg);
  const activeMembers = members.filter((member) => member.active);
  return {
    leg,
    members: members.length,
    activeMembers: activeMembers.length,
    volume: activeMembers.length + carryIn,
    carryIn,
  };
}

function buildHistory(
  random: () => number,
  current: IncomeSnapshot,
  today: Date,
  months: number,
): IncomeMonth[] {
  const rows: IncomeMonth[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = addMonths(startOfMonth(today), -offset);
    // Earlier months are smaller: the team was smaller then.
    const growth = Math.pow(0.87, offset);
    const noise = 0.9 + random() * 0.2;
    const scale = growth * noise;

    const referral = Math.round(current.referral.total * scale);
    const level = Math.round(current.level.total * scale);
    const matching = Math.round(current.matching.payable * scale);
    const leadership = offset > 6 ? 0 : Math.round(current.leadership.earned * scale);

    rows.push({
      label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date),
      date,
      referral,
      level,
      matching,
      leadership,
      total: referral + level + matching + leadership,
    });
  }

  return rows;
}

function buildDraws(
  random: () => number,
  team: readonly TeamMember[],
  joinedAt: Date,
  today: Date,
  monthsIn: number,
  poolSize: number,
): SpinDraw[] {
  const winners = team.filter((member) => member.spinWonInMonth !== null);
  const draws: SpinDraw[] = [];
  const shown = Math.min(monthsIn, SAVINGS.termMonths);

  for (let month = shown; month >= 1; month -= 1) {
    const fromTeam = winners.find((member) => member.spinWonInMonth === month);
    const winner = fromTeam ?? {
      id: `SS-${intBetween(random, 300_000, 399_999)}`,
      name: `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`,
    };

    draws.push({
      month,
      drawnAt: addMonths(joinedAt, month - 1),
      winnerName: winner.name,
      winnerId: winner.id,
      benefit: SAVINGS.firstMonthBenefit + (month - 1) * SAVINGS.benefitStep,
      poolSize: poolSize + (shown - month),
      isYou: false,
    });
  }

  void today;
  return draws;
}

/* ----------------------------- helpers ----------------------------- */

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}
