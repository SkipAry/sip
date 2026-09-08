/**
 * Money is represented as an integer number of paise (1 rupee = 100 paise).
 *
 * Every rate in the plan is stored in basis points (1 bps = 0.01%), so that
 * "3.5%" is the integer 350 rather than a binary float. Combined, these two
 * choices mean the entire compensation engine runs on integer arithmetic and
 * no payout can drift by a fraction of a paisa.
 */

/** An integer count of paise. Never a float. */
export type Paise = number;

/** An integer count of basis points. 10_000 bps = 100%. */
export type Bps = number;

export const PAISE_PER_RUPEE = 100;
export const BPS_DENOMINATOR = 10_000;

/** Convert a whole-rupee figure to paise. */
export function rupees(amount: number): Paise {
  return Math.round(amount * PAISE_PER_RUPEE);
}

/** Convert paise back to a (possibly fractional) rupee figure, for display only. */
export function toRupees(amount: Paise): number {
  return amount / PAISE_PER_RUPEE;
}

/**
 * Apply a basis-point rate to an amount, rounding half-up to the nearest paisa.
 * Half-up is the convention used for commission payouts in Indian direct
 * selling: the member is never short-changed by a rounding mode.
 */
export function applyBps(amount: Paise, rate: Bps): Paise {
  return Math.round((amount * rate) / BPS_DENOMINATOR);
}

/** Sum a list of paise amounts. */
export function sum(amounts: readonly Paise[]): Paise {
  return amounts.reduce((total, value) => total + value, 0);
}

/** Clamp a value into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Percentage of `value` against `total`, guarded against divide-by-zero. */
export function ratio(value: number, total: number): number {
  return total === 0 ? 0 : value / total;
}
