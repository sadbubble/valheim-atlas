import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, Points, type PerspectiveCamera } from 'three';
import { createRng } from '../world/rng';
import { createStarMaterial, type SharedUniforms } from './materials';
import { RENDER } from './render-config';

/** Twinkling stars on a camera-centred sphere; drawn first and never occlude anything. */
export function Starfield({ shared }: { shared: SharedUniforms }) {
  const points = useMemo(() => {
    const rng = createRng(0x5747);
    const count = RENDER.stars.count;
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const twinkle = new Float32Array(count);
    for (let k = 0; k < count; k++) {
      // Rejection-sample a uniform direction.
      for (;;) {
        const x = rng.next() * 2 - 1;
        const y = rng.next() * 2 - 1;
        const z = rng.next() * 2 - 1;
        const len = x * x + y * y + z * z;
        if (len <= 1 && len > 1e-4) {
          pos.set([x, y, z], k * 3);
          break;
        }
      }
      const s = rng.next();
      size[k] = 0.8 + s * s * 2.6;
      twinkle[k] = rng.next();
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new Float32BufferAttribute(size, 1));
    geo.setAttribute('aTwinkle', new Float32BufferAttribute(twinkle, 1));
    const p = new Points(geo, createStarMaterial(shared));
    p.frustumCulled = false;
    p.renderOrder = -100;
    return p;
  }, [shared]);

  useEffect(
    () => () => {
      points.geometry.dispose();
      points.material.dispose();
    },
    [points],
  );

  useFrame(({ camera, gl }) => {
    const u = points.material.uniforms;
    if (u.uRadius) u.uRadius.value = (camera as PerspectiveCamera).far * 0.9;
    if (u.uPixelRatio) u.uPixelRatio.value = gl.getPixelRatio();
  });

  return <primitive object={points} />;
}
