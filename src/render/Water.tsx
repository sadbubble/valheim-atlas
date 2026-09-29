import { useEffect, useMemo } from 'react';
import { CircleGeometry } from 'three';
import { createWaterMaterial, type SharedUniforms } from './materials';
import type { TerrainModel } from './terrain-model';

/** Stylized sea: one disc at sea level (scene y = 0) out to the water edge. */
export function Water({ model, shared }: { model: TerrainModel; shared: SharedUniforms }) {
  const geometry = useMemo(
    () => new CircleGeometry(model.waterEdgeM, 256).rotateX(-Math.PI / 2),
    [model],
  );
  const material = useMemo(
    () => createWaterMaterial(shared, model.heightTex, model.seaLevelM),
    [model, shared],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <mesh geometry={geometry} material={material} name="water" />;
}
