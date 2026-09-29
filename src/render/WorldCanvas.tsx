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
      aria-label="3D world view"
    >
      <color attach="background" args={[SCENE_COLORS.space]} />
      <AdaptiveQuality />
      <WorldScene />
    </Canvas>
  );
}
