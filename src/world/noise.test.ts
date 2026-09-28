import { describe, expect, it } from 'vitest';
import { createSimplex2D, fbm, ridged } from './noise';
import { createRng } from './rng';

describe('simplex noise', () => {
  it('is deterministic for a given PRNG seed', () => {
    const a = createSimplex2D(createRng(1));
    const b = createSimplex2D(createRng(1));
    const c = createSimplex2D(createRng(2));
    let diff = 0;
    for (let i = 0; i < 500; i++) {
      const x = i * 0.37 - 50;
      const y = i * -0.61 + 20;
      expect(a(x, y)).toBe(b(x, y));
      diff += Math.abs(a(x, y) - c(x, y));
    }
    expect(diff).toBeGreaterThan(1);
  });

  it('stays in [-1, 1] and fractal variants stay in range', () => {
    const n = createSimplex2D(createRng(99));
    for (let i = 0; i < 20_000; i++) {
      const x = (i % 200) * 0.173;
      const y = Math.floor(i / 200) * 0.291;
      const v = n(x, y);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      expect(Math.abs(fbm(n, x, y, 4))).toBeLessThanOrEqual(1);
      const r = ridged(n, x, y, 3);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});
