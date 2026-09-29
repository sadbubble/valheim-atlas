import type { BiomeId } from '../data/schema';

export interface BiomeAnchor {
  biome: BiomeId;
  /** Game coordinates of a representative point inside the region, metres. */
  x: number;
  z: number;
  /** Region area in square metres. */
  areaM2: number;
}

export interface AnchorSource {
  resolution: number;
  extentM: number;
  cellSizeM: number;
  biomes: Uint8Array;
  biomeIds: readonly BiomeId[];
}

/**
 * Finds the largest connected regions of each biome on a downsampled grid and returns one
 * anchor per region (the region cell closest to its centroid): used for biome labels,
 * creature/resource badges and fly-to targets.
 */
export function computeBiomeAnchors(
  w: AnchorSource,
  opts: { gridSize?: number; perBiome?: number; minAreaM2?: number; maxRadiusM?: number } = {},
): BiomeAnchor[] {
  const g = Math.min(opts.gridSize ?? 128, w.resolution);
  const perBiome = opts.perBiome ?? 3;
  const minArea = opts.minAreaM2 ?? 4e5;
  const step = w.resolution / g;
  const cellM = w.cellSizeM * step;
  const maxR = opts.maxRadiusM ?? Infinity;
  const labels = new Int16Array(g * g).fill(-1);
  const cellBiome = new Int16Array(g * g);
  for (let j = 0; j < g; j++) {
    for (let i = 0; i < g; i++) {
      const src = Math.floor((j + 0.5) * step) * w.resolution + Math.floor((i + 0.5) * step);
      cellBiome[j * g + i] = w.biomes[src] ?? 0;
    }
  }
  const x = (i: number) => -w.extentM + (i + 0.5) * cellM;
  const z = (j: number) => w.extentM - (j + 0.5) * cellM;

  const regions: { biome: number; cells: number[] }[] = [];
  const stack: number[] = [];
  for (let start = 0; start < g * g; start++) {
    if (labels[start] !== -1) continue;
    const b = cellBiome[start] ?? 0;
    const cells: number[] = [];
    labels[start] = regions.length;
    stack.push(start);
    while (stack.length > 0) {
      const c = stack.pop() ?? 0;
      cells.push(c);
      const ci = c % g;
      const cj = (c - ci) / g;
      const neighbours = [
        ci > 0 ? c - 1 : -1,
        ci < g - 1 ? c + 1 : -1,
        cj > 0 ? c - g : -1,
        cj < g - 1 ? c + g : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && labels[n] === -1 && cellBiome[n] === b) {
          labels[n] = regions.length;
          stack.push(n);
        }
      }
    }
    regions.push({ biome: b, cells });
  }

  const out: BiomeAnchor[] = [];
  const byBiome = new Map<number, { biome: number; cells: number[] }[]>();
  for (const r of regions) byBiome.set(r.biome, [...(byBiome.get(r.biome) ?? []), r]);
  for (const [b, list] of byBiome) {
    const biome = w.biomeIds[b];
    if (!biome) continue;
    const sorted = list
      .map((r) => {
        const inside = r.cells.filter((c) => {
          const ci = c % g;
          const cj = (c - ci) / g;
          return Math.hypot(x(ci), z(cj)) <= maxR;
        });
        return { cells: inside, area: inside.length * cellM * cellM };
      })
      .filter((r) => r.area >= minArea)
      .sort((a, b2) => b2.area - a.area)
      .slice(0, perBiome);
    for (const r of sorted) {
      let cx = 0;
      let cz = 0;
      for (const c of r.cells) {
        cx += x(c % g);
        cz += z(Math.floor(c / g));
      }
      cx /= r.cells.length;
      cz /= r.cells.length;
      let best = r.cells[0] ?? 0;
      let bestD = Infinity;
      for (const c of r.cells) {
        const d = (x(c % g) - cx) ** 2 + (z(Math.floor(c / g)) - cz) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      out.push({ biome, x: x(best % g), z: z(Math.floor(best / g)), areaM2: r.area });
    }
  }
  return out;
}
