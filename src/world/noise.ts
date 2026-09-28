import type { Rng } from './rng';

/*
 * 2D simplex noise, our own implementation of the public-domain algorithm described by
 * Stefan Gustavson ("Simplex noise demystified", 2005). The permutation table comes from
 * the seeded PRNG. This is intentionally NOT Unity's Mathf.PerlinNoise (docs/DECISION.md).
 */

export type Noise2D = (x: number, y: number) => number;

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
// 8 gradient directions, stored flat as (gx, gy) pairs.
const GRAD = new Float64Array([1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1]);

/** Returns a simplex noise function with output in roughly [-1, 1]. */
export function createSimplex2D(rng: Rng): Noise2D {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = rng.int(0, i + 1);
    const tmp = p[i] ?? 0;
    p[i] = p[j] ?? 0;
    p[j] = tmp;
  }
  // Doubled table avoids index wrapping; gradient index precomputed (& 7) per entry.
  const perm = new Uint8Array(512);
  const gi = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    const v = p[i & 255] ?? 0;
    perm[i] = v;
    gi[i] = (v & 7) << 1;
  }

  const corner = (g: number, x: number, y: number): number => {
    let t = 0.5 - x * x - y * y;
    if (t <= 0) return 0;
    t *= t;
    return t * t * ((GRAD[g] ?? 0) * x + (GRAD[g + 1] ?? 0) * y);
  };

  return (xin, yin) => {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = 1 - i1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const g0 = gi[ii + (perm[jj] ?? 0)] ?? 0;
    const g1 = gi[ii + i1 + (perm[jj + j1] ?? 0)] ?? 0;
    const g2 = gi[ii + 1 + (perm[jj + 1] ?? 0)] ?? 0;
    return 70 * (corner(g0, x0, y0) + corner(g1, x1, y1) + corner(g2, x2, y2));
  };
}

/** Fractal sum of `octaves` layers, normalized back to roughly [-1, 1]. */
export function fbm(
  noise: Noise2D,
  x: number,
  y: number,
  octaves: number,
  lacunarity = 2,
  gain = 0.5,
): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Ridged fractal in [0, 1]: sharp crests where the underlying noise crosses zero. */
export function ridged(noise: Noise2D, x: number, y: number, octaves: number): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const r = 1 - Math.abs(noise(x * freq, y * freq));
    sum += amp * r * r;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
