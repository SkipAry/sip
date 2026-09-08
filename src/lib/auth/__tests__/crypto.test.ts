import { describe, expect, it } from 'vitest';
import {
  fromBase64,
  generateMemberId,
  generatePassword,
  hashPassword,
  randomBelow,
  randomChoice,
  timingSafeEqual,
  toBase64,
  verifyPassword,
} from '../crypto';

describe('generated passwords', () => {
  it('uses four readable groups of four', () => {
    for (let attempt = 0; attempt < 25; attempt += 1) {
      expect(generatePassword()).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
    }
  });

  it('excludes the look-alike characters', () => {
    // I/1 and O/0 are the pairs people mistype when reading a password aloud.
    // With both members of each pair gone, the remaining 32 symbols are all
    // distinguishable, which is what keeps the 80-bit entropy claim honest.
    const joined = Array.from({ length: 50 }, () => generatePassword()).join('');
    for (const forbidden of ['O', '0', 'I', '1']) {
      expect(joined).not.toContain(forbidden);
    }
  });

  it('draws from all 32 symbols', () => {
    const used = new Set(
      Array.from({ length: 400 }, () => generatePassword())
        .join('')
        .replace(/-/g, ''),
    );
    expect(used.size).toBe(32);
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generatePassword()));
    expect(seen.size).toBe(200);
  });
});

describe('generated member ids', () => {
  it('matches the SS-NNNNNN format', () => {
    expect(generateMemberId(new Set())).toMatch(/^SS-\d{6}$/);
  });

  it('never collides with an id already in use', () => {
    const taken = new Set<string>();
    for (let index = 0; index < 300; index += 1) {
      const id = generateMemberId(taken);
      expect(taken.has(id)).toBe(false);
      taken.add(id);
    }
    expect(taken.size).toBe(300);
  });
});

describe('password hashing', () => {
  it('accepts the right password and rejects a wrong one', async () => {
    const record = await hashPassword('SUVARNA-ADMIN-2026');
    expect(await verifyPassword('SUVARNA-ADMIN-2026', record)).toBe(true);
    expect(await verifyPassword('suvarna-admin-2026', record)).toBe(false);
    expect(await verifyPassword('', record)).toBe(false);
  });

  it('never stores the password itself', async () => {
    const record = await hashPassword('K7QM-3XPD-9RTF-2HWZ');
    expect(JSON.stringify(record)).not.toContain('K7QM');
  });

  it('salts every record, so the same password hashes differently', async () => {
    const first = await hashPassword('same-password');
    const second = await hashPassword('same-password');
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(await verifyPassword('same-password', second)).toBe(true);
  });

  it('uses a work factor worth having', async () => {
    expect((await hashPassword('x')).iterations).toBeGreaterThanOrEqual(200_000);
  });
});

describe('random helpers', () => {
  it('stays inside the bound', () => {
    for (let index = 0; index < 500; index += 1) {
      const value = randomBelow(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });

  it('reaches every value in a small range', () => {
    const seen = new Set(Array.from({ length: 400 }, () => randomBelow(5)));
    expect(seen.size).toBe(5);
  });

  it('rejects a non-positive bound', () => {
    expect(() => randomBelow(0)).toThrow(RangeError);
    expect(() => randomBelow(-3)).toThrow(RangeError);
  });

  it('refuses to choose from nothing', () => {
    expect(() => randomChoice([])).toThrow(RangeError);
    expect(randomChoice(['only'])).toBe('only');
  });
});

describe('encoding and comparison', () => {
  it('round-trips bytes through base64', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
  });

  it('compares byte arrays without short-circuiting on content', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });
});
