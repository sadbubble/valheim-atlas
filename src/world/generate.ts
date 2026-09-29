import type { WorldGenData } from '../data/load';
import { BIOME_IDS } from '../data/schema';
import { assertResolution, GENERATOR_ID, IS_APPROXIMATION } from './generator-info';
import { cellCenterX, cellCenterZ, makeGrid } from './grid';
import { placeLocations } from './placement';
import { hashSeed } from './rng';
import { createTerrain, type TerrainSample } from './terrain';
import type { GeneratedWorld } from './types';

/** What the generator is working on, for the loading screen. */
export type GenerationStage = 'terrain' | 'locations';
export type ProgressCallback = (progress: number, stage: GenerationStage) => void;

const TERRAIN_SHARE = 0.9;

/**
 * Generates a world synchronously. Pure and deterministic: the same seed, resolution and
 * data always give byte-identical output. Runs inside the world Web Worker in the app.
 */
export function generateWorldSync(
  seed: string,
  resolution: number,
  data: WorldGenData,
  onProgress?: ProgressCallback,
): GeneratedWorld {
  assertResolution(resolution);
  const biomeIds = [...BIOME_IDS];
  const biomeIndex = new Map(biomeIds.map((id, i) => [id, i]));
  const grid = makeGrid(resolution, data.world.waterEdgeM);
  const terrain = createTerrain(data, hashSeed(seed));
  const n = resolution;
  const height = new Float32Array(n * n);
  const biomes = new Uint8Array(n * n);
  const sample: TerrainSample = { base: 0, heightM: 0, biome: 'ocean' };
  const progressEvery = Math.max(1, Math.floor(n / 64));

  onProgress?.(0, 'terrain');
  for (let j = 0; j < n; j++) {
    const z = cellCenterZ(grid, j);
    const row = j * n;
    for (let i = 0; i < n; i++) {
      terrain.sample(cellCenterX(grid, i), z, sample);
      height[row + i] = sample.heightM;
      biomes[row + i] = biomeIndex.get(sample.biome) ?? 0;
    }
    if ((j + 1) % progressEvery === 0) onProgress?.((TERRAIN_SHARE * (j + 1)) / n, 'terrain');
  }

  onProgress?.(TERRAIN_SHARE, 'locations');
  const { locations, report } = placeLocations({ seed, data, grid, height, biomes, biomeIds });
  onProgress?.(1, 'locations');

  return {
    seed,
    generator: GENERATOR_ID,
    isApproximation: IS_APPROXIMATION,
    resolution: n,
    extentM: grid.extentM,
    cellSizeM: grid.cellSizeM,
    height,
    biomes,
    biomeIds,
    locations,
    placementReport: report,
  };
}
