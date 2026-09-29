import {
  DataTexture,
  HalfFloatType,
  LinearFilter,
  NearestFilter,
  NoColorSpace,
  RedFormat,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';
import type { WorldConstants } from '../data/schema';
import type { GeneratedWorld } from '../world/types';
import { layoutChunks, type ChunkInfo } from './chunks';
import { GROUND_COLORS } from './palette';
import { buildSurfaceTextures } from './surface-textures';

/** Soft biome borders: blur radius in metres, converted to cells per world resolution. */
const BIOME_BLUR_M = 45;

export interface TerrainModel {
  world: GeneratedWorld;
  seaLevelM: number;
  worldRadiusM: number;
  waterEdgeM: number;
  chunks: ChunkInfo[];
  chunkWidthM: number;
  maxHeightM: number;
  colorTex: DataTexture;
  weightsTex: DataTexture;
  heightTex: DataTexture;
  /** R8: biome index per cell (nearest filtering) for highlighting. */
  biomeIndexTex: DataTexture;
  dispose(): void;
}

function dataTexture(
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

export function createTerrainModel(world: GeneratedWorld, c: WorldConstants): TerrainModel {
  const n = world.resolution;
  const chunks = layoutChunks(world, c.seaLevelM, c.waterEdgeM);
  const blurCells = Math.max(1, Math.round(BIOME_BLUR_M / world.cellSizeM));
  const surf = buildSurfaceTextures(world, GROUND_COLORS, blurCells);
  const colorTex = dataTexture(surf.color, n, RGBAFormat, UnsignedByteType, true);
  const weightsTex = dataTexture(surf.weights, n, RGBAFormat, UnsignedByteType, false);
  const heightTex = dataTexture(surf.height, n, RedFormat, HalfFloatType, false);
  const biomeIndexTex = dataTexture(world.biomes, n, RedFormat, UnsignedByteType, false);
  biomeIndexTex.magFilter = NearestFilter;
  biomeIndexTex.minFilter = NearestFilter;
  let maxHeightM = 0;
  for (const ch of chunks) maxHeightM = Math.max(maxHeightM, ch.maxY);
  const first = chunks[0];
  return {
    world,
    seaLevelM: c.seaLevelM,
    worldRadiusM: c.worldRadiusM,
    waterEdgeM: c.waterEdgeM,
    chunks,
    chunkWidthM: first ? first.maxX - first.minX : world.extentM,
    maxHeightM,
    colorTex,
    weightsTex,
    heightTex,
    biomeIndexTex,
    dispose() {
      biomeIndexTex.dispose();
      colorTex.dispose();
      weightsTex.dispose();
      heightTex.dispose();
    },
  };
}
