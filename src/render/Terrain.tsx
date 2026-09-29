import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, Group, Mesh, Sphere, Vector3 } from 'three';
import { distanceToChunk, selectLod, type ChunkInfo } from './chunks';
import { frameStats } from './frame-stats';
import { createTerrainMaterial, type SharedUniforms } from './materials';
import { RENDER } from './render-config';
import { buildChunkGeometry } from './terrain-geometry';
import type { TerrainModel } from './terrain-model';

/** Metres above sea level where mountain snow starts (visual choice). */
const SNOW_LINE_M = 170;
/** At most this many chunk geometries are built per frame, to avoid hitches. */
const BUILDS_PER_FRAME = 3;

interface ChunkEntry {
  chunk: ChunkInfo;
  mesh: Mesh;
  geometries: (BufferGeometry | undefined)[];
  level: number;
}

function makeGeometry(model: TerrainModel, chunk: ChunkInfo, level: number): BufferGeometry {
  const { positions, indices } = buildChunkGeometry(model.world, chunk, level, model.seaLevelM);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setIndex(new BufferAttribute(indices, 1));
  // Frustum culling must account for the shader's vertical exaggeration.
  const maxExag = RENDER.exaggeration.max;
  const lo = Math.min(chunk.minY, chunk.minY * maxExag);
  const hi = Math.max(chunk.maxY, chunk.maxY * maxExag);
  const center = new Vector3(
    (chunk.minX + chunk.maxX) / 2,
    (lo + hi) / 2,
    (chunk.minZ + chunk.maxZ) / 2,
  );
  const radius = 0.5 * Math.hypot(chunk.maxX - chunk.minX, hi - lo, chunk.maxZ - chunk.minZ);
  geo.boundingSphere = new Sphere(center, radius);
  return geo;
}

export function Terrain({ model, shared }: { model: TerrainModel; shared: SharedUniforms }) {
  const material = useMemo(
    () =>
      createTerrainMaterial(
        shared,
        model.colorTex,
        model.weightsTex,
        model.biomeIndexTex,
        model.world.resolution,
        SNOW_LINE_M,
      ),
    [model, shared],
  );

  const scene = useMemo(() => {
    const group = new Group();
    const entries: ChunkEntry[] = model.chunks
      .filter((c) => c.drawable)
      .map((chunk) => {
        const level = chunk.levels - 1;
        const geometries: (BufferGeometry | undefined)[] = new Array<BufferGeometry | undefined>(
          chunk.levels,
        );
        const geo = makeGeometry(model, chunk, level);
        geometries[level] = geo;
        const mesh = new Mesh(geo, material);
        mesh.matrixAutoUpdate = false;
        mesh.name = `terrain-chunk-${chunk.index}`;
        group.add(mesh);
        return { chunk, mesh, geometries, level };
      });
    return { group, entries };
  }, [model, material]);

  useEffect(
    () => () => {
      for (const e of scene.entries) for (const g of e.geometries) g?.dispose();
      material.dispose();
    },
    [scene, material],
  );

  useFrame(({ camera }) => {
    const exag = shared.uExag.value;
    // Game coordinates: the world group mirrors z (see WorldScene).
    const { x, y } = camera.position;
    const z = -camera.position.z;
    let budget = BUILDS_PER_FRAME;
    for (const e of scene.entries) {
      const d = distanceToChunk(e.chunk, x, y, z, exag);
      const want = selectLod(d, model.chunkWidthM, e.level, e.chunk.levels);
      if (want === e.level) continue;
      let geo = e.geometries[want];
      if (!geo) {
        if (budget <= 0) continue;
        budget--;
        geo = makeGeometry(model, e.chunk, want);
        e.geometries[want] = geo;
      }
      e.mesh.geometry = geo;
      e.level = want;
    }
    frameStats.terrainChunks = scene.entries.length;
  });

  return <primitive object={scene.group} />;
}
