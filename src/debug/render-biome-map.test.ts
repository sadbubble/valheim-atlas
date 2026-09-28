import { describe, expect, it } from 'vitest';
import { BIOME_IDS, type BiomeId } from '../data/schema';
import type { GeneratedWorld } from '../world/types';
import { hexToRgb, renderBiomeMap } from './render-biome-map';

const colors = Object.fromEntries(
  BIOME_IDS.map((id, i) => [id, `#${(i * 20 + 10).toString(16).padStart(2, '0')}8040`]),
) as Record<BiomeId, string>;

const fakeWorld = (height: number[], biomes: number[]): GeneratedWorld => ({
  seed: 'test',
  generator: 'approx-v1',
  isApproximation: true,
  resolution: 2,
  extentM: 100,
  cellSizeM: 100,
  height: new Float32Array(height),
  biomes: new Uint8Array(biomes),
  biomeIds: [...BIOME_IDS],
  locations: [],
  placementReport: [],
});

describe('renderBiomeMap', () => {
  it('paints each cell with its biome colour', () => {
    const w = fakeWorld([50, 50, 50, 50], [0, 1, 2, 3]);
    const px = renderBiomeMap(w, { colors, seaLevelM: 10, shading: false, water: false });
    for (let k = 0; k < 4; k++) {
      const [r, g, b] = hexToRgb(colors[BIOME_IDS[k] ?? 'ocean']);
      expect([...px.slice(k * 4, k * 4 + 4)]).toEqual([r, g, b, 255]);
    }
  });

  it('tints cells below sea level when water is on', () => {
    const w = fakeWorld([0, 50, 50, 50], [0, 0, 0, 0]);
    const dry = renderBiomeMap(w, { colors, seaLevelM: 10, shading: false, water: false });
    const wet = renderBiomeMap(w, { colors, seaLevelM: 10, shading: false, water: true });
    expect([...wet.slice(0, 3)]).not.toEqual([...dry.slice(0, 3)]);
    expect([...wet.slice(4, 7)]).toEqual([...dry.slice(4, 7)]);
  });
});
