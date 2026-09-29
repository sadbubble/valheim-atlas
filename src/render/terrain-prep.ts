import type { BiomeId } from '../data/schema';
import { computeBiomeAnchors, type BiomeAnchor } from './biome-anchors';
import { layoutChunks, type ChunkInfo } from './chunks';
import { GROUND_COLORS } from './palette';
import { RENDER } from './render-config';
import { buildSurfaceTextures } from './surface-textures';
import { buildChunkGeometry } from './terrain-geometry';

/**
 * Turning a generated world into render inputs (surface textures, chunk layout, the first
 * chunk meshes, biome anchors). Pure and three.js-free: it runs in the terrain-prep worker
 * so the main thread only wraps the finished buffers (docs/RELEASE.md, long tasks).
 */
export interface TerrainPrepInput {
  resolution: number;
  extentM: number;
  cellSizeM: number;
  height: Float32Array;
  biomes: Uint8Array;
  biomeIds: BiomeId[];
  seaLevelM: number;
  waterEdgeM: number;
  worldRadiusM: number;
}

/** One chunk's mesh at one LOD level (see terrain-geometry.ts). */
export interface ChunkMesh {
  chunkIndex: number;
  level: number;
  positions: Float32Array<ArrayBuffer>;
  indices: Uint32Array<ArrayBuffer>;
}

export interface PreparedTerrain {
  /** RGBA8 blurred ground colour, RGBA8 blurred biome weights, R16F height (surface-textures.ts). */
  color: Uint8Array<ArrayBuffer>;
  weights: Uint8Array<ArrayBuffer>;
  height: Uint16Array<ArrayBuffer>;
  chunks: ChunkInfo[];
  /** The coarsest mesh of every drawable chunk: what the overview needs on the first frame. */
  coarse: ChunkMesh[];
  anchors: BiomeAnchor[];
  maxHeightM: number;
}

export function prepareTerrainSync(input: TerrainPrepInput): PreparedTerrain {
  const blurCells = Math.max(1, Math.round(RENDER.terrain.biomeBlurM / input.cellSizeM));
  const surface = buildSurfaceTextures(input, GROUND_COLORS, blurCells);
  const chunks = layoutChunks(input, input.seaLevelM, input.waterEdgeM);
  const coarse: ChunkMesh[] = [];
  let maxHeightM = 0;
  for (const chunk of chunks) {
    maxHeightM = Math.max(maxHeightM, chunk.maxY);
    if (!chunk.drawable) continue;
    const level = chunk.levels - 1;
    const { positions, indices } = buildChunkGeometry(input, chunk, level, input.seaLevelM);
    coarse.push({ chunkIndex: chunk.index, level, positions, indices });
  }
  const anchors = computeBiomeAnchors(input, { maxRadiusM: input.worldRadiusM });
  return { ...surface, chunks, coarse, anchors, maxHeightM };
}

/** The buffers to transfer (not copy) when posting a prepared terrain. */
export function preparedTransferables(t: PreparedTerrain): ArrayBuffer[] {
  const out = [t.color.buffer, t.weights.buffer, t.height.buffer];
  for (const m of t.coarse) out.push(m.positions.buffer, m.indices.buffer);
  return out;
}
