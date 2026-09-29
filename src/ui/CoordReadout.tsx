import { formatCoords, formatDistance } from '../lib/format';
import { useUiStore } from '../state/ui-store';

/** Game-style X/Z coordinates under the cursor. */
export function CoordReadout() {
  const cursor = useUiStore((s) => s.cursor);
  return (
    <span className="coords" data-testid="coords">
      {cursor
        ? `${formatCoords(cursor.x, cursor.z)} · ${Math.round(Math.max(0, cursor.heightM))} m above sea · ${formatDistance(Math.hypot(cursor.x, cursor.z))} from centre`
        : 'Point at the map for coordinates'}
    </span>
  );
}
