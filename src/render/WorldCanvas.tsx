import { Canvas } from '@react-three/fiber';
import { AdaptiveQuality } from './AdaptiveQuality';
import { SCENE_COLORS } from './palette';
import { RENDER } from './render-config';
import { WorldScene } from './WorldScene';

export function WorldCanvas() {
  return (
    <Canvas
      className="world-canvas"
      camera={{ position: [0, 14000, 22000], fov: RENDER.camera.fov, near: 5, far: 200000 }}
      dpr={[1, RENDER.quality.maxDpr]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // Focusable so the keyboard camera controls work here (SPEC N8; see ui/use-shortcuts).
      tabIndex={0}
      role="application"
      aria-roledescription="3D map"
      aria-label="3D world view. Arrow keys pan, plus and minus zoom, Q and E rotate, Page Up and Page Down tilt, T top-down view, R reset view."
    >
      <color attach="background" args={[SCENE_COLORS.space]} />
      <AdaptiveQuality />
      <WorldScene />
    </Canvas>
  );
}
