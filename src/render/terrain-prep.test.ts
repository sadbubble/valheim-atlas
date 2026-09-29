import { DataUtils } from 'three';
import { describe, expect, it } from 'vitest';
import { BIOME_IDS } from '../data/schema';
import { layoutChunks } from './chunks';
import { handlePrepRequest, type PrepWorkerState } from './handle-prep-request';
import { toHalfFloat } from './half-float';
import { buildHighlightMask } from './highlight-mask';
import { GROUND_COLORS } from './palette';
import { RENDER } from './render-config';
import { buildSurfaceTextures } from './surface-textures';
import { buildChunkGeometry } from './terrain-geometry';
import { prepareTerrainSync, preparedTransferables, type TerrainPrepInput } from './terrain-prep';
import { PrepRequestSchema, PrepResponseSchema, type PrepResponse } from './terrain-prep-protocol';

/** Clearly fake test world: a hill in the middle, one biome per quadrant, sea around it. */
function fakeInput(n = 64): TerrainPrepInput {
  const height = new Float32Array(n * n);
  const biomes = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const dx = i - n / 2;
      const dz = j - n / 2;
      height[j * n + i] = 60 - Math.hypot(dx, dz) * 2;
      biomes[j * n + i] = (i < n / 2 ? 0 : 1) + (j < n / 2 ? 0 : 2);
    }
  }
  return {
    resolution: n,
    extentM: n * 10,
    cellSizeM: 20,
    height,
    biomes,
    biomeIds: [...BIOME_IDS],
    seaLevelM: 30,
    waterEdgeM: n * 10,
    worldRadiusM: n * 9,
  };
}

describe('toHalfFloat', () => {
  it("matches three's DataUtils.toHalfFloat bit for bit", () => {
    const values = [0, -0, 1, -1, 0.1, 30.25, 199.9, -412.5, 1e-7, 6e-5, 65504, 70000, -1e6];
    for (let k = 0; k < 2000; k++) values.push((k - 1000) * 0.731, (k * 7919) % 3001);
    for (const v of values) expect(toHalfFloat(v)).toBe(DataUtils.toHalfFloat(v));
  });
});

describe('prepareTerrainSync', () => {
  const input = fakeInput();
  const out = prepareTerrainSync(input);

  it('builds the same textures and chunks the main thread used to build', () => {
    const blur = Math.max(1, Math.round(RENDER.terrain.biomeBlurM / input.cellSizeM));
    const surface = buildSurfaceTextures(input, GROUND_COLORS, blur);
    expect(out.color).toEqual(surface.color);
    expect(out.weights).toEqual(surface.weights);
    expect(out.height).toEqual(surface.height);
    expect(out.chunks).toEqual(layoutChunks(input, input.seaLevelM, input.waterEdgeM));
  });

  it('prebuilds the coarsest mesh of every drawable chunk', () => {
    const drawable = out.chunks.filter((c) => c.drawable);
    expect(drawable.length).toBeGreaterThan(0);
    expect(out.coarse.map((m) => m.chunkIndex)).toEqual(drawable.map((c) => c.index));
    for (const m of out.coarse) {
      const chunk = out.chunks[m.chunkIndex];
      if (!chunk) throw new Error('chunk expected');
      expect(m.level).toBe(chunk.levels - 1);
      const ref = buildChunkGeometry(input, chunk, m.level, input.seaLevelM);
      expect(m.positions).toEqual(ref.positions);
      expect(m.indices).toEqual(ref.indices);
    }
    expect(out.maxHeightM).toBeCloseTo(Math.max(...out.chunks.map((c) => c.maxY)));
  });

  it('lists every buffer for transfer, each once', () => {
    const buffers = preparedTransferables(out);
    expect(buffers).toHaveLength(3 + 2 * out.coarse.length);
    expect(new Set(buffers).size).toBe(buffers.length);
  });
});

