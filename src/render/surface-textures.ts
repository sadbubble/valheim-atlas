import { DataUtils } from 'three';
import type { BiomeId } from '../data/schema';

export interface SurfaceSource {
  resolution: number;
  height: Float32Array;
  biomes: Uint8Array;
  biomeIds: readonly BiomeId[];
}

export interface SurfaceTextureData {
  /** RGBA8: blurred biome ground colour (soft biome borders). */
  color: Uint8Array;
  /** RGBA8: blurred biome weights: R mountains, G ashlands, B mistlands, A deep north. */
  weights: Uint8Array;
  /** R16F: ground height in metres (absolute, not relative to sea). */
  height: Uint16Array;
}

const WEIGHT_BIOMES: readonly BiomeId[] = ['mountains', 'ashlands', 'mistlands', 'deep-north'];

function hexToRgb(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/**
 * In-place separable box blur of `channels` interleaved planes, repeated `passes` times.
 * Edges clamp. It runs on the main thread when a world arrives, so the inner loop is plain
 * index arithmetic (no per-sample closure): a 1024² grid takes a fraction of the time.
 */
export function boxBlur(
  data: Float32Array,
  n: number,
  channels: number,
  radius: number,
  passes: number,
): void {
  if (radius <= 0) return;
  const tmp = new Float32Array(data.length);
  const width = 2 * radius + 1;
  const last = n - 1;
  const clamp = (k: number) => (k < 0 ? 0 : k > last ? last : k);
  const rowLen = n * channels;
  // Along a row: each channel slides separately over cells `channels` apart.
  const horizontal = (src: Float32Array, dst: Float32Array) => {
    for (let row = 0; row < n; row++) {
      for (let ch = 0; ch < channels; ch++) {
        const base = row * rowLen + ch;
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += src[base + clamp(k) * channels] ?? 0;
        for (let k = 0; k < n; k++) {
          dst[base + k * channels] = sum / width;
          sum +=
            (src[base + clamp(k + radius + 1) * channels] ?? 0) -
            (src[base + clamp(k - radius) * channels] ?? 0);
        }
      }
    }
  };
  // Down the columns, walked row by row with one running sum per column and channel so
  // memory is read in order (same additions, in the same order, as a per-column loop).
  const sums = new Float64Array(rowLen);
  const vertical = (src: Float32Array, dst: Float32Array) => {
    sums.fill(0);
    for (let k = -radius; k <= radius; k++) {
      const off = clamp(k) * rowLen;
      for (let j = 0; j < rowLen; j++) sums[j] = (sums[j] ?? 0) + (src[off + j] ?? 0);
    }
    for (let k = 0; k < n; k++) {
      const out = k * rowLen;
      const add = clamp(k + radius + 1) * rowLen;
      const sub = clamp(k - radius) * rowLen;
      for (let j = 0; j < rowLen; j++) {
        const sum = sums[j] ?? 0;
        dst[out + j] = sum / width;
        sums[j] = sum + ((src[add + j] ?? 0) - (src[sub + j] ?? 0));
      }
    }
  };
  for (let p = 0; p < passes; p++) {
    horizontal(data, tmp);
    vertical(tmp, data);
  }
}

/**
 * Builds the textures the terrain and water shaders sample. Rows follow the world grid
 * (row 0 = north), so a DataTexture maps v = (extent - z) / (2 · extent).
 */
export function buildSurfaceTextures(
  world: SurfaceSource,
  groundColors: Readonly<Record<BiomeId, string>>,
  blurRadiusCells: number,
): SurfaceTextureData {
  const n = world.resolution;
  const count = n * n;
  const colorPalette = world.biomeIds.map((id) => hexToRgb(groundColors[id]));
  const weightPalette = world.biomeIds.map((id) => WEIGHT_BIOMES.map((w) => (w === id ? 1 : 0)));

  const col = new Float32Array(count * 3);
  const wts = new Float32Array(count * 4);
  for (let k = 0; k < count; k++) {
    const b = world.biomes[k] ?? 0;
    const rgb = colorPalette[b] ?? [255, 0, 255];
    col[k * 3] = rgb[0];
    col[k * 3 + 1] = rgb[1];
    col[k * 3 + 2] = rgb[2];
    const w = weightPalette[b] ?? [0, 0, 0, 0];
    for (let c = 0; c < 4; c++) wts[k * 4 + c] = w[c] ?? 0;
  }
  boxBlur(col, n, 3, blurRadiusCells, 2);
  boxBlur(wts, n, 4, blurRadiusCells, 2);

  const color = new Uint8Array(count * 4);
  const weights = new Uint8Array(count * 4);
  const height = new Uint16Array(count);
  for (let k = 0; k < count; k++) {
    color[k * 4] = col[k * 3] ?? 0;
    color[k * 4 + 1] = col[k * 3 + 1] ?? 0;
    color[k * 4 + 2] = col[k * 3 + 2] ?? 0;
    color[k * 4 + 3] = 255;
    for (let c = 0; c < 4; c++) weights[k * 4 + c] = Math.round((wts[k * 4 + c] ?? 0) * 255);
    height[k] = DataUtils.toHalfFloat(world.height[k] ?? 0);
  }
  return { color, weights, height };
}
