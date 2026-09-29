import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { RENDER } from './render-config';

/** Drops the pixel ratio to 1 when the frame rate sags, and restores it when it recovers. */
export function AdaptiveQuality() {
  const setDpr = useThree((s) => s.setDpr);
  return (
    <PerformanceMonitor
      bounds={() => [RENDER.quality.minFps, RENDER.quality.targetFps]}
      onDecline={() => {
        setDpr(1);
      }}
      onIncline={() => {
        setDpr(RENDER.quality.maxDpr);
      }}
    />
  );
}
