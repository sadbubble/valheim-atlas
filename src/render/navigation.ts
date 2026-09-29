import type { ContentIndex } from '../data/content-index';
import type { BiomeId } from '../data/schema';
import type { BiomeAnchor } from './biome-anchors';
import { RENDER } from './render-config';

export interface Highlight {
  biomes: BiomeId[];
  /** Location type ids whose instances should be highlighted. */
  locationTypes: string[];
}

export interface FlyTarget {
  x: number;
  z: number;
  distanceM: number;
}

export const EMPTY_HIGHLIGHT: Highlight = { biomes: [], locationTypes: [] };

/** Which biomes and locations an entry "occurs in", for search highlighting. */
export function highlightFor(index: ContentIndex, id: string): Highlight {
  const hit = index.byId.get(id);
  if (!hit) return EMPTY_HIGHLIGHT;
  const biomes = [...hit.entry.biomeIds];
  switch (hit.kind) {
    case 'biome':
      return { biomes: [hit.entry.id], locationTypes: [] };
    case 'location':
      return { biomes, locationTypes: [hit.entry.id] };
    case 'boss':
      return { biomes, locationTypes: [hit.entry.altarLocationId] };
    default: {
      // Locations tied to this entry (e.g. a boss id on an altar, an NPC name).
      const types = index.data.locations
        .filter((l) => l.bossId === id || l.revealsLocationIds?.includes(id))
        .map((l) => l.id);
      return { biomes, locationTypes: types };
    }
  }
}

interface Instance {
  type: string;
  x: number;
  z: number;
}

const nearest = <T extends { x: number; z: number }>(
  list: readonly T[],
  from: { x: number; z: number },
) =>
  list.reduce<T | null>(
    (best, p) =>
      best === null ||
      (p.x - from.x) ** 2 + (p.z - from.z) ** 2 < (best.x - from.x) ** 2 + (best.z - from.z) ** 2
        ? p
        : best,
    null,
  );

/**
 * The placed location nearest to `from` among types the filter accepts (e.g. one category,
 * skipping spoiler-hidden types). Used by "Find nearest…" from a pin (SPEC V3).
 */
export function nearestLocation<T extends { type: string; x: number; z: number }>(
  from: { x: number; z: number },
  instances: readonly T[],
  accept: (type: string) => boolean,
): { instance: T; distM: number } | null {
  const hit = nearest(
    instances.filter((i) => accept(i.type)),
    from,
  );
  return hit ? { instance: hit, distM: Math.hypot(hit.x - from.x, hit.z - from.z) } : null;
}

/**
 * Where to fly for an entry: the nearest placed instance of a highlighted location type,
 * otherwise the nearest anchor of a highlighted biome. Null if it occurs nowhere on this map.
 */
export function flyTargetFor(
  highlight: Highlight,
  instances: readonly Instance[],
  anchors: readonly BiomeAnchor[],
  from: { x: number; z: number },
  opts: { locationDistanceM: number; biomeDistanceM: number },
): FlyTarget | null {
  if (highlight.locationTypes.length > 0) {
    const types = new Set(highlight.locationTypes);
    const hit = nearest(
      instances.filter((i) => types.has(i.type)),
      from,
    );
    if (hit) return { x: hit.x, z: hit.z, distanceM: opts.locationDistanceM };
  }
  const biomes = new Set(highlight.biomes);
  const a = nearest(
    anchors.filter((x) => biomes.has(x.biome)),
    from,
  );
  return a ? { x: a.x, z: a.z, distanceM: opts.biomeDistanceM } : null;
}

/**
 * Duration and arc of a camera flight (render-config camera.fly): longer hops take a bit
 * longer and, when long compared with how far out the camera is, rise at mid-flight.
 * The arc is added as arcM · 4k(1 − k), so it is zero at both ends: no overshoot.
 */
export function flightShape(
  travelM: number,
  fromRadiusM: number,
  toRadiusM: number,
  c: {
    focusDurationS: number;
    maxDistanceM: number;
    fly: { perKmS: number; maxS: number; arcFactor: number; arcMinTravelM: number };
  } = RENDER.camera,
): { durationS: number; arcM: number } {
  const durationS = Math.min(c.fly.maxS, c.focusDurationS + (travelM / 1000) * c.fly.perKmS);
  const highM = Math.max(fromRadiusM, toRadiusM);
  const arcM =
    travelM < c.fly.arcMinTravelM
      ? 0
      : Math.min(Math.max(travelM * c.fly.arcFactor - highM * 0.5, 0), c.maxDistanceM - highM);
  return { durationS, arcM: Math.max(0, arcM) };
}
