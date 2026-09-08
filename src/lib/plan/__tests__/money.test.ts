import { describe, expect, it } from 'vitest';
import { applyBps, clamp, ratio, rupees, sum, toRupees } from '../money';
import { money, moneyShort, bpsLabel, percent } from '../../format';

describe('money primitives', () => {
  it('converts rupees to integer paise', () => {
    expect(rupees(5_000)).toBe(500_000);
    expect(toRupees(500_000)).toBe(5_000);
  });

  it('applies basis points without float drift', () => {
    expect(applyBps(rupees(1_000), 350)).toBe(rupees(35));
    expect(applyBps(rupees(1_000), 250)).toBe(rupees(25));
    expect(applyBps(rupees(1_000), 10_000)).toBe(rupees(1_000));
  });

  it('rounds half up to the nearest paisa', () => {
    expect(applyBps(1, 5_000)).toBe(1); // 0.5 paise rounds up
  });

  it('sums and clamps', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([])).toBe(0);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(ratio(1, 0)).toBe(0);
  });
});

describe('formatters', () => {
  it('groups rupees the Indian way', () => {
    expect(money(rupees(1_50_000))).toContain('1,50,000');
    expect(money(rupees(16_24_200))).toContain('16,24,200');
  });

  it('abbreviates large amounts', () => {
    expect(moneyShort(rupees(1_50_000))).toBe('₹1.5 L');
    expect(moneyShort(rupees(5_000))).toBe('₹5 K');
    expect(moneyShort(rupees(1_00_00_000))).toBe('₹1 Cr');
    expect(moneyShort(rupees(-5_000))).toBe('-₹5 K');
  });

  it('labels rates', () => {
    expect(bpsLabel(350)).toBe('3.5%');
    expect(bpsLabel(1_000)).toBe('10%');
    expect(percent(0.4)).toBe('40%');
  });
});
