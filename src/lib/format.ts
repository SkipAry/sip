/**
 * Display helpers. Every rupee figure in the interface goes through here so
 * grouping, symbols and abbreviations stay consistent.
 */

import { toRupees, type Paise } from './plan/money';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plain = new Intl.NumberFormat('en-IN');

/** Rs 1,50,000 — Indian digit grouping, no decimals. */
export function money(amount: Paise): string {
  return inr.format(toRupees(amount));
}

/** Rs 1,50,000.00 — for statements and ledgers. */
export function moneyExact(amount: Paise): string {
  return inrPrecise.format(toRupees(amount));
}

/**
 * Compact Indian notation: Rs 1.5 L, Rs 16.2 L, Rs 1.2 Cr.
 * Used only where space is tight and the exact paisa does not matter.
 */
export function moneyShort(amount: Paise): string {
  const rupeeValue = toRupees(amount);
  const sign = rupeeValue < 0 ? '-' : '';
  const value = Math.abs(rupeeValue);

  if (value >= 1_00_00_000) return `${sign}₹${trim(value / 1_00_00_000)} Cr`;
  if (value >= 1_00_000) return `${sign}₹${trim(value / 1_00_000)} L`;
  if (value >= 1_000) return `${sign}₹${trim(value / 1_000)} K`;
  return `${sign}₹${plain.format(Math.round(value))}`;
}

export function count(value: number): string {
  return plain.format(Math.round(value));
}

/** Basis points to a readable percentage: 350 -> "3.5%". */
export function bpsLabel(bps: number): string {
  const value = bps / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

/** A 0..1 fraction to a percentage string. */
export function percent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

const monthFormat = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function monthLabel(date: Date): string {
  return monthFormat.format(date);
}

export function dateLabel(date: Date): string {
  return dayFormat.format(date);
}

function trim(value: number): string {
  return value >= 100 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, '');
}
