import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Color, Group, InstancedMesh, Matrix4, Quaternion, SRGBColorSpace, Vector3 } from 'three';
import { useRenderStore } from '../state/render-store';
import { distanceToChunk } from './chunks';
import { frameStats } from './frame-stats';
import { createPropMaterial, type SharedUniforms } from './materials';
import { createPropGeometries } from './prop-geometry';
import { PROP_STRIDE, placeChunkProps } from './props';
import { PROP_KINDS } from './props-config';
import { RENDER } from './render-config';
import type { TerrainModel } from './terrain-model';

/** At most this many chunks get their props built per frame. */
const BUILDS_PER_FRAME = 2;

/**
 * Per-chunk instanced trees and rocks, built lazily when the camera comes near and hidden
 * beyond the prop distance.
 */
export function Props({ model, shared }: { model: TerrainModel; shared: SharedUniforms }) {
  const res = useMemo(() => {
    const maxDist = RENDER.props.maxDistanceM;
    return {
      group: new Group(),
      geometries: createPropGeometries(),
      material: createPropMaterial(shared, maxDist),
      built: new Map<number, InstancedMesh[]>(),
      chunks: model.chunks.filter((c) => c.drawable && c.maxY > RENDER.props.minAltitudeM),
    };
  }, [model, shared]);

  useEffect(
    () => () => {
      for (const meshes of res.built.values()) for (const m of meshes) m.dispose();
      for (const g of Object.values(res.geometries)) g.dispose();
      res.material.dispose();
    },
    [res],
  );

  useFrame(({ camera }) => {
    const show = useRenderStore.getState().showProps;
    const exag = shared.uExag.value;
    // Game coordinates: the world group mirrors z (see WorldScene).
    const { x, y } = camera.position;
    const z = -camera.position.z;
    const maxDist = RENDER.props.maxDistanceM;
    let budget = BUILDS_PER_FRAME;
    let instances = 0;
    for (const chunk of res.chunks) {
      const near = show && distanceToChunk(chunk, x, y, z, exag) < maxDist;
      let meshes = res.built.get(chunk.index);
      if (near && !meshes && budget > 0) {
        budget--;
        meshes = buildChunkMeshes(model, chunk, res);
        res.built.set(chunk.index, meshes);
        for (const m of meshes) res.group.add(m);
      }
      if (!meshes) continue;
      for (const m of meshes) {
        m.visible = near;
        if (near) instances += m.count;
      }
    }
    frameStats.propInstances = instances;
  });

  return <primitive object={res.group} />;
}

const tmpMatrix = new Matrix4();
const tmpPos = new Vector3();
const tmpQuat = new Quaternion();
const tmpScale = new Vector3();
const tmpColor = new Color();
const UP = new Vector3(0, 1, 0);

function buildChunkMeshes(
  model: TerrainModel,
  chunk: TerrainModel['chunks'][number],
  res: {
    geometries: ReturnType<typeof createPropGeometries>;
    material: ReturnType<typeof createPropMaterial>;
  },
): InstancedMesh[] {
  const placed = placeChunkProps(model.world, chunk, {
    seaLevelM: model.seaLevelM,
    minAltitudeM: RENDER.props.minAltitudeM,
    maxTreeSlope: RENDER.props.maxTreeSlope,
  });
  const meshes: InstancedMesh[] = [];
  for (const kind of PROP_KINDS) {
    const data = placed.get(kind);
    if (!data || data.length === 0) continue;
    const count = data.length / PROP_STRIDE;
    const mesh = new InstancedMesh(res.geometries[kind], res.material, count);
    for (let k = 0; k < count; k++) {
      const o = k * PROP_STRIDE;
      tmpPos.set(data[o] ?? 0, (data[o + 1] ?? 0) - 0.6, data[o + 2] ?? 0);
      tmpQuat.setFromAxisAngle(UP, data[o + 3] ?? 0);
      const s = data[o + 4] ?? 1;
      tmpScale.set(s, s, s);
      mesh.setMatrixAt(k, tmpMatrix.compose(tmpPos, tmpQuat, tmpScale));
      // Tints are sRGB (our palette); convert to the linear working colour space.
      tmpColor.setRGB(data[o + 5] ?? 1, data[o + 6] ?? 1, data[o + 7] ?? 1, SRGBColorSpace);
      mesh.setColorAt(k, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    // The shader exaggerates instance heights; widen the culling sphere to match.
    if (mesh.boundingSphere) {
      mesh.boundingSphere.radius += Math.max(0, chunk.maxY) * (RENDER.exaggeration.max - 1) + 30;
    }
    mesh.matrixAutoUpdate = false;
    mesh.name = `props-${kind}-${chunk.index}`;
    meshes.push(mesh);
  }
  return meshes;
}
