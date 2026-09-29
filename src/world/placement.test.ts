import { beforeAll, describe, expect, it } from 'vitest';
import type { LocationType } from '../data/schema';
import { loadWorldGenDataFromDisk } from '../test/load-data-from-disk';
import { generateWorldSync } from './generate';
import { cellIndexAt, makeGrid } from './grid';
import { TUNING } from './tuning';
import type { GeneratedWorld } from './types';

const data = loadWorldGenDataFromDisk();
const types = new Map<string, LocationType>(data.locations.map((l) => [l.id, l]));
let worlds: GeneratedWorld[] = [];

beforeAll(() => {
  worlds = ['HelloWorld', 'placement'].map((s) => generateWorldSync(s, 512, data));
});

describe('location placement', () => {
  it('respects biome, distance and altitude constraints from locations.json', () => {
    for (const w of worlds) {
      const grid = makeGrid(w.resolution, w.extentM);
      for (const loc of w.locations) {
        const type = types.get(loc.type);
        expect(type, loc.type).toBeDefined();
        if (!type) continue;
        const cell = cellIndexAt(grid, loc.x, loc.z);
        expect(w.biomeIds[w.biomes[cell] ?? 0]).toBe(loc.biomeId);
        expect(type.biomeIds).toContain(loc.biomeId);
        const d = Math.hypot(loc.x, loc.z);
        expect(d).toBeLessThanOrEqual(data.world.worldRadiusM + 1);
        if (type.minDistM != null) expect(d).toBeGreaterThanOrEqual(type.minDistM - 1);
        if (type.maxDistM != null) expect(d).toBeLessThanOrEqual(type.maxDistM + 1);
        const alt = (w.height[cell] ?? 0) - data.world.seaLevelM;
        expect(alt).toBeGreaterThanOrEqual(type.minAltM ?? TUNING.placement.defaultMinAltitudeM);
        if (type.maxAltM != null) expect(alt).toBeLessThanOrEqual(type.maxAltM);
      }
    }
  });

  it('keeps at most one location per zone and unique ids', () => {
    const size = data.world.zoneSizeM;
    for (const w of worlds) {
      const zones = new Set<string>();
      const ids = new Set<string>();
      for (const loc of w.locations) {
        const zone = `${Math.floor(loc.x / size)},${Math.floor(loc.z / size)}`;
        expect(zones.has(zone), `zone ${zone} used twice`).toBe(false);
        zones.add(zone);
        expect(ids.has(loc.id)).toBe(false);
        ids.add(loc.id);
      }
    }
  });

  it('never exceeds quantity, keeps unique types to one, skips unknown quantities', () => {
    for (const w of worlds) {
      const counts = new Map<string, number>();
      for (const loc of w.locations) counts.set(loc.type, (counts.get(loc.type) ?? 0) + 1);
      for (const type of data.locations) {
        const n = counts.get(type.id) ?? 0;
        const report = w.placementReport.find((r) => r.type === type.id);
        expect(report?.placed).toBe(n);
        if (type.quantity === null) {
          expect(n).toBe(0);
          expect(report?.wanted).toBeNull();
        } else {
          expect(n).toBeLessThanOrEqual(type.unique === true ? 1 : type.quantity);
        }
      }
    }
  });

  it('places exactly one start temple, in Meadows', () => {
    for (const w of worlds) {
      const starts = w.locations.filter((l) => l.type === 'start-temple');
      expect(starts).toHaveLength(1);
      expect(starts[0]?.biomeId).toBe('meadows');
    }
  });

  it('places every boss location whose quantity is known', () => {
    for (const w of worlds) {
      for (const type of data.locations.filter(
        (t) => t.category === 'boss-altar' && t.quantity !== null,
      )) {
        expect(
          w.locations.some((l) => l.type === type.id),
          type.id,
        ).toBe(true);
      }
    }
  });
});
