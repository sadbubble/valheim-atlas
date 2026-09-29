import { RENDER } from './render-config';

/** One terrain chunk: an inclusive range of grid vertices [i0..i1] × [j0..j1]. */
export interface ChunkInfo {
  index: number;
  i0: number;
  i1: number;
  j0: number;
  j1: number;
  /** World-space bounds (metres); y is height relative to sea level, unexaggerated. */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  /** False when the chunk is entirely under water or outside the disc. */
  drawable: boolean;
  /** Number of LOD levels available (level k uses a step of 2^k cells). */
  levels: number;
}

export interface GridLike {
  resolution: number;
  extentM: number;
  cellSizeM: number;
  height: Float32Array;
}

export const vertexX = (g: GridLike, i: number): number => -g.extentM + (i + 0.5) * g.cellSizeM;
export const vertexZ = (g: GridLike, j: number): number => g.extentM - (j + 0.5) * g.cellSizeM;

/**
 * Splits the grid into chunks. Vertices sit at cell centres; neighbouring chunks share
 * their border row/column so the mesh is continuous.
 */
export function layoutChunks(
  g: GridLike,
  seaLevelM: number,
  discRadiusM: number,
  chunksPerSide: number = RENDER.terrain.chunksPerSide,
): ChunkInfo[] {
  const n = g.resolution;
  const cells = Math.max(1, Math.floor((n - 1) / chunksPerSide));
  const chunks: ChunkInfo[] = [];
  const starts: number[] = [];
  for (let k = 0; k < chunksPerSide; k++) starts.push(k * cells);
  starts.push(n - 1);

  for (let cj = 0; cj < chunksPerSide; cj++) {
    for (let ci = 0; ci < chunksPerSide; ci++) {
      const i0 = starts[ci] ?? 0;
      const i1 = starts[ci + 1] ?? n - 1;
      const j0 = starts[cj] ?? 0;
      const j1 = starts[cj + 1] ?? n - 1;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const h = (g.height[j * n + i] ?? 0) - seaLevelM;
          if (h < minY) minY = h;
          if (h > maxY) maxY = h;
        }
      }
      const minX = vertexX(g, i0);
      const maxX = vertexX(g, i1);
      const maxZ = vertexZ(g, j0);
      const minZ = vertexZ(g, j1);
      // Nearest point of the chunk to the world centre.
      const nx = Math.max(minX, Math.min(0, maxX));
      const nz = Math.max(minZ, Math.min(0, maxZ));
      const insideDisc = nx * nx + nz * nz <= discRadiusM * discRadiusM;
      const width = Math.min(i1 - i0, j1 - j0);
      let levels = 1;
      while (width / 2 ** levels >= 4) levels++;
      chunks.push({
        index: chunks.length,
        i0,
        i1,
        j0,
        j1,
        minX,
        maxX,
        minZ,
        maxZ,
        minY,
        maxY,
        drawable: insideDisc && maxY > -RENDER.terrain.underwaterCullM,
        levels,
      });
    }
  }
  return chunks;
}

/** Distance (metres) from a point to the chunk's bounding box. */
export function distanceToChunk(
  c: ChunkInfo,
  x: number,
  y: number,
  z: number,
  exaggeration: number,
): number {
  const dx = Math.max(c.minX - x, 0, x - c.maxX);
  const dz = Math.max(c.minZ - z, 0, z - c.maxZ);
  const dy = Math.max(c.minY * exaggeration - y, 0, y - c.maxY * exaggeration);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Picks a LOD level from the distance. Thresholds at or above the current level are
 * stretched by (1 + hysteresis) and those below it shrunk by (1 - hysteresis), so a chunk
 * sitting near a threshold does not flip back and forth.
 */
export function selectLod(
  distM: number,
  chunkWidthM: number,
  current: number,
  levels: number,
  thresholds: readonly number[] = RENDER.terrain.lodDistances,
  hysteresis: number = RENDER.terrain.lodHysteresis,
): number {
  const units = distM / chunkWidthM;
  let level = thresholds.length;
  for (let k = 0; k < thresholds.length; k++) {
    const t = (thresholds[k] ?? Infinity) * (k >= current ? 1 + hysteresis : 1 - hysteresis);
    if (units < t) {
      level = k;
      break;
    }
  }
  return Math.min(level, levels - 1);
}
