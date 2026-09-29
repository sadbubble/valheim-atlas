import { describe, expect, it } from 'vitest';
import { BIOME_IDS, type BiomeId } from '../data/schema';
import { layoutChunks } from './chunks';
import { pickSurface, sampleHeight } from './pick';
import { PROP_KINDS, PROP_RULES } from './props-config';
import { PROP_STRIDE, placeChunkProps, type PropSource } from './props';
import { boxBlur, buildSurfaceTextures } from './surface-textures';

/** Clearly fake test world: flat land at 100 m, one biome per quadrant. */
function fakeWorld(n = 64): PropSource {
  const height = new Float32Array(n * n).fill(100);
  const biomes = new Uint8Array(n * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) biomes[j * n + i] = (i < n / 2 ? 0 : 1) + (j < n / 2 ? 0 : 2);
  return {
    seed: 'test',
    resolution: n,
    extentM: 640,
    cellSizeM: 20,
    height,
    biomes,
    biomeIds: [...BIOME_IDS],
  };
}

describe('boxBlur', () => {
  it('preserves the mean and softens a step edge', () => {
    const n = 16;
    const d = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) d[j * n + i] = i < 8 ? 0 : 1;
    const before = d.reduce((a, b) => a + b, 0);
    boxBlur(d, n, 1, 2, 2);
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(before, 3);
    expect(d[7]).toBeGreaterThan(0);
    expect(d[8]).toBeLessThan(1);
  });
});

describe('buildSurfaceTextures', () => {
  it('encodes colours, weights and half-float heights', () => {
    const w = fakeWorld(8);
    const colors = Object.fromEntries(BIOME_IDS.map((id) => [id, '#102030'])) as Record<
      BiomeId,
      string
    >;
    const t = buildSurfaceTextures(w, colors, 0);
    expect([...t.color.slice(0, 4)]).toEqual([0x10, 0x20, 0x30, 255]);
    expect(t.height).toHaveLength(64);
    expect(t.weights).toHaveLength(64 * 4);
  });
});

describe('placeChunkProps', () => {
  const w = fakeWorld();
  const [chunk] = layoutChunks(w, 0, 1e9, 1);
  if (!chunk) throw new Error('chunk expected');
  const opts = { seaLevelM: 30, minAltitudeM: 1, maxTreeSlope: 0.9 };

  it('is deterministic and only uses kinds allowed in each biome', () => {
    const a = placeChunkProps(w, chunk, opts);
    const b = placeChunkProps(w, chunk, opts);
    expect([...a.entries()].map(([k, v]) => [k, [...v]])).toEqual(
      [...b.entries()].map(([k, v]) => [k, [...v]]),
    );
    let total = 0;
    for (const kind of PROP_KINDS) {
      const data = a.get(kind) ?? new Float32Array();
      expect(data.length % PROP_STRIDE).toBe(0);
      for (let o = 0; o < data.length; o += PROP_STRIDE) {
        total++;
        const x = data[o] ?? 0;
        const z = data[o + 2] ?? 0;
        const i = Math.floor((x + w.extentM) / w.cellSizeM);
        const j = Math.floor((w.extentM - z) / w.cellSizeM);
        const biome = w.biomeIds[w.biomes[j * w.resolution + i] ?? 0] ?? 'ocean';
        expect(PROP_RULES[biome].some((r) => r.kind === kind)).toBe(true);
        expect(data[o + 1]).toBeCloseTo(70);
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  it('places nothing under water', () => {
    const wet = { ...w, height: new Float32Array(w.height.length).fill(10) };
    const out = placeChunkProps(wet, chunk, opts);
    expect([...out.values()].every((d) => d.length === 0)).toBe(true);
  });
});

describe('pickSurface', () => {
  const w = fakeWorld();
  it('samples heights bilinearly', () => {
    expect(sampleHeight(w, 0, 0)).toBeCloseTo(100);
  });

  it('hits the exaggerated ground below a downward ray', () => {
    // Ground is 70 m above sea; exaggeration 2 puts the surface at y = 140.
    const hit = pickSurface(w, 30, 2, [100, 1000, -50], [0, -1, 0], 5000, 10);
    expect(hit?.x).toBeCloseTo(100);
    expect(hit?.z).toBeCloseTo(-50);
    expect(pickSurface(w, 30, 2, [0, 1000, 0], [0, 1, 0], 5000)).toBeNull();
  });
});
