import { useEffect, useMemo } from 'react';
import { ConeGeometry, CylinderGeometry, RingGeometry } from 'three';
import {
  createGlowWallMaterial,
  createHaloMaterial,
  createRimMaterial,
  type SharedUniforms,
} from './materials';
import { RENDER } from './render-config';
import type { TerrainModel } from './terrain-model';

const GLOW_WALL_HEIGHT_M = 1800;

/**
 * Presents the disc as a small floating world: a crust wall and tapering underside below
 * the sea, a glowing halo ring around the edge and a faint atmosphere wall above it.
 */
export function WorldRim({ model, shared }: { model: TerrainModel; shared: SharedUniforms }) {
  const r = model.waterEdgeM;
  const { wallDepthM, undersideDepthM, haloWidthFactor } = RENDER.rim;
  const parts = useMemo(() => {
    const wall = new CylinderGeometry(r, r, wallDepthM, 256, 1, true).translate(
      0,
      -wallDepthM / 2,
      0,
    );
    const underside = new ConeGeometry(r, undersideDepthM, 128, 1, true)
      .rotateX(Math.PI)
      .translate(0, -wallDepthM - undersideDepthM / 2, 0);
    const halo = new RingGeometry(r, r * (1 + haloWidthFactor), 256, 1).rotateX(-Math.PI / 2);
    const glowWall = new CylinderGeometry(r, r, GLOW_WALL_HEIGHT_M, 256, 1, true).translate(
      0,
      GLOW_WALL_HEIGHT_M / 2,
      0,
    );
    return {
      wall,
      underside,
      halo,
      glowWall,
      rimMat: createRimMaterial(shared, wallDepthM + undersideDepthM),
      haloMat: createHaloMaterial(r, r * (1 + haloWidthFactor)),
      glowMat: createGlowWallMaterial(GLOW_WALL_HEIGHT_M),
    };
  }, [r, wallDepthM, undersideDepthM, haloWidthFactor, shared]);

  useEffect(
    () => () => {
      for (const v of Object.values(parts)) v.dispose();
    },
    [parts],
  );

  return (
    <group name="world-rim">
      <mesh geometry={parts.wall} material={parts.rimMat} />
      <mesh geometry={parts.underside} material={parts.rimMat} />
      <mesh geometry={parts.halo} material={parts.haloMat} renderOrder={1} />
      <mesh geometry={parts.glowWall} material={parts.glowMat} renderOrder={2} />
    </group>
  );
}
