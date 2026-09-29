import { describe, expect, it } from 'vitest';
import { layoutChunks, selectLod, type ChunkInfo, type GridLike } from './chunks';
import { buildChunkGeometry } from './terrain-geometry';

/** A clearly fake test grid: a smooth bump, no game data involved. */
function fakeGrid(resolution: number): GridLike {
  const extentM = 1000;
  const cellSizeM = (2 * extentM) / resolution;
  const height = new Float32Array(resolution * resolution);
  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      height[j * resolution + i] = 50 + 40 * Math.sin(i * 0.21) * Math.cos(j * 0.17);
    }
  }
  return { resolution, extentM, cellSizeM, height };
}

const key = (x: number, z: number) => `${x.toFixed(3)},${z.toFixed(3)}`;

function edgeVertices(
  g: GridLike,
  c: ChunkInfo,
  level: number,
  onEdge: (x: number, z: number) => boolean,
): string[] {
  const { positions, indices } = buildChunkGeometry(g, c, level, 0);
  const used = new Set(indices);
  const out = new Set<string>();
  for (const idx of used) {
    const x = positions[idx * 3] ?? 0;
    const z = positions[idx * 3 + 2] ?? 0;
    if (onEdge(x, z)) out.add(key(x, z));
  }
  return [...out].sort();
}

describe('terrain chunk geometry', () => {
  const g = fakeGrid(129);
  const chunks = layoutChunks(g, 0, 1e9, 4);
  const c0 = chunks[0];
  const c1 = chunks[1];
  if (!c0 || !c1) throw new Error('chunks expected');

  it('covers each chunk exactly (no holes, no overlaps) with upward-facing triangles', () => {
    for (const c of [c0, c1, chunks[5]]) {
      if (!c) continue;
      const expected = (c.maxX - c.minX) * (c.maxZ - c.minZ);
      for (let level = 0; level < c.levels; level++) {
        const { positions, indices } = buildChunkGeometry(g, c, level, 0);
        let area = 0;
        for (let t = 0; t < indices.length; t += 3) {
          const p = (k: number, o: number) => positions[(indices[t + k] ?? 0) * 3 + o] ?? 0;
          const bx = p(1, 0) - p(0, 0);
          const bz = p(1, 2) - p(0, 2);
          const dx = p(2, 0) - p(0, 0);
          const dz = p(2, 2) - p(0, 2);
          const ny = bz * dx - bx * dz;
          expect(ny).toBeGreaterThan(0);
          area += ny / 2;
        }
        expect(area / expected).toBeCloseTo(1, 6);
      }
    }
  });

  it('coarser levels have fewer triangles', () => {
    const counts = Array.from(
      { length: c0.levels },
      (_, l) => buildChunkGeometry(g, c0, l, 0).indices.length,
    );
    for (let l = 1; l < counts.length; l++) {
      expect(counts[l]).toBeLessThan(counts[l - 1] ?? 0);
    }
  });

  it('neighbouring chunks share identical edge vertices at every LOD combination', () => {
    const edgeX = c0.maxX;
    const onEdge = (x: number) => Math.abs(x - edgeX) < 1e-2;
    const reference = edgeVertices(g, c0, 0, onEdge);
    expect(reference.length).toBe(c0.j1 - c0.j0 + 1);
    for (let a = 0; a < c0.levels; a++) {
      expect(edgeVertices(g, c0, a, onEdge)).toEqual(reference);
      expect(edgeVertices(g, c1, a, onEdge)).toEqual(reference);
    }
  });

  it('stores height relative to sea level, unexaggerated', () => {
    const { positions } = buildChunkGeometry(g, c0, 0, 30);
    expect(positions[1]).toBeCloseTo((g.height[0] ?? 0) - 30, 5);
  });
});

describe('selectLod', () => {
  it('picks finer levels nearby and clamps to available levels', () => {
    expect(selectLod(0, 100, 0, 4, [1, 2, 4], 0)).toBe(0);
    expect(selectLod(150, 100, 0, 4, [1, 2, 4], 0)).toBe(1);
    expect(selectLod(1e6, 100, 0, 4, [1, 2, 4], 0)).toBe(3);
    expect(selectLod(1e6, 100, 0, 2, [1, 2, 4], 0)).toBe(1);
  });

  it('applies hysteresis around thresholds', () => {
    // Just past the 0→1 threshold: stays at 0 when currently 0, but 1 when already 1.
    expect(selectLod(105, 100, 0, 4, [1, 2, 4], 0.1)).toBe(0);
    expect(selectLod(105, 100, 1, 4, [1, 2, 4], 0.1)).toBe(1);
    // Just inside it: stays at 1 until clearly closer.
    expect(selectLod(95, 100, 1, 4, [1, 2, 4], 0.1)).toBe(1);
    expect(selectLod(85, 100, 1, 4, [1, 2, 4], 0.1)).toBe(0);
  });
});

describe('layoutChunks', () => {
  it('tiles the grid with shared borders and flags underwater chunks', () => {
    const g2 = fakeGrid(65);
    const chunks = layoutChunks(g2, 1000, 1e9, 4);
    expect(chunks).toHaveLength(16);
    expect(chunks.every((c) => !c.drawable)).toBe(true);
    const dry = layoutChunks(g2, 0, 1e9, 4);
    expect(dry[0]?.i1).toBe(dry[1]?.i0);
    expect(dry.at(-1)?.i1).toBe(64);
    expect(dry.every((c) => c.drawable)).toBe(true);
  });
});
