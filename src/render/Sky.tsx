import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Mesh, SphereGeometry, type PerspectiveCamera } from 'three';
import { createSkyMaterial } from './materials';

/** Space backdrop with a faint horizon band; drawn before the stars, never occludes. */
export function Sky() {
  const mesh = useMemo(() => {
    const m = new Mesh(new SphereGeometry(1, 32, 16), createSkyMaterial());
    m.frustumCulled = false;
    m.renderOrder = -101;
    m.name = 'sky';
    return m;
  }, []);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
    [mesh],
  );

  useFrame(({ camera }) => {
    const u = mesh.material.uniforms.uRadius;
    if (u) u.value = (camera as PerspectiveCamera).far * 0.95;
  });

  return <primitive object={mesh} />;
}
