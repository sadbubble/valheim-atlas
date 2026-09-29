import { describe, expect, it } from 'vitest';
import { loadWorldGenDataFromDisk } from '../test/load-data-from-disk';
import { generateWorldSync } from './generate';
import { GENERATOR_ID, IS_APPROXIMATION, MAX_RESOLUTION, MIN_RESOLUTION } from './generator-info';
import { GeneratedWorldSchema, type GeneratedWorld } from './types';

const data = loadWorldGenDataFromDisk();

function sameWorld(a: GeneratedWorld, b: GeneratedWorld): boolean {
  const bytes = (arr: Float32Array | Uint8Array) =>
    new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  const eq = (x: Uint8Array, y: Uint8Array) =>
    x.length === y.length && x.every((v, i) => v === y[i]);
  return (
    eq(bytes(a.height), bytes(b.height)) &&
    eq(bytes(a.biomes), bytes(b.biomes)) &&
    JSON.stringify(a.locations) === JSON.stringify(b.locations) &&
    JSON.stringify(a.placementReport) === JSON.stringify(b.placementReport)
  );
}

describe('generateWorldSync', () => {
  it('is deterministic: the same seed gives byte-identical output', () => {
    const a = generateWorldSync('HelloWorld', 256, data);
    const b = generateWorldSync('HelloWorld', 256, data);
    expect(sameWorld(a, b)).toBe(true);
  });

  it('different seeds give different worlds', () => {
    const a = generateWorldSync('HelloWorld', 128, data);
    const b = generateWorldSync('HelloWorle', 128, data);
    expect(sameWorld(a, b)).toBe(false);
  });

  it('returns a well-formed, labelled approximation', () => {
    const w = generateWorldSync('shape', 96, data);
    expect(GeneratedWorldSchema.safeParse(w).success).toBe(true);
    expect(w.height).toHaveLength(96 * 96);
    expect(w.biomes).toHaveLength(96 * 96);
    expect(w.generator).toBe(GENERATOR_ID);
    expect(w.isApproximation).toBe(IS_APPROXIMATION);
    expect(w.extentM).toBe(data.world.waterEdgeM);
    expect(w.cellSizeM * w.resolution).toBeCloseTo(2 * data.world.waterEdgeM);
    expect(w.height.every(Number.isFinite)).toBe(true);
    expect(Math.max(...w.biomes)).toBeLessThan(w.biomeIds.length);
  });

  it('supports non-default resolutions and rejects out-of-range ones', () => {
    expect(generateWorldSync('r', MIN_RESOLUTION, data).resolution).toBe(MIN_RESOLUTION);
    expect(generateWorldSync('r', 300, data).height).toHaveLength(300 * 300);
    expect(() => generateWorldSync('r', MIN_RESOLUTION - 1, data)).toThrow(RangeError);
    expect(() => generateWorldSync('r', MAX_RESOLUTION + 1, data)).toThrow(RangeError);
    expect(() => generateWorldSync('r', 100.5, data)).toThrow(RangeError);
  });

  it('reports monotonic progress ending at 1, terrain stage before locations', () => {
    const seen: number[] = [];
    const stages: string[] = [];
    generateWorldSync('progress', 128, data, (p, stage) => {
      seen.push(p);
      if (stages.at(-1) !== stage) stages.push(stage);
    });
    expect(stages).toEqual(['terrain', 'locations']);
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(1);
    expect(seen.every((p, i) => i === 0 || p >= (seen[i - 1] ?? 0))).toBe(true);
    expect(seen.length).toBeGreaterThan(10);
  });
});
