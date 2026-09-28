import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import {
  PLACEHOLDER_DISC_RADIUS,
  PLACEHOLDER_OCEAN_COLOR,
  PLACEHOLDER_RING_COLORS,
} from './placeholder-palette';

const ROTATION_RAD_PER_S = 0.15;

/** A slowly rotating stand-in for the world until terrain lands in Phase 3. */
export function PlaceholderDisc() {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * ROTATION_RAD_PER_S;
  });

  const ringCount = PLACEHOLDER_RING_COLORS.length;
  const ringWidth = PLACEHOLDER_DISC_RADIUS / ringCount;

  return (
    <group ref={group}>
      {/* Ocean beyond the land disc */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.5} receiveShadow>
        <circleGeometry args={[PLACEHOLDER_DISC_RADIUS * 1.6, 96]} />
        <meshStandardMaterial color={PLACEHOLDER_OCEAN_COLOR} roughness={0.35} metalness={0.1} />
      </mesh>
      {/* Land: concentric rings with slight height steps so rotation is visible */}
      {PLACEHOLDER_RING_COLORS.map((color, i) => (
        <mesh key={color} rotation-x={-Math.PI / 2} position-y={(ringCount - i) * 0.4}>
          <ringGeometry args={[i * ringWidth, (i + 1) * ringWidth, 96, 1, 0, Math.PI * 1.97]} />
          <meshStandardMaterial color={color} roughness={0.9} flatShading />
        </mesh>
      ))}
      {/* A marker pillar near the centre, so the rotation is easy to see */}
      <mesh position={[ringWidth * 0.5, 4, 0]} castShadow>
        <cylinderGeometry args={[1.5, 2, 8, 6]} />
        <meshStandardMaterial color="#d8c9a3" flatShading />
      </mesh>
    </group>
  );
}
