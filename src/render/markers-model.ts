import type { LocationCategory } from '../data/schema';
import type { Layer, Pin, SpoilerLevel } from '../state/url-state';
import type { BiomeAnchor } from './biome-anchors';
import type { IconId } from './icons';

export interface MarkerSource {
  key: string;
  layer: Layer;
  icon: IconId;
  /** Game coordinates, metres. */
  x: number;
  z: number;
  /** Content id this marker opens (location type, biome or pin id). */
  contentId: string;
  /** Location instance id (e.g. "troll-cave-12") when this is a placed location. */
  instanceId?: string;
  label: string;
  spoilerLevel: number;
  /** Tab to open in the info panel. */
  tab?: 'overview' | 'threats' | 'loot';
}

export interface RenderMarker extends MarkerSource {
  cluster: number;
  members: string[];
  hidden: boolean;
}

export const CATEGORY_LAYER: Record<LocationCategory, Layer> = {
  start: 'bosses',
  'boss-altar': 'bosses',
  miniboss: 'bosses',
  dungeon: 'dungeons',
  trader: 'npcs',
  vegvisir: 'vegvisirs',
  village: 'villages',
  runestone: 'landmarks',
  landmark: 'landmarks',
};

export const CATEGORY_ICON: Record<LocationCategory, IconId> = {
  start: 'start',
  'boss-altar': 'boss',
  miniboss: 'miniboss',
  dungeon: 'dungeon',
  trader: 'trader',
  vegvisir: 'vegvisir',
  village: 'village',
  runestone: 'runestone',
  landmark: 'landmark',
};

const LAYER_NOUNS: Record<Layer, string> = {
  biomes: 'biomes',
  bosses: 'boss sites',
  dungeons: 'dungeons',
  npcs: 'traders',
  vegvisirs: 'vegvisir sites',
  villages: 'villages',
  landmarks: 'landmarks',
  creatures: 'creature groups',
  resources: 'resource groups',
  grid: 'grid points',
  pins: 'pins',
};

export interface MarkerInputs {
  locations: readonly { id: string; type: string; x: number; z: number }[];
  types: ReadonlyMap<string, { name: string; category: LocationCategory; spoilerLevel: number }>;
  anchors: readonly BiomeAnchor[];
  biomes: ReadonlyMap<string, { name: string; spoilerLevel: number }>;
  pins: readonly Pin[];
  layers: readonly Layer[];
}

/** Everything that could be drawn for the active layers (before clustering). */
export function buildMarkerSources(inp: MarkerInputs): MarkerSource[] {
  const on = new Set(inp.layers);
  const out: MarkerSource[] = [];
  for (const loc of inp.locations) {
    const t = inp.types.get(loc.type);
    if (!t) continue;
    const layer = CATEGORY_LAYER[t.category];
    if (!on.has(layer)) continue;
    out.push({
      key: loc.id,
      layer,
      icon: CATEGORY_ICON[t.category],
      x: loc.x,
      z: loc.z,
      contentId: loc.type,
      instanceId: loc.id,
      label: t.name,
      spoilerLevel: t.spoilerLevel,
    });
  }
  const badge = (layer: 'creatures' | 'resources', dx: number) => {
    if (!on.has(layer)) return;
    for (const [k, a] of inp.anchors.entries()) {
      const b = inp.biomes.get(a.biome);
      if (!b || a.biome === 'ocean') continue;
      out.push({
        key: `${layer}-${a.biome}-${k}`,
        layer,
        icon: layer === 'creatures' ? 'creature' : 'resource',
        x: a.x + dx,
        z: a.z,
        contentId: a.biome,
        label: `${b.name}: ${layer}`,
        spoilerLevel: b.spoilerLevel,
        tab: layer === 'creatures' ? 'threats' : 'loot',
      });
    }
  };
  badge('creatures', -180);
  badge('resources', 180);
  if (on.has('pins')) {
    for (const p of inp.pins) {
      out.push({
        key: p.id,
        layer: 'pins',
        icon: 'pin',
        x: p.x,
        z: p.z,
        contentId: p.id,
        label: p.label,
        spoilerLevel: 0,
      });
    }
  }
  return out;
}

/** Cluster cell size for a camera distance: none when close, coarser when far. */
export function clusterCellSize(cameraDistanceM: number): number {
  if (cameraDistanceM < 2500) return 0;
  // Quantize to powers of two so clusters don't reshuffle on every zoom step.
  const raw = cameraDistanceM * 0.07;
  return 2 ** Math.round(Math.log2(raw));
}

/**
 * Grid clustering per layer. Pins and biome badges are never clustered. Markers above the
 * spoiler level are kept (as hidden "unknown" markers) so the map doesn't leak by absence.
 */
export function clusterMarkers(
  sources: readonly MarkerSource[],
  cellM: number,
  spoiler: SpoilerLevel,
): RenderMarker[] {
  const out: RenderMarker[] = [];
  const cells = new Map<string, MarkerSource[]>();
  for (const s of sources) {
    const hidden = s.spoilerLevel > spoiler;
    if (cellM <= 0 || s.layer === 'pins' || s.layer === 'creatures' || s.layer === 'resources') {
      out.push({ ...s, cluster: 1, members: [s.key], hidden });
      continue;
    }
    const key = `${s.layer}:${Math.floor(s.x / cellM)}:${Math.floor(s.z / cellM)}`;
    const list = cells.get(key);
    if (list) list.push(s);
    else cells.set(key, [s]);
  }
  for (const [key, list] of cells) {
    const first = list[0];
    if (!first) continue;
    if (list.length === 1) {
      out.push({
        ...first,
        cluster: 1,
        members: [first.key],
        hidden: first.spoilerLevel > spoiler,
      });
      continue;
    }
    const x = list.reduce((acc, s) => acc + s.x, 0) / list.length;
    const z = list.reduce((acc, s) => acc + s.z, 0) / list.length;
    // Represent the cluster by a visible member and a generic label, so a mixed cluster
    // never leaks the name or icon of a spoiler-hidden member.
    const shown = list.find((s) => s.spoilerLevel <= spoiler) ?? first;
    const base: MarkerSource = { ...shown, label: `${list.length} ${LAYER_NOUNS[first.layer]}` };
    delete base.instanceId;
    out.push({
      ...base,
      key: `cluster:${key}`,
      x,
      z,
      cluster: list.length,
      members: list.map((s) => s.key),
      hidden: list.every((s) => s.spoilerLevel > spoiler),
    });
  }
  return out;
}
