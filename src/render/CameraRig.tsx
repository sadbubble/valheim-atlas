import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, Spherical, Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { appStore } from '../state/app-store';
import { useCameraStore, type CameraRequest } from '../state/camera-store';
import { atlasDebug, type AtlasView } from './debug-hooks';
import { RENDER } from './render-config';

interface ViewState {
  /** Scene-space target (z already mirrored). */
  target: Vector3;
  spherical: Spherical;
}

interface Anim {
  from: ViewState;
  to: ViewState;
  t: number;
}

const C = RENDER.camera;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function viewToState(v: AtlasView): ViewState {
  return {
    target: new Vector3(v.x, 0, -v.z),
    spherical: new Spherical(v.distanceM, v.polar, v.azimuth),
  };
}

/**
 * Orbit controls with damping and zoom limits, a smooth focus-on-point animation, and a
 * dynamic near/far plane so depth precision stays high from 100 m up to the whole world.
 */
export function CameraRig({ worldRadiusM }: { worldRadiusM: number | null }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const anim = useRef<Anim | null>(null);
  const lastRequest = useRef(0);
  const scratch = useRef({ offset: new Vector3(), s: new Spherical() });

  const overview = (radius: number): AtlasView => ({
    x: 0,
    z: 0,
    distanceM: radius * C.overviewDistanceFactor,
    polar: C.overviewPolar,
    azimuth: 0,
  });

  const current = (): ViewState | null => {
    const c = controls.current;
    if (!c) return null;
    const offset = c.object.position.clone().sub(c.target);
    return { target: c.target.clone(), spherical: new Spherical().setFromVector3(offset) };
  };

  const apply = (v: ViewState) => {
    const c = controls.current;
    if (!c) return;
    c.target.copy(v.target);
    c.object.position.setFromSpherical(v.spherical).add(v.target);
    c.update();
  };

  // Jump to the shared link's view (first world only) or the overview when a world arrives.
  useEffect(() => {
    if (worldRadiusM === null) return;
    anim.current = null;
    const shared = appStore.getState().cam;
    if (shared) appStore.setState({ cam: null });
    apply(viewToState(shared ?? overview(worldRadiusM)));
  }, [worldRadiusM]);

  // Expose the view to e2e tests / screenshot scripts.
  useEffect(() => {
    const dbg = atlasDebug();
    dbg.setView = (v) => {
      anim.current = null;
      apply(viewToState(v));
    };
    const getView = (): AtlasView | null => {
      const s = current();
      if (!s) return null;
      return {
        x: s.target.x,
        z: -s.target.z,
        distanceM: s.spherical.radius,
        polar: s.spherical.phi,
        azimuth: s.spherical.theta,
      };
    };
    dbg.getView = getView;
    useCameraStore.setState({ getView });
  }, []);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cancel = () => {
      anim.current = null;
    };
    c.addEventListener('start', cancel);
    return () => {
      c.removeEventListener('start', cancel);
    };
  }, []);

  const startAnimation = (req: CameraRequest, radius: number) => {
    const from = current();
    if (!from) return;
    let to: ViewState;
    if (req.kind === 'overview') {
      to = viewToState(overview(radius));
    } else {
      const s = from.spherical.clone();
      s.radius = MathUtils.clamp(req.distanceM ?? s.radius, C.minDistanceM, C.maxDistanceM);
      to = { target: new Vector3(req.x, 0, -req.z), spherical: s };
    }
    // Rotate the short way round.
    const dTheta = to.spherical.theta - from.spherical.theta;
    to.spherical.theta = from.spherical.theta + Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
    anim.current = { from, to, t: 0 };
  };

  useFrame((state, delta) => {
    const c = controls.current;
    if (!c) return;
    const cam = state.camera as PerspectiveCamera;
    const radius = worldRadiusM ?? 10000;

    const req = useCameraStore.getState().request;
    if (req && req.id !== lastRequest.current) {
      lastRequest.current = req.id;
      startAnimation(req, radius);
    }

    const a = anim.current;
    if (a) {
      a.t = Math.min(1, a.t + delta / C.focusDurationS);
      const k = easeInOut(a.t);
      const { offset, s } = scratch.current;
      c.target.lerpVectors(a.from.target, a.to.target, k);
      s.set(
        MathUtils.lerp(a.from.spherical.radius, a.to.spherical.radius, k),
        MathUtils.lerp(a.from.spherical.phi, a.to.spherical.phi, k),
        MathUtils.lerp(a.from.spherical.theta, a.to.spherical.theta, k),
      );
      c.object.position.copy(c.target).add(offset.setFromSpherical(s));
      if (a.t >= 1) anim.current = null;
    }

    // Keep the orbit target on the sea plane and inside the world.
    const t = c.target;
    t.y = 0;
    const r = Math.hypot(t.x, t.z);
    if (r > radius) t.multiplyScalar(radius / r);

    // Dynamic clipping planes for depth precision at every zoom level.
    const d = cam.position.distanceTo(t);
    const near = Math.max(0.5, d * 0.0015);
    const far = d * 3 + radius * 4;
    if (Math.abs(cam.near - near) > near * 0.05 || Math.abs(cam.far - far) > far * 0.05) {
      cam.near = near;
      cam.far = far;
      cam.updateProjectionMatrix();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={C.dampingFactor}
      minDistance={C.minDistanceM}
      maxDistance={C.maxDistanceM}
      maxPolarAngle={C.maxPolarAngle}
      zoomSpeed={0.9}
    />
  );
}
