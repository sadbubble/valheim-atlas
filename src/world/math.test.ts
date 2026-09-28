import { describe, expect, it } from 'vitest';
import { angularWobble, clamp, lerp, smoothstep } from './math';

describe('math helpers', () => {
  it('clamp / lerp / smoothstep', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(lerp(2, 4, 0.5)).toBe(3);
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });

  it('angularWobble matches amplitude·sin(lobes·atan2(x, z))', () => {
    for (const [x, z] of [
      [1, 0],
      [0, 1],
      [3, -7],
      [-1234.5, 987.25],
      [-0.001, -5],
    ] as const) {
      for (const lobes of [1, 2, 7, 20]) {
        const expected = 3 * Math.sin(lobes * Math.atan2(x, z));
        expect(angularWobble(x, z, 3, lobes)).toBeCloseTo(expected, 9);
      }
    }
    expect(angularWobble(0, 0, 3, 20)).toBe(0);
  });
});
