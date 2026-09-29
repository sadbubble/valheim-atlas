import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import { useCameraStore } from '../state/camera-store';
import type { SharedUniforms } from './materials';
import { pickSurface } from './pick';
import { RENDER } from './render-config';
import type { TerrainModel } from './terrain-model';

/** Double-click the world to smoothly focus the camera on that spot. */
export function SurfacePicker({ model, shared }: { model: TerrainModel; shared: SharedUniforms }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target?: Vector3 } | null;

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const onDoubleClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const { origin: o, direction: d } = raycaster.ray;
      // Scene z is mirrored game z.
      const hit = pickSurface(
        model.world,
        model.seaLevelM,
        shared.uExag.value,
        [o.x, o.y, -o.z],
        [d.x, d.y, -d.z],
        (camera as PerspectiveCamera).far,
        Math.max(5, o.y / 400),
      );
      if (!hit) return;
      const current = controls?.target ? camera.position.distanceTo(controls.target) : Infinity;
      useCameraStore
        .getState()
        .focus(hit.x, hit.z, Math.min(current, RENDER.camera.focusDistanceM));
    };
    el.addEventListener('dblclick', onDoubleClick);
    return () => {
      el.removeEventListener('dblclick', onDoubleClick);
    };
  }, [gl, camera, controls, model, shared]);

  return null;
}
