import { useState } from 'react';
import { LOCATION_CATEGORIES, type LocationCategory } from '../data/schema';
import { formatDistance } from '../lib/format';
import { nearestLocation } from '../render/navigation';
import { RENDER } from '../render/render-config';
import { useCameraStore } from '../state/camera-store';
import { useContentStore } from '../state/content-store';
import { useUiStore } from '../state/ui-store';
import { useWorldStore } from '../state/world-store';
import { useSpoilerHidden } from './use-spoiler';

/**
 * "Find nearest…" from a point (SPEC V3): picks the closest placed location of a category,
 * highlights it, opens its panel and flies there. Spoiler-hidden types are never picked.
 */
export function FindNearest({ from }: { from: { x: number; z: number } }) {
  const index = useContentStore((s) => s.index);
  const hidden = useSpoilerHidden();
  const [category, setCategory] = useState<LocationCategory>('trader');
  const [message, setMessage] = useState('');
  if (!index) return null;

  const find = () => {
    const status = useWorldStore.getState().status;
    if (status.kind !== 'ready') {
      setMessage('The world is still being generated.');
      return;
    }
    const types = new Map(index.data.locations.map((l) => [l.id, l]));
    const hit = nearestLocation(from, status.world.locations, (typeId) => {
      const t = types.get(typeId);
      return t !== undefined && t.category === category && !hidden(t.spoilerLevel, t.id);
    });
    if (!hit) {
      setMessage('None on this map that your spoiler setting shows.');
      return;
    }
    const { instance } = hit;
    const name = types.get(instance.type)?.name ?? instance.type;
    setMessage(`${name}: ${formatDistance(hit.distM)} away.`);
    const ui = useUiStore.getState();
    ui.select({ id: instance.type, instance: { id: instance.id, x: instance.x, z: instance.z } });
    ui.setHighlight({ biomes: [], locationTypes: [instance.type] });
    useCameraStore.getState().focus(instance.x, instance.z, RENDER.camera.flyLocationDistanceM);
  };

  return (
    <div className="find-nearest">
      <div className="row">
        <label htmlFor="find-nearest-category">Find nearest</label>
        <select
          id="find-nearest-category"
          value={category}
          onChange={(e) => {
            const c = LOCATION_CATEGORIES.find((x) => x === e.target.value);
            if (c) setCategory(c);
          }}
        >
          {LOCATION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {index.categoryInfo(c)?.name ?? c}
            </option>
          ))}
        </select>
        <button type="button" onClick={find}>
          Go
        </button>
      </div>
      <p className="hud-hint" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
