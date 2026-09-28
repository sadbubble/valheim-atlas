import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from './rng';

describe('hashSeed', () => {
  it('is deterministic and unsigned 32-bit', () => {
    expect(hashSeed('test-seed')).toBe(hashSeed('test-seed'));
    const h = hashSeed('test-seed');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it('differs for different seeds', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
    expect(hashSeed('')).not.toBe(hashSeed(' '));
  });
});

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('stays in range', () => {
    const rng = createRng(hashSeed('range'));
    for (let i = 0; i < 10_000; i++) {
      const f = rng.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rng.int(-5, 5);
      expect(n).toBeGreaterThanOrEqual(-5);
      expect(n).toBeLessThan(5);
    }
  });
});
