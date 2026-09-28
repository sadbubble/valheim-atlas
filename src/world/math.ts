/*
 * Small numeric helpers. Everything here uses only + - * / sqrt floor, which IEEE-754
 * defines exactly, so results are bit-identical across JS engines. Transcendentals such
 * as Math.sin/atan2 are not guaranteed to be, so the generator avoids them.
 */

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Angular wobble A = amplitude · sin(lobes · atan2(x, z)) (S-BIO-02), computed without
 * trig: with the unit vector w = (z + i·x)/r, sin(n·θ) = Im(wⁿ). Returns 0 at the origin.
 */
export function angularWobble(x: number, z: number, amplitude: number, lobes: number): number {
  const r = Math.sqrt(x * x + z * z);
  if (r === 0 || amplitude === 0) return 0;
  let baseRe = z / r;
  let baseIm = x / r;
  let accRe = 1;
  let accIm = 0;
  // Exponentiation by squaring on the complex unit vector.
  for (let n = lobes; n > 0; n >>= 1) {
    if (n & 1) {
      const re = accRe * baseRe - accIm * baseIm;
      accIm = accRe * baseIm + accIm * baseRe;
      accRe = re;
    }
    const re = baseRe * baseRe - baseIm * baseIm;
    baseIm = 2 * baseRe * baseIm;
    baseRe = re;
  }
  return amplitude * accIm;
}
