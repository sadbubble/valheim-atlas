import { formatCoords, formatDistance } from '../lib/format';
import { useContentStore } from '../state/content-store';
import { useUiStore } from '../state/ui-store';
import { useSpoilerHidden } from './use-spoiler';

/** Game-style X/Z coordinates under the cursor, plus the biome there and its tier (N1). */
export function CoordReadout() {
  const cursor = useUiStore((s) => s.cursor);
  const index = useContentStore((s) => s.index);
  const hidden = useSpoilerHidden();
  const biome = cursor?.biomeId ? index?.byId.get(cursor.biomeId) : undefined;
  let biomeText = '';
  if (biome?.kind === 'biome') {
    const b = biome.entry;
    biomeText = hidden(b.spoilerLevel, b.id)
      ? ' · Unknown biome (hidden by your spoiler setting)'
      : ` · ${b.name}${b.tier > 0 ? ` (tier ${b.tier})` : ''}`;
  }
  return (
    <span className="coords" data-testid="coords">
      {cursor
        ? `${formatCoords(cursor.x, cursor.z)} · ${Math.round(Math.max(0, cursor.heightM))} m above sea · ${formatDistance(Math.hypot(cursor.x, cursor.z))} from centre${biomeText}`
        : 'Point at the map for coordinates'}
    </span>
  );
}