describe('buildHighlightMask', () => {
  const n = 64;

  it('is empty with nothing selected and full with everything selected', () => {
    const biomes = new Uint8Array(n * n).fill(2);
    expect(buildHighlightMask(biomes, n, [], 1, 3).every((v) => v === 0)).toBe(true);
    expect(buildHighlightMask(biomes, n, [5], 1, 3).every((v) => v === 0)).toBe(true);
    expect(buildHighlightMask(biomes, n, [2], 1, 3).every((v) => v === 255)).toBe(true);
  });

  it('keeps large regions: the 0.5 iso-line stays within a cell of the true border', () => {
    const biomes = new Uint8Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) biomes[j * n + i] = i < 20 ? 1 : 0;
    const mask = buildHighlightMask(biomes, n, [1], 1, 3);
    const row = 30 * n;
    expect(mask[row + 18]).toBeGreaterThan(127);
    expect(mask[row + 21]).toBeLessThan(128);
    const inside = [...mask].filter((v) => v >= 128).length;
    expect(Math.abs(inside - 20 * n)).toBeLessThanOrEqual(n);
  });

  it('turns grid stair steps into a smooth edge', () => {
    // A shallow staircase border (one step every 4 columns): the raw grid edge jumps by a
    // whole cell every 4 columns; the mask's sub-cell 0.5 crossing should be nearly straight.
    const biomes = new Uint8Array(n * n);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) biomes[j * n + i] = j < 10 + Math.floor(i / 4) ? 1 : 0;
    const crossing = (mask: ArrayLike<number>, i: number) => {
      for (let j = 0; j < n - 1; j++) {
        const a = mask[j * n + i] ?? 0;
        const b = mask[(j + 1) * n + i] ?? 0;
        if (a >= 127.5 && b < 127.5) return j + (a - 127.5) / (a - b);
      }
      return Number.NaN;
    };
    const bend = (mask: ArrayLike<number>) => {
      let worst = 0;
      for (let i = 8; i < n - 8; i++) {
        const d2 = crossing(mask, i + 1) - 2 * crossing(mask, i) + crossing(mask, i - 1);
        worst = Math.max(worst, Math.abs(d2));
      }
      return worst;
    };
    const raw = new Uint8Array(n * n).map((_, k) => ((biomes[k] ?? 0) === 1 ? 255 : 0));
    const smooth = buildHighlightMask(biomes, n, [1], 1, 3);
    expect(bend(raw)).toBeGreaterThanOrEqual(1);
    expect(bend(smooth)).toBeLessThan(0.35);
  });
});

describe('handlePrepRequest', () => {
  const input = fakeInput(32);

  it('prepares a world, then answers masks for it (schema-valid, buffers transferred)', () => {
    const state: PrepWorkerState = { world: null };
    const out: { res: PrepResponse; transfer: Transferable[] | undefined }[] = [];
    const emit = (res: PrepResponse, transfer?: Transferable[]) => out.push({ res, transfer });
    handlePrepRequest(
      PrepRequestSchema.parse({ type: 'prepare', requestId: 1, worldId: 7, input }),
      state,
      emit,
    );
    handlePrepRequest(
      PrepRequestSchema.parse({
        type: 'highlight-mask',
        requestId: 2,
        worldId: 7,
        biomeIndices: [1],
      }),
      state,
      emit,
    );
    handlePrepRequest(
      PrepRequestSchema.parse({
        type: 'highlight-mask',
        requestId: 3,
        worldId: 6,
        biomeIndices: [1],
      }),
      state,
      emit,
    );
    for (const { res } of out) expect(PrepResponseSchema.safeParse(res).success).toBe(true);
    const [prepared, mask, stale] = out;
    expect(prepared?.res.type).toBe('prepared');
    if (prepared?.res.type === 'prepared') {
      expect(prepared.transfer).toEqual(preparedTransferables(prepared.res.terrain));
    }
    expect(mask?.res.type).toBe('mask');
    if (mask?.res.type === 'mask') {
      expect(mask.res.mask).toHaveLength(32 * 32);
      expect(mask.transfer).toEqual([mask.res.mask.buffer]);
    }
    expect(stale?.res).toMatchObject({ type: 'error', requestId: 3 });
  });

  it('rejects malformed requests at the schema boundary', () => {
    expect(PrepRequestSchema.safeParse({ type: 'prepare', requestId: 1, worldId: 1 }).success).toBe(
      false,
    );
    expect(
      PrepRequestSchema.safeParse({
        type: 'prepare',
        requestId: 1,
        worldId: 1,
        input: { ...input, height: [1, 2, 3] },
      }).success,
    ).toBe(false);
  });
});
