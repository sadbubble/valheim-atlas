import { flyTargetFor, highlightFor, type Highlight } from '../render/navigation';
import { RENDER } from '../render/render-config';
import { useCameraStore } from '../state/camera-store';
import { useContentStore } from '../state/content-store';
import { useMapStore } from '../state/map-store';
import { useUiStore, type InfoTab } from '../state/ui-store';
import { useWorldStore } from '../state/world-store';

/** Flies to the nearest place a highlight occurs in. Returns false if it's not on this map. */
export function flyToHighlight(hl: Highlight): boolean {
  const status = useWorldStore.getState().status;
  if (status.kind !== 'ready') return false;
  const view = useCameraStore.getState().getView();
  const target = flyTargetFor(
    hl,
    status.world.locations,
    useMapStore.getState().anchors,
    view ? { x: view.x, z: view.z } : { x: 0, z: 0 },
    {
      locationDistanceM: RENDER.camera.flyLocationDistanceM,
      biomeDistanceM: RENDER.camera.flyBiomeDistanceM,
    },
  );
  if (!target) return false;
  useCameraStore.getState().focus(target.x, target.z, target.distanceM);
  return true;
}

/** Opens an entry's info panel, highlights where it occurs and optionally flies there. */
export function openEntry(id: string, opts: { fly?: boolean; tab?: InfoTab } = {}): void {
  const index = useContentStore.getState().index;
  if (!index) return;
  const ui = useUiStore.getState();
  ui.select({ id }, opts.tab);
  const hl = highlightFor(index, id);
  ui.setHighlight(hl);
  if (opts.fly) flyToHighlight(hl);
}
