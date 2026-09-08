import { describe, expect, it } from 'vitest';
import { projectTeam, statedProjection } from '../projection';
import { PROJECTION_STATED } from '../config';
import { rupees } from '../money';

describe('stated four-level projection', () => {
  it('reproduces the printed per-level totals', () => {
    const printed = [1_000, 5_000, 35_000, 2_50_000];
    const projection = statedProjection();
    projection.rows.forEach((row, index) => {
      expect(row.total).toBe(rupees(printed[index]!));
    });
  });

  it('reaches the printed grand totals', () => {
    const projection = statedProjection();
    expect(projection.teamIncome).toBe(PROJECTION_STATED.teamIncome);
    expect(projection.teamIncome).toBe(rupees(2_91_000));
    expect(projection.monthlyIncome).toBe(PROJECTION_STATED.monthlyIncome);
    expect(projection.monthlyIncome).toBe(rupees(16_24_200));
  });

  it('implies 3,333 matched pairs behind the binary figure', () => {
    expect(statedProjection().binaryPairs).toBe(3_333);
  });
});

describe('team calculator', () => {
  it('reproduces the document scenario at ten-wide, four-deep, fully active', () => {
    const projection = projectTeam({ width: 10, depth: 4, activeRate: 1, weakLegShare: 0.5 });
    expect(projection.teamIncome).toBe(rupees(2_91_000));
    expect(projection.rows.map((row) => row.members)).toEqual([10, 100, 1_000, 10_000]);
  });

  it('scales members down with the activity rate', () => {
    const projection = projectTeam({ width: 10, depth: 2, activeRate: 0.5, weakLegShare: 0.5 });
    expect(projection.rows.map((row) => row.members)).toEqual([5, 50]);
    expect(projection.teamIncome).toBe(rupees(5 * 100 + 50 * 50));
  });

  it('earns no binary income when one leg is empty', () => {
    const projection = projectTeam({ width: 10, depth: 3, activeRate: 1, weakLegShare: 0 });
    expect(projection.binaryPairs).toBe(0);
    expect(projection.binaryIncome).toBe(0);
    expect(projection.monthlyIncome).toBe(projection.teamIncome);
  });

  it('rewards a balanced pair of legs most', () => {
    const balanced = projectTeam({ width: 10, depth: 3, activeRate: 1, weakLegShare: 0.5 });
    const lopsided = projectTeam({ width: 10, depth: 3, activeRate: 1, weakLegShare: 0.1 });
    expect(balanced.binaryIncome).toBeGreaterThan(lopsided.binaryIncome);
  });

  it('clamps depth, width and rates into range', () => {
    const projection = projectTeam({ width: -4, depth: 99, activeRate: 5, weakLegShare: 9 });
    expect(projection.rows).toHaveLength(4);
    expect(projection.rows.every((row) => row.members === 0)).toBe(true);
    expect(projection.monthlyIncome).toBe(0);
  });
});
