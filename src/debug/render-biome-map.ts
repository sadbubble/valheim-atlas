import type { BiomeId } from '../data/schema';
import type { GeneratedWorld } from '../world/types';

export interface BiomeMapStyle {
  /** Colour per biome, "#rrggbb" (our palette from biomes.json). */
  colors: Readonly<Record<BiomeId, string>>;
  seaLevelM: number;
  /** Hillshade from the height field (light from the north-west). */
  shading: boolean;
  /** Tint cells below sea level. */
  water: boolean;
}

/** Our own water tint for the debug map (not a game colour). */
const WATER_RGB: readonly [number, number, number] = [0x1d, 0x4a, 0x70];

export function hexToRgb(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/**
 * Renders the biome grid into an RGBA buffer (resolution² × 4 bytes), north up, suitable
 * for `new ImageData(buffer, resolution)`.
 */
export function renderBiomeMap(
  world: GeneratedWorld,
  style: BiomeMapStyle,
  out: Uint8ClampedArray = new Uint8ClampedArray(world.resolution * world.resolution * 4),
): Uint8ClampedArray {
  const n = world.resolution;
  const { height, biomes } = world;
  const palette = world.biomeIds.map((id) => hexToRgb(style.colors[id]));
  const slopeGain = 1.2 / (2 * world.cellSizeM);

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const [r0, g0, b0] = palette[biomes[k] ?? 0] ?? [255, 0, 255];
      let r = r0;
      let g = g0;
      let b = b0;
      const h = height[k] ?? 0;
      if (style.shading) {
        const west = height[j * n + Math.max(0, i - 1)] ?? h;
        const east = height[j * n + Math.min(n - 1, i + 1)] ?? h;
        const north = height[Math.max(0, j - 1) * n + i] ?? h;
        const south = height[Math.min(n - 1, j + 1) * n + i] ?? h;
        const lit = 1 + (east - west - (south - north)) * -slopeGain;
        const s = lit < 0.55 ? 0.55 : lit > 1.4 ? 1.4 : lit;
        r *= s;
        g *= s;
        b *= s;
      }
      if (style.water && h < style.seaLevelM) {
        const depth = style.seaLevelM - h;
        const t = Math.min(0.85, 0.45 + depth / 80);
        r = r + (WATER_RGB[0] - r) * t;
        g = g + (WATER_RGB[1] - g) * t;
        b = b + (WATER_RGB[2] - b) * t;
      }
      const o = k * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = 255;
    }
  }
  return out;
}
