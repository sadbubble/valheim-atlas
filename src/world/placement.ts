import type { WorldGenData } from '../data/load';
import type { BiomeId, LocationType } from '../data/schema';
import { cellCenterX, cellCenterZ, cellIndexAt, type GridSpec } from './grid';
import { createRng, hashSeed, type Rng } from './rng';
import { TUNING } from './tuning';
import type { PlacedLocation, PlacementReport } from './types';

export interface PlacementInput {
  seed: string;
  data: WorldGenData;
  grid: GridSpec;
  height: Float32Array;
  biomes: Uint8Array;
  biomeIds: readonly BiomeId[];
}

export interface PlacementResult {
  locations: PlacedLocation[];
  report: PlacementReport[];
}

/**
 * Places locations using the sourced constraints (biome, quantity, prioritized, unique,
 * distance and altitude limits) and one location per zone (S-WG-05, S-WG-12). Candidate
 * spots come from our own PRNG, so positions are approximate (docs/DECISION.md).
 */
export function placeLocations(input: PlacementInput): PlacementResult {
  const { seed, data, grid, height, biomes, biomeIds } = input;
  const w = data.world;
  const P = TUNING.placement;
  const occupiedZones = new Set<string>();
  const locations: PlacedLocation[] = [];
  const report: PlacementReport[] = [];
  const cellsByBiome = indexCellsByBiome(biomes, biomeIds);

  // S-WG-12: prioritized locations are placed first; otherwise data order.
  const ordered = [
    ...data.locations.filter((l) => l.prioritized === true),
    ...data.locations.filter((l) => l.prioritized !== true),
  ];

  const tryAt = (type: LocationType, rawX: number, rawZ: number): PlacedLocation | null => {
    // Round first so every check (zone, cell, distance) sees the stored coordinates.
    const x = Math.round(rawX * 10) / 10;
    const z = Math.round(rawZ * 10) / 10;
    const d = Math.sqrt(x * x + z * z);
    if (d > w.worldRadiusM) return null;
    if (type.minDistM != null && d < type.minDistM) return null;
    if (type.maxDistM != null && d > type.maxDistM) return null;
    const zoneKey = `${Math.floor(x / w.zoneSizeM)},${Math.floor(z / w.zoneSizeM)}`;
    if (occupiedZones.has(zoneKey)) return null;
    const cell = cellIndexAt(grid, x, z);
    const biomeId = biomeIds[biomes[cell] ?? 0];
    if (biomeId === undefined || !type.biomeIds.includes(biomeId)) return null;
    const altitudeM = (height[cell] ?? 0) - w.seaLevelM;
    const minAlt =
      type.minAltM ?? (type.biomeIds.includes('ocean') ? -Infinity : P.defaultMinAltitudeM);
    if (altitudeM < minAlt) return null;
    if (type.maxAltM != null && altitudeM > type.maxAltM) return null;
    occupiedZones.add(zoneKey);
    return {
      id: '',
      type: type.id,
      x,
      z,
      biomeId,
    };
  };

  for (const type of ordered) {
    if (type.quantity === null) {
      report.push({
        type: type.id,
        wanted: null,
        placed: 0,
        note: 'Quantity unknown or conflicting in sources; not placed.',
      });
      continue;
    }
    const rng = createRng(hashSeed(`${seed}\u0000location\u0000${type.id}`));
    const wanted = type.unique === true ? 1 : type.quantity;
    const placed: PlacedLocation[] = [];

    if (type.placement === 'center-outward') {
      for (let r = 0; r <= w.worldRadiusM && placed.length < wanted; r += P.centerSearchStepM) {
        const [ux, uz] = randomDirection(rng);
        const hit = tryAt(type, ux * r, uz * r);
        if (hit) placed.push(hit);
      }
    } else {
      // Candidates are drawn from cells of the allowed biomes (uniform over their area),
      // then filtered by the sourced constraints in tryAt.
      const pools = type.biomeIds.flatMap((b) => {
        const cells = cellsByBiome.get(b);
        return cells && cells.length > 0 ? [cells] : [];
      });
      const total = pools.reduce((sum, c) => sum + c.length, 0);
      const budget =
        type.quantity *
        P.triesPerInstance *
        (type.prioritized === true ? P.prioritizedTriesMultiplier : 1);
      for (let t = 0; t < budget && placed.length < wanted && total > 0; t++) {
        let k = rng.int(0, total);
        let pool = pools[0];
        for (const c of pools) {
          if (k < c.length) {
            pool = c;
            break;
          }
          k -= c.length;
        }
        const cell = pool?.[k] ?? 0;
        const i = cell % grid.resolution;
        const j = (cell - i) / grid.resolution;
        const x = cellCenterX(grid, i) + (rng.next() - 0.5) * grid.cellSizeM;
        const z = cellCenterZ(grid, j) + (rng.next() - 0.5) * grid.cellSizeM;
        const hit = tryAt(type, x, z);
        if (hit) placed.push(hit);
      }
    }

    placed.forEach((p, k) => {
      p.id = `${type.id}-${k + 1}`;
    });
    locations.push(...placed);
    const entry: PlacementReport = { type: type.id, wanted, placed: placed.length };
    if (placed.length < wanted) entry.note = 'Not enough suitable spots in this world.';
    report.push(entry);
  }
  return { locations, report };
}

function randomDirection(rng: Rng): [number, number] {
  for (;;) {
    const x = rng.next() * 2 - 1;
    const z = rng.next() * 2 - 1;
    const len2 = x * x + z * z;
    if (len2 > 1e-6 && len2 <= 1) {
      const len = Math.sqrt(len2);
      return [x / len, z / len];
    }
  }
}

/** Cell indices grouped by biome, so rare biomes can be sampled efficiently. */
function indexCellsByBiome(
  biomes: Uint8Array,
  biomeIds: readonly BiomeId[],
): Map<BiomeId, Uint32Array> {
  const counts = new Uint32Array(biomeIds.length);
  for (const b of biomes) counts[b] = (counts[b] ?? 0) + 1;
  const lists = biomeIds.map((_, k) => new Uint32Array(counts[k] ?? 0));
  const fill = new Uint32Array(biomeIds.length);
  for (let c = 0; c < biomes.length; c++) {
    const b = biomes[c] ?? 0;
    const list = lists[b];
    const at = fill[b] ?? 0;
    if (list) list[at] = c;
    fill[b] = at + 1;
  }
  return new Map(biomeIds.map((id, k) => [id, lists[k] ?? new Uint32Array(0)]));
}
