export interface HeightField {
  resolution: number;
  extentM: number;
  cellSizeM: number;
  height: Float32Array;
}

/** Bilinear ground height (metres, absolute) at world (x, z); clamps at the grid edge. */
export function sampleHeight(f: HeightField, x: number, z: number): number {
  const n = f.resolution;
  const fx = Math.min(n - 1, Math.max(0, (x + f.extentM) / f.cellSizeM - 0.5));
  const fz = Math.min(n - 1, Math.max(0, (f.extentM - z) / f.cellSizeM - 0.5));
  const i = Math.min(n - 2, Math.floor(fx));
  const j = Math.min(n - 2, Math.floor(fz));
  const tx = fx - i;
  const tz = fz - j;
  const h = (a: number, b: number) => f.height[b * n + a] ?? 0;
  const top = h(i, j) + (h(i + 1, j) - h(i, j)) * tx;
  const bottom = h(i, j + 1) + (h(i + 1, j + 1) - h(i, j + 1)) * tx;
  return top + (bottom - top) * tz;
}

/**
 * Finds where a ray first hits the exaggerated terrain surface (or the sea surface at
 * y = 0, whichever comes first). Scene y = max(ground - sea, 0 for water) with ground
 * scaled by `exaggeration`. Returns world x/z, or null if the ray misses.
 */
export function pickSurface(
  f: HeightField,
  seaLevelM: number,
  exaggeration: number,
  origin: readonly [number, number, number],
  dir: readonly [number, number, number],
  maxDistM: number,
  stepM = 20,
): { x: number; z: number } | null {
  const surfaceY = (x: number, z: number) =>
    Math.max(0, (sampleHeight(f, x, z) - seaLevelM) * exaggeration);
  const [ox, oy, oz] = origin;
  const [dx, dy, dz] = dir;
  // Start where the ray could first reach the highest possible terrain.
  let prevT = 0;
  for (let t = stepM; t <= maxDistM; t += stepM) {
    const x = ox + dx * t;
    const z = oz + dz * t;
    if (oy + dy * t <= surfaceY(x, z)) {
      // Refine between prevT and t by bisection.
      let lo = prevT;
      let hi = t;
      for (let k = 0; k < 20; k++) {
        const mid = (lo + hi) / 2;
        const mx = ox + dx * mid;
        const mz = oz + dz * mid;
        if (oy + dy * mid <= surfaceY(mx, mz)) hi = mid;
        else lo = mid;
      }
      return { x: ox + dx * hi, z: oz + dz * hi };
    }
    prevT = t;
  }
  return null;
}
