import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../data/content-index';
import type { BiomeId } from '../data/schema';
import { loadContentFromDisk } from '../test/load-data-from-disk';
import { computeBiomeAnchors } from './biome-anchors';
import {
  buildMarkerSources,
  clusterCellSize,
  clusterMarkers,
  countLocations,
} from './markers-model';
import { flyTargetFor, highlightFor, nearestLocation } from './navigation';

const content = loadContentFromDisk();
const index = buildContentIndex(content);

/** Clearly fake 8×8 world: west half biome 0, east half biome 1. */
function fakeWorld() {
  const n = 8;
  const biomes = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) biomes[j * n + i] = i < 4 ? 0 : 1;
  const biomeIds: BiomeId[] = ['meadows', 'black-forest'];
  return { resolution: n, extentM: 4000, cellSizeM: 1000, biomes, biomeIds };
}

describe('content index', () => {
  it('indexes every file by globally unique id', () => {
    expect(index.byId.get('troll')?.kind).toBe('creature');
    expect(index.byId.get('meadows')?.kind).toBe('biome');
    expect(index.byId.get('eikthyr-altar')?.kind).toBe('location');
    expect(index.droppedBy('troll-hide').map((e) => e.entry.id)).toContain('troll');
  });
});

describe('biome anchors', () => {
  it('finds one anchor per connected region, inside it', () => {
    const anchors = computeBiomeAnchors(fakeWorld(), { gridSize: 8, minAreaM2: 1 });
    expect(anchors.map((a) => a.biome).sort()).toEqual(['black-forest', 'meadows']);
    const west = anchors.find((a) => a.biome === 'meadows');
    expect(west?.x).toBeLessThan(0);
    expect(west?.areaM2).toBe(32 * 1e6);
  });
});

describe('navigation', () => {
  const anchors = computeBiomeAnchors(fakeWorld(), { gridSize: 8, minAreaM2: 1 });
  const opts = { locationDistanceM: 2000, biomeDistanceM: 6000 };

  it('highlights where things occur', () => {
    expect(highlightFor(index, 'meadows')).toEqual({ biomes: ['meadows'], locationTypes: [] });
    expect(highlightFor(index, 'eikthyr').locationTypes).toEqual(['eikthyr-altar']);
    expect(highlightFor(index, 'troll').biomes).toContain('black-forest');
    expect(highlightFor(index, 'nope')).toEqual({ biomes: [], locationTypes: [] });
  });

  it('flies to the nearest instance, else the nearest biome anchor', () => {
    const instances = [
      { type: 'eikthyr-altar', x: 900, z: 0 },
      { type: 'eikthyr-altar', x: -300, z: 100 },
    ];
    expect(
      flyTargetFor(highlightFor(index, 'eikthyr'), instances, anchors, { x: 0, z: 0 }, opts),
    ).toEqual({
      x: -300,
      z: 100,
      distanceM: 2000,
    });
    const t = flyTargetFor(highlightFor(index, 'troll'), [], anchors, { x: 0, z: 0 }, opts);
    expect(t?.x).toBeGreaterThan(0);
    expect(t?.distanceM).toBe(6000);
    expect(
      flyTargetFor({ biomes: ['ashlands'], locationTypes: [] }, [], anchors, { x: 0, z: 0 }, opts),
    ).toBeNull();
  });

  it('finds the nearest accepted location from a point (V3)', () => {
    const instances = [
      { id: 'a', type: 'test-trader', x: 3000, z: 4000 },
      { id: 'b', type: 'test-trader', x: -600, z: 800 },
      { id: 'c', type: 'test-altar', x: 10, z: 10 },
    ];
    const hit = nearestLocation({ x: 0, z: 0 }, instances, (t) => t === 'test-trader');
    expect(hit?.instance.id).toBe('b');
    expect(hit?.distM).toBe(1000);
    expect(nearestLocation({ x: 0, z: 0 }, instances, () => false)).toBeNull();
  });
});

describe('markers', () => {
  const types = new Map(content.locations.map((l) => [l.id, l]));
  const biomes = new Map(content.biomes.map((b) => [b.id, b]));
  const locations = [
    { id: 'troll-cave-1', type: 'troll-cave', x: 100, z: 100 },
    { id: 'troll-cave-2', type: 'troll-cave', x: 150, z: 120 },
    { id: 'haldor-1', type: 'haldor', x: 5000, z: 5000 },
  ];
  const pins = [{ id: 'pin-1', x: 1, z: 2, label: 'Home' }];

  it('maps location categories to layers and honours toggles', () => {
    const all = buildMarkerSources({
      locations,
      types,
      anchors: [],
      biomes,
      pins,
      layers: ['dungeons', 'npcs', 'pins'],
    });
    expect(all.map((m) => `${m.layer}:${m.icon}`).sort()).toEqual([
      'dungeons:dungeon',
      'dungeons:dungeon',
      'npcs:trader',
      'pins:pin',
    ]);
    expect(
      buildMarkerSources({ locations, types, anchors: [], biomes, pins, layers: ['npcs'] }),
    ).toHaveLength(1);
  });

  it('filters single location types and counts locations per layer and type (V2)', () => {
    const shown = buildMarkerSources({
      locations,
      types,
      anchors: [],
      biomes,
      pins: [],
      layers: ['dungeons', 'npcs'],
      hide: ['troll-cave'],
    });
    expect(shown.map((m) => m.contentId)).toEqual(['haldor']);
    const counts = countLocations(locations, types);
    expect(counts.byLayer.get('dungeons')).toBe(2);
    expect(counts.byLayer.get('npcs')).toBe(1);
    expect(counts.byType.get('troll-cave')).toBe(2);
    expect(counts.byLayer.get('villages')).toBeUndefined();
  });

  it('clusters nearby markers of a layer when zoomed out, never pins', () => {
    const src = buildMarkerSources({
      locations,
      types,
      anchors: [],
      biomes,
      pins,
      layers: ['dungeons', 'npcs', 'pins'],
    });
    expect(clusterCellSize(1000)).toBe(0);
    expect(clusterMarkers(src, 0, 2)).toHaveLength(4);
    const clustered = clusterMarkers(src, 1024, 2);
    const cave = clustered.find((m) => m.layer === 'dungeons');
    expect(cave?.cluster).toBe(2);
    expect(cave?.members.sort()).toEqual(['troll-cave-1', 'troll-cave-2']);
    expect(clustered.find((m) => m.layer === 'pins')?.cluster).toBe(1);
  });

  it('never leaks a hidden member through a mixed cluster', () => {
    const base = { layer: 'dungeons' as const, icon: 'dungeon' as const };
    const mixed = [
      { ...base, key: 'a', x: 1, z: 1, contentId: 'late', label: 'Late dungeon', spoilerLevel: 2 },
      {
        ...base,
        key: 'b',
        x: 2,
        z: 2,
        contentId: 'early',
        label: 'Early dungeon',
        spoilerLevel: 0,
      },
    ];
    const [c] = clusterMarkers(mixed, 1024, 0);
    expect(c?.label).toBe('2 dungeons');
    expect(c?.contentId).toBe('early');
    expect(c?.hidden).toBe(false);
  });

  it('keeps markers above the spoiler level but marks them hidden', () => {
    const src = buildMarkerSources({
      locations,
      types,
      anchors: [],
      biomes,
      pins: [],
      layers: ['dungeons'],
    });
    const hiddenAt0 = clusterMarkers(src, 0, 0);
    const level = types.get('troll-cave')?.spoilerLevel ?? 0;
    expect(hiddenAt0.every((m) => m.hidden === level > 0)).toBe(true);
  });
});
