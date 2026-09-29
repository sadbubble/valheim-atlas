import { Html, Line } from '@react-three/drei';
import { useMemo } from 'react';
import { formatDistance } from '../lib/format';
import { useRenderStore } from '../state/render-store';
import { useUiStore } from '../state/ui-store';
import { sampleHeight } from './pick';
import { SCENE_COLORS } from './palette';
import type { TerrainModel } from './terrain-model';

const SAMPLES = 64;
const LIFT_M = 6;

/** Distance tool: a line hugging the terrain between the two measured points. */
export function MeasureLine({ model }: { model: TerrainModel }) {
  const points = useUiStore((s) => s.measure);
  const exag = useRenderStore((s) => s.exaggeration);
  const y = (x: number, z: number) =>
    Math.max(0, sampleHeight(model.world, x, z) - model.seaLevelM) * exag + LIFT_M;

  const line = useMemo(() => {
    const [a, b] = points;
    if (!a || !b) return null;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= SAMPLES; k++) {
      const t = k / SAMPLES;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      pts.push([x, y(x, z), z]);
    }
    const mid: [number, number, number] = pts[SAMPLES / 2] ?? [a.x, 0, a.z];
    return { pts, mid, dist: Math.hypot(b.x - a.x, b.z - a.z) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, exag, model]);

  const first = points[0];
  return (
    <>
      {first && !line ? (
        <Html position={[first.x, y(first.x, first.z), first.z]} center zIndexRange={[6, 0]}>
          <span className="map-tag">Start: click a second point</span>
        </Html>
      ) : null}
      {line ? (
        <>
          <Line
            points={line.pts}
            color={SCENE_COLORS.edgeGlow}
            lineWidth={3}
            depthTest={false}
            renderOrder={25}
          />
          <Html position={line.mid} center zIndexRange={[6, 0]}>
            <span className="map-tag" data-testid="measure-label">
              {formatDistance(line.dist)}
            </span>
          </Html>
        </>
      ) : null}
    </>
  );
}
