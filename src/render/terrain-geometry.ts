import { vertexX, vertexZ, type ChunkInfo, type GridLike } from './chunks';

export interface ChunkGeometryData {
  /** xyz per vertex; y = height above sea level in metres (exaggeration is applied in the shader). */
  positions: Float32Array;
  indices: Uint32Array;
}

interface RingVertex {
  index: number;
  /** Position along the current ring side, 0..1. */
  t: number;
}

/**
 * Builds one chunk's mesh at LOD `level` (a step of 2^level cells).
 *
 * Crack-free by construction: at every level the chunk's border keeps FULL resolution,
 * so neighbours always share identical edge vertices whatever their own level. Only the
 * interior is coarsened, and a ring of triangles zips the fine border to the coarse
 * interior. No skirts are needed.
 */
export function buildChunkGeometry(
  g: GridLike,
  c: ChunkInfo,
  level: number,
  seaLevelM: number,
): ChunkGeometryData {
  const wu = c.i1 - c.i0;
  const wv = c.j1 - c.j0;
  const step = 2 ** level;
  const n = g.resolution;

  const positions: number[] = [];
  const indices: number[] = [];
  const vertexOf = new Int32Array((wu + 1) * (wv + 1)).fill(-1);
  const vtx = (u: number, v: number): number => {
    const key = v * (wu + 1) + u;
    let idx = vertexOf[key] ?? -1;
    if (idx < 0) {
      idx = positions.length / 3;
      const i = c.i0 + u;
      const j = c.j0 + v;
      positions.push(vertexX(g, i), (g.height[j * n + i] ?? 0) - seaLevelM, vertexZ(g, j));
      vertexOf[key] = idx;
    }
    return idx;
  };
  const tri = (a: number, b: number, d: number) => {
    // Winding: the face normal must point up (+y), i.e. counter-clockwise seen from above.
    const ax = positions[a * 3] ?? 0;
    const az = positions[a * 3 + 2] ?? 0;
    const bx = (positions[b * 3] ?? 0) - ax;
    const bz = (positions[b * 3 + 2] ?? 0) - az;
    const dx = (positions[d * 3] ?? 0) - ax;
    const dz = (positions[d * 3 + 2] ?? 0) - az;
    const ny = bz * dx - bx * dz;
    if (ny > 0) indices.push(a, b, d);
    else if (ny < 0) indices.push(a, d, b);
    // ny === 0: degenerate, skip.
  };
  const quad = (u0: number, v0: number, u1: number, v1: number) => {
    const a = vtx(u0, v0);
    const b = vtx(u1, v0);
    const d = vtx(u1, v1);
    const e = vtx(u0, v1);
    tri(a, b, d);
    tri(a, d, e);
  };

  const inner = (w: number): number[] => {
    const out: number[] = [];
    for (let x = step; x <= w - step; x += step) out.push(x);
    return out;
  };
  const iu = inner(wu);
  const iv = inner(wv);

  if (level === 0 || iu.length < 2 || iv.length < 2) {
    for (let v = 0; v < wv; v++) for (let u = 0; u < wu; u++) quad(u, v, u + 1, v + 1);
  } else {
    // Coarse interior.
    for (let b = 0; b + 1 < iv.length; b++) {
      for (let a = 0; a + 1 < iu.length; a++) {
        quad(iu[a] ?? 0, iv[b] ?? 0, iu[a + 1] ?? 0, iv[b + 1] ?? 0);
      }
    }
    // Ring: zip the full-res border to the coarse interior, one side at a time.
    const u0 = iu[0] ?? 0;
    const uN = iu.at(-1) ?? 0;
    const v0 = iv[0] ?? 0;
    const vN = iv.at(-1) ?? 0;
    const full = (w: number) => Array.from({ length: w + 1 }, (_, k) => k);
    const side = (
      outer: [number, number][],
      innerPts: [number, number][],
      outerLen: number,
      innerLen: number,
      axis: 0 | 1,
    ) => {
      const o0 = outer[0]?.[axis] ?? 0;
      const i0 = innerPts[0]?.[axis] ?? 0;
      const O: RingVertex[] = outer.map((p) => ({
        index: vtx(p[0], p[1]),
        t: Math.abs(p[axis] - o0) / outerLen,
      }));
      const I: RingVertex[] = innerPts.map((p) => ({
        index: vtx(p[0], p[1]),
        t: Math.abs(p[axis] - i0) / innerLen,
      }));
      let a = 0;
      let b = 0;
      while (a < O.length - 1 || b < I.length - 1) {
        const tO = a < O.length - 1 ? (O[a + 1]?.t ?? Infinity) : Infinity;
        const tI = b < I.length - 1 ? (I[b + 1]?.t ?? Infinity) : Infinity;
        const oa = O[a]?.index ?? 0;
        const ib = I[b]?.index ?? 0;
        if (tO <= tI) {
          tri(oa, O[a + 1]?.index ?? 0, ib);
          a++;
        } else {
          tri(oa, I[b + 1]?.index ?? 0, ib);
          b++;
        }
      }
    };
    const iuPts = [u0, ...iu.slice(1, -1), uN];
    const ivPts = [v0, ...iv.slice(1, -1), vN];
    // North side (v = 0), east (u = wu), south (v = wv), west (u = 0).
    side(
      full(wu).map((u) => [u, 0]),
      iuPts.map((u) => [u, v0]),
      wu,
      uN - u0,
      0,
    );
    side(
      full(wv).map((v) => [wu, v]),
      ivPts.map((v) => [uN, v]),
      wv,
      vN - v0,
      1,
    );
    side(
      full(wu)
        .reverse()
        .map((u) => [u, wv]),
      [...iuPts].reverse().map((u) => [u, vN]),
      wu,
      uN - u0,
      0,
    );
    side(
      full(wv)
        .reverse()
        .map((v) => [0, v]),
      [...ivPts].reverse().map((v) => [u0, v]),
      wv,
      vN - v0,
      1,
    );
  }

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}
