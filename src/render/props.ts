import type { BiomeId } from '../data/schema';
import { createRng, hashSeed } from '../world/rng';
import type { ChunkInfo } from './chunks';
import { PROP_KINDS, PROP_RULES, type PropKind } from './props-config';

/** Floats per instance: x, y (above sea, m), z, rotationY, scale, r, g, b. */
export const PROP_STRIDE = 8;

export interface PropSource {
  seed: string;
  resolution: number;
  extentM: number;
  cellSizeM: number;
  height: Float32Array;
  biomes: Uint8Array;
  biomeIds: readonly BiomeId[];
}

export interface PropPlacementOptions {
  seaLevelM: number;
  minAltitudeM: number;
  maxTreeSlope: number;
}

const tintCache = new Map<string, [number, number, number]>();
function tintRgb(hex: string): [number, number, number] {
  let rgb = tintCache.get(hex);
  if (!rgb) {
    const v = Number.parseInt(hex.slice(1), 16);
    rgb = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
    tintCache.set(hex, rgb);
  }
  return rgb;
}

/**
 * Deterministically scatters props over one chunk's cells (at most one prop per cell).
 * Returns packed instance data per prop kind.
 */
export function placeChunkProps(
  w: PropSource,
  chunk: ChunkInfo,
  opts: PropPlacementOptions,
): Map<PropKind, Float32Array> {
  const n = w.resolution;
  const rng = createRng(hashSeed(`${w.seed}\u0000props\u0000${chunk.index}`));
  const out = new Map<PropKind, number[]>(PROP_KINDS.map((k) => [k, []]));
  // Half-open ranges so a shared border cell belongs to exactly one chunk.
  for (let j = chunk.j0; j < chunk.j1; j++) {
    for (let i = chunk.i0; i < chunk.i1; i++) {
      const k = j * n + i;
      const roll = rng.next();
      const jitterX = rng.next() - 0.5;
      const jitterZ = rng.next() - 0.5;
      const rot = rng.next() * Math.PI * 2;
      const sizeRoll = rng.next();
      const biome = w.biomeIds[w.biomes[k] ?? 0] ?? 'ocean';
      const rules = PROP_RULES[biome];
      if (rules.length === 0) continue;
      const h = w.height[k] ?? 0;
      if (h - opts.seaLevelM < opts.minAltitudeM) continue;
      const east = w.height[k + 1] ?? h;
      const south = w.height[k + n] ?? h;
      const slope = Math.max(Math.abs(east - h), Math.abs(south - h)) / w.cellSizeM;
      let acc = 0;
      for (const rule of rules) {
        acc += rule.density;
        if (roll >= acc) continue;
        if (rule.needsFlat && slope > opts.maxTreeSlope) break;
        const x = -w.extentM + (i + 0.5 + jitterX) * w.cellSizeM;
        const z = w.extentM - (j + 0.5 + jitterZ) * w.cellSizeM;
        const scale = rule.scale[0] + (rule.scale[1] - rule.scale[0]) * sizeRoll;
        const [r, g, b] = tintRgb(rule.tint);
        out.get(rule.kind)?.push(x, h - opts.seaLevelM, z, rot, scale, r, g, b);
        break;
      }
    }
  }
  return new Map([...out].map(([kind, arr]) => [kind, new Float32Array(arr)]));
}
