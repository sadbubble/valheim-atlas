import { Vector3, type Camera } from 'three';
import type { RenderMarker } from './markers-model';
import { RENDER } from './render-config';

export interface PlacedMarker extends RenderMarker {
  /** Ground height above sea level (unexaggerated), metres. */
  yM: number;
  sizePx: number;
}

/** The markers currently drawn, for screen-space picking (written by <Markers/>). */
export const markerRegistry: { markers: PlacedMarker[] } = { markers: [] };

export function markerScale(distM: number): number {
  const M = RENDER.markers;
  return Math.min(M.maxScale, Math.max(M.minScale, M.refDistanceM / distM));
}

const tmp = new Vector3();

/**
 * Finds the drawn marker under a screen point (CSS pixels relative to the canvas). Markers
 * are billboards lifted so their bottom sits on the point, so the hit circle is centred
 * half an icon above the projected position.
 */
export function pickMarker(
  markers: readonly PlacedMarker[],
  camera: Camera,
  px: number,
  py: number,
  width: number,
  height: number,
  exaggeration: number,
): PlacedMarker | null {
  let best: PlacedMarker | null = null;
  let bestD = Infinity;
  for (const m of markers) {
    // Scene z mirrors game z.
    tmp.set(m.x, m.yM * exaggeration, -m.z);
    const dist = tmp.distanceTo(camera.position);
    tmp.project(camera);
    if (tmp.z > 1 || tmp.z < -1) continue;
    const size = m.sizePx * markerScale(dist);
    const sx = (tmp.x * 0.5 + 0.5) * width;
    const sy = (-tmp.y * 0.5 + 0.5) * height - size / 2;
    const d = Math.hypot(px - sx, py - sy);
    if (d <= size / 2 + RENDER.markers.pickPaddingPx && d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}
