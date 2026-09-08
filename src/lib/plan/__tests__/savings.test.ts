import { describe, expect, it } from 'vitest';
import {
  addMonths,
  benefitForMonth,
  buildBenefitChart,
  buildLedger,
  cumulativeDeposit,
  cumulativeSpinOdds,
  monthsElapsed,
  spinOdds,
  summarisePosition,
} from '../savings';
import { SAVINGS } from '../config';
import { rupees } from '../money';

/**
 * The full benefit chart exactly as printed on page 1, in rupees.
 * [month, cumulative deposit, benefit]
 */
const PRINTED_CHART: ReadonlyArray<readonly [number, number, number]> = [
  [1, 5_000, 20_000],
  [2, 10_000, 25_000],
  [3, 15_000, 30_000],
  [4, 20_000, 35_000],
  [5, 25_000, 40_000],
  [6, 30_000, 45_000],
  [7, 35_000, 50_000],
  [8, 40_000, 55_000],
  [9, 45_000, 60_000],
  [10, 50_000, 65_000],
  [11, 55_000, 70_000],
  [12, 60_000, 75_000],
  [13, 65_000, 80_000],
  [14, 70_000, 85_000],
  [15, 75_000, 90_000],
  [16, 80_000, 95_000],
  [17, 85_000, 1_00_000],
  [18, 90_000, 1_05_000],
  [19, 95_000, 1_10_000],
  [20, 1_00_000, 1_15_000],
  [21, 1_05_000, 1_20_000],
  [22, 1_10_000, 1_25_000],
  [23, 1_15_000, 1_30_000],
  [24, 1_20_000, 1_35_000],
  [25, 1_25_000, 1_40_000],
  [26, 1_30_000, 1_45_000],
  [27, 1_35_000, 1_50_000],
  [28, 1_40_000, 1_55_000],
  [29, 1_45_000, 1_60_000],
  [30, 1_50_000, 1_65_000],
];

describe('benefit chart', () => {
  it('reproduces every printed row', () => {
    for (const [month, deposit, benefit] of PRINTED_CHART) {
      expect(cumulativeDeposit(month)).toBe(rupees(deposit));
      expect(benefitForMonth(month)).toBe(rupees(benefit));
    }
  });

  it('has 30 rows and a constant Rs 15,000 head start over deposits', () => {
    const chart = buildBenefitChart();
    expect(chart).toHaveLength(30);
    for (const row of chart) {
      expect(row.upside).toBe(rupees(15_000));
    }
  });

  it('rejects months outside the term', () => {
    expect(() => benefitForMonth(0)).toThrow(RangeError);
    expect(() => benefitForMonth(31)).toThrow(RangeError);
    expect(() => cumulativeDeposit(1.5)).toThrow(RangeError);
  });

  it('reconciles 30 instalments with the stated total deposit', () => {
    expect(SAVINGS.termMonths * SAVINGS.monthlyDeposit).toBe(SAVINGS.statedTotalDeposit);
  });

  it('prices maturity above the best spin outcome', () => {
    expect(SAVINGS.maturityValue).toBeGreaterThan(benefitForMonth(30));
  });
});

describe('ledger', () => {
  const startDate = new Date('2024-01-10T00:00:00Z');

  it('classifies paid, due, missed and scheduled instalments', () => {
    const input = {
      startDate,
      instalmentsPaid: 6,
      today: new Date('2024-09-15T00:00:00Z'), // month 9
    };
    const ledger = buildLedger(input);

    expect(ledger[0]!.status).toBe('paid');
    expect(ledger[5]!.status).toBe('paid');
    expect(ledger[6]!.status).toBe('missed'); // month 7 closed unpaid
    expect(ledger[7]!.status).toBe('missed'); // month 8 closed unpaid
    expect(ledger[8]!.status).toBe('due'); // month 9 is open
    expect(ledger[9]!.status).toBe('scheduled');
  });

  it('stops instalments after a spin win and zeroes what is payable', () => {
    const input = {
      startDate,
      instalmentsPaid: 8,
      spinWonInMonth: 8,
      today: new Date('2024-12-15T00:00:00Z'),
    };
    const ledger = buildLedger(input);

    expect(ledger[7]!.status).toBe('paid');
    expect(ledger.slice(8).every((row) => row.status === 'settled')).toBe(true);
    expect(ledger.slice(8).every((row) => row.payable === 0)).toBe(true);
  });

  it('summarises an on-track member holding to maturity', () => {
    const input = { startDate, instalmentsPaid: 12, today: new Date('2025-01-15T00:00:00Z') };
    const position = summarisePosition(buildLedger(input), input);

    expect(position.monthsPaid).toBe(12);
    expect(position.paid).toBe(rupees(60_000));
    expect(position.outstanding).toBe(rupees(90_000));
    expect(position.progress).toBeCloseTo(0.4, 10);
    expect(position.entitlement).toBe(SAVINGS.maturityValue);
    expect(position.netGain).toBe(rupees(1_10_000));
    expect(position.settledBySpin).toBe(false);
  });

  it('summarises a spin winner against the month they won', () => {
    const input = {
      startDate,
      instalmentsPaid: 5,
      spinWonInMonth: 5,
      today: new Date('2024-06-15T00:00:00Z'),
    };
    const position = summarisePosition(buildLedger(input), input);

    expect(position.paid).toBe(rupees(25_000));
    expect(position.outstanding).toBe(0);
    expect(position.entitlement).toBe(rupees(40_000));
    expect(position.netGain).toBe(rupees(15_000));
    expect(position.settledBySpin).toBe(true);
  });
});

describe('spin odds', () => {
  it('is one in the pool size for a single draw', () => {
    expect(spinOdds(500)).toBeCloseTo(0.002, 10);
    expect(spinOdds(0)).toBe(0);
  });

  it('accumulates as the pool shrinks by one winner a month', () => {
    // With a pool of 30 and 30 draws, every member wins exactly once.
    expect(cumulativeSpinOdds(30, 30)).toBeCloseTo(1, 10);
    expect(cumulativeSpinOdds(100, 30)).toBeCloseTo(0.3, 10);
  });

  it('never exceeds certainty once the pool is exhausted', () => {
    expect(cumulativeSpinOdds(5, 30)).toBeCloseTo(1, 10);
  });
});

describe('date helpers', () => {
  it('clamps to the last day of a shorter month', () => {
    expect(addMonths(new Date(2024, 0, 31), 1).getDate()).toBe(29); // Feb 2024
    expect(addMonths(new Date(2023, 0, 31), 1).getDate()).toBe(28); // Feb 2023
  });

  it('counts whole months only', () => {
    expect(monthsElapsed(new Date(2024, 0, 10), new Date(2024, 3, 9))).toBe(2);
    expect(monthsElapsed(new Date(2024, 0, 10), new Date(2024, 3, 10))).toBe(3);
  });
});
