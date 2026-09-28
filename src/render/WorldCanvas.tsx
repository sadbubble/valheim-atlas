import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { PlaceholderDisc } from './PlaceholderDisc';
import { PLACEHOLDER_DISC_RADIUS, PLACEHOLDER_SKY_COLOR } from './placeholder-palette';

export function WorldCanvas() {
  const r = PLACEHOLDER_DISC_RADIUS;
  return (
    <Canvas
      className="world-canvas"
      camera={{ position: [0, r * 1.1, r * 1.9], fov: 45, near: 0.5, far: r * 20 }}
      dpr={[1, 2]}
      shadows="percentage"
      aria-label="3D world view"
    >
      <color attach="background" args={[PLACEHOLDER_SKY_COLOR]} />
      <fog attach="fog" args={[PLACEHOLDER_SKY_COLOR, r * 3, r * 8]} />
      <hemisphereLight args={['#cfe3f0', '#243018', 0.6]} />
      <directionalLight position={[r, r * 1.5, r * 0.5]} intensity={1.6} castShadow />
      <PlaceholderDisc />
      <OrbitControls
        makeDefault
        enableDamping
        minDistance={r * 0.3}
        maxDistance={r * 5}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
