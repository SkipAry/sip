/**
 * The savings side of the plan: the 30-month deposit ladder, the monthly
 * lucky-spin benefit chart, and maturity.
 */

import { SAVINGS } from './config';
import type { Paise } from './money';

export type InstalmentStatus =
  /** Deposit received. */
  | 'paid'
  /** This month's deposit is open for payment. */
  | 'due'
  /** A future month, not yet payable. */
  | 'scheduled'
  /** Missed: the month closed without a deposit. */
  | 'missed'
  /** The lucky spin settled the account; no further deposit is owed. */
  | 'settled';

export interface BenefitRow {
  month: number;
  /** Total deposited by the end of this month, if every instalment was paid. */
  cumulativeDeposit: Paise;
  /** Gold value awarded if this member wins the spin in this month. */
  benefit: Paise;
  /** Benefit less what has been deposited so far. */
  upside: Paise;
}

export interface InstalmentRow extends BenefitRow {
  status: InstalmentStatus;
  /** Amount actually payable this month (zero once the plan is settled). */
  payable: Paise;
  dueDate: Date;
}

export interface SavingsPosition {
  monthsPaid: number;
  monthsRemaining: number;
  paid: Paise;
  outstanding: Paise;
  /** 0..1 progress through the 30-month term. */
  progress: number;
  /** Gold value the member is currently entitled to. */
  entitlement: Paise;
  /** Entitlement less deposits made so far. */
  netGain: Paise;
  settledBySpin: boolean;
  spinMonth: number | null;
  maturityDate: Date;
}

/**
 * Gold value awarded to the lucky-spin winner in a given month.
 *
 * [p1] Month 1 pays Rs 20,000 and each subsequent month adds Rs 5,000, so the
 * benefit is always the deposits made so far plus a flat Rs 15,000 head start.
 */
export function benefitForMonth(month: number): Paise {
  assertMonthInTerm(month);
  return SAVINGS.firstMonthBenefit + (month - 1) * SAVINGS.benefitStep;
}

/** Total deposited by the end of `month`, assuming every instalment was paid. */
export function cumulativeDeposit(month: number): Paise {
  assertMonthInTerm(month);
  return month * SAVINGS.monthlyDeposit;
}

/** The full 30-row lucky-winner benefit chart from [p1]. */
export function buildBenefitChart(): BenefitRow[] {
  return Array.from({ length: SAVINGS.termMonths }, (_, index) => {
    const month = index + 1;
    const deposit = cumulativeDeposit(month);
    const benefit = benefitForMonth(month);
    return { month, cumulativeDeposit: deposit, benefit, upside: benefit - deposit };
  });
}

export interface LedgerInput {
  /** Month the member joined; instalment 1 falls on this date. */
  startDate: Date;
  /** Number of instalments actually received, counted from month 1. */
  instalmentsPaid: number;
  /** Month the member's number came up in the spin, or `null`. */
  spinWonInMonth?: number | null;
  /** Today, injected so the ledger is deterministic under test. */
  today?: Date;
}

/**
 * Build the member's 30-month instalment ledger.
 *
 * A spin win settles the account: [p1] "If your number does not come up in the
 * lucky spin, you will have to make payments for 30 months" — so a winner stops
 * paying from the month after the win.
 */
export function buildLedger(input: LedgerInput): InstalmentRow[] {
  const { startDate, instalmentsPaid } = input;
  const spinMonth = input.spinWonInMonth ?? null;
  const today = input.today ?? new Date();
  const currentMonth = monthsElapsed(startDate, today) + 1;

  return buildBenefitChart().map((row) => {
    const dueDate = addMonths(startDate, row.month - 1);
    const settled = spinMonth !== null && row.month > spinMonth;

    let status: InstalmentStatus;
    if (settled) status = 'settled';
    else if (row.month <= instalmentsPaid) status = 'paid';
    else if (row.month < currentMonth) status = 'missed';
    else if (row.month === currentMonth) status = 'due';
    else status = 'scheduled';

    return {
      ...row,
      status,
      payable: settled ? 0 : SAVINGS.monthlyDeposit,
      dueDate,
    };
  });
}

/** Roll a ledger up into the headline savings position. */
export function summarisePosition(ledger: readonly InstalmentRow[], input: LedgerInput): SavingsPosition {
  const spinMonth = input.spinWonInMonth ?? null;
  const paidRows = ledger.filter((row) => row.status === 'paid');
  const monthsPaid = paidRows.length;
  const paid = monthsPaid * SAVINGS.monthlyDeposit;
  const outstanding = ledger
    .filter((row) => row.status !== 'paid' && row.status !== 'settled')
    .reduce((total, row) => total + row.payable, 0);

  const entitlement = spinMonth !== null ? benefitForMonth(spinMonth) : SAVINGS.maturityValue;

  return {
    monthsPaid,
    monthsRemaining: ledger.filter((row) => row.status === 'scheduled' || row.status === 'due').length,
    paid,
    outstanding,
    progress: monthsPaid / SAVINGS.termMonths,
    entitlement,
    netGain: entitlement - paid,
    settledBySpin: spinMonth !== null,
    spinMonth,
    maturityDate: addMonths(input.startDate, SAVINGS.maturityMonth - 1),
  };
}

/**
 * Probability that a member who has not yet won is drawn in a given month,
 * given a pool of `poolSize` still-paying members and one winner per month.
 */
export function spinOdds(poolSize: number): number {
  return poolSize > 0 ? 1 / poolSize : 0;
}

/**
 * Chance of winning at least once across `months` draws, assuming the pool
 * shrinks by one winner each month.
 */
export function cumulativeSpinOdds(poolSize: number, months: number): number {
  let missProbability = 1;
  for (let index = 0; index < months; index += 1) {
    const remaining = poolSize - index;
    if (remaining <= 0) break;
    missProbability *= 1 - 1 / remaining;
  }
  return 1 - missProbability;
}

/* ----------------------------- helpers ----------------------------- */

function assertMonthInTerm(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > SAVINGS.termMonths) {
    throw new RangeError(`Month ${month} is outside the ${SAVINGS.termMonths}-month term.`);
  }
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  const targetDay = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDayOfTarget = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(targetDay, lastDayOfTarget));
  return next;
}

export function monthsElapsed(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return to.getDate() >= from.getDate() ? months : months - 1;
}
