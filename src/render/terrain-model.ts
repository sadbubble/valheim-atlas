import {
  DataTexture,
  HalfFloatType,
  LinearFilter,
  NoColorSpace,
  RedFormat,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';
import type { WorldConstants } from '../data/schema';
import type { GeneratedWorld } from '../world/types';
import type { BiomeAnchor } from './biome-anchors';
import type { ChunkInfo } from './chunks';
import type { ChunkMesh } from './terrain-prep';
import type { PreparedWorld } from './terrain-prep-client';

export interface TerrainModel {
  world: GeneratedWorld;
  /** Terrain-prep worker id of this world (for highlight masks). */
  worldId: number;
  seaLevelM: number;
  worldRadiusM: number;
  waterEdgeM: number;
  chunks: ChunkInfo[];
  /** Prebuilt coarsest mesh per drawable chunk, by chunk index. */
  coarse: ReadonlyMap<number, ChunkMesh>;
  anchors: BiomeAnchor[];
  chunkWidthM: number;
  maxHeightM: number;
  colorTex: DataTexture;
  weightsTex: DataTexture;
  heightTex: DataTexture;
  dispose(): void;
}

export function dataTexture(
  data: Uint8Array | Uint16Array,
  n: number,
  format: typeof RGBAFormat | typeof RedFormat,
  type: typeof UnsignedByteType | typeof HalfFloatType,
  srgb: boolean,
): DataTexture {
  const tex = new DataTexture(data, n, n, format, type);
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Wraps the buffers the terrain-prep worker built (render/terrain-prep.ts) into textures.
 * Cheap: no per-cell work happens here on the main thread.
 */
export function createTerrainModel(
  world: GeneratedWorld,
  c: WorldConstants,
  prepared: PreparedWorld,
): TerrainModel {
  const n = world.resolution;
  const t = prepared.terrain;
  const colorTex = dataTexture(t.color, n, RGBAFormat, UnsignedByteType, true);
  const weightsTex = dataTexture(t.weights, n, RGBAFormat, UnsignedByteType, false);
  const heightTex = dataTexture(t.height, n, RedFormat, HalfFloatType, false);
  const first = t.chunks[0];
  return {
    world,
    worldId: prepared.worldId,
    seaLevelM: c.seaLevelM,
    worldRadiusM: c.worldRadiusM,
    waterEdgeM: c.waterEdgeM,
    chunks: t.chunks,
    coarse: new Map(t.coarse.map((m) => [m.chunkIndex, m])),
    anchors: t.anchors,
    chunkWidthM: first ? first.maxX - first.minX : world.extentM,
    maxHeightM: t.maxHeightM,
    colorTex,
    weightsTex,
    heightTex,
    dispose() {
      colorTex.dispose();
      weightsTex.dispose();
      heightTex.dispose();
    },
  };
}
