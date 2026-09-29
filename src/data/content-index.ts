import type { ContentData } from './load';
import type { LocationCategory, LocationCategoryInfo } from './schema';

export type ContentKind =
  | 'biome'
  | 'boss'
  | 'creature'
  | 'resource'
  | 'item'
  | 'station'
  | 'food'
  | 'progression'
  | 'location'
  | 'tip';

type EntryOf<K extends ContentKind> = K extends 'biome'
  ? ContentData['biomes'][number]
  : K extends 'boss'
    ? ContentData['bosses'][number]
    : K extends 'creature'
      ? ContentData['creatures'][number]
      : K extends 'resource'
        ? ContentData['resources'][number]
        : K extends 'item'
          ? ContentData['items'][number]
          : K extends 'station'
            ? ContentData['craftingStations'][number]
            : K extends 'food'
              ? ContentData['food'][number]
              : K extends 'progression'
                ? ContentData['progression'][number]
                : K extends 'location'
                  ? ContentData['locations'][number]
                  : ContentData['tips'][number];

export type IndexedEntry = { [K in ContentKind]: { kind: K; entry: EntryOf<K> } }[ContentKind];

export const KIND_LABELS: Record<ContentKind, string> = {
  biome: 'Biome',
  boss: 'Boss',
  creature: 'Creature',
  resource: 'Resource',
  item: 'Item',
  station: 'Crafting station',
  food: 'Food',
  progression: 'Guide step',
  location: 'Location',
  tip: 'Tip',
};

export interface ContentIndex {
  data: ContentData;
  byId: Map<string, IndexedEntry>;
  /** Tips mentioning an id (subjectIds); for a biome, also every tip set in that biome. */
  tipsFor(id: string): ContentData['tips'];
  /** Creatures and bosses that list `itemId` as a drop. */
  droppedBy(itemId: string): IndexedEntry[];
  /** Glossary entry explaining a location category, if the data has one. */
  categoryInfo(category: LocationCategory): LocationCategoryInfo | undefined;
}

/** Builds lookups over every content file (ids are globally unique; see validate.ts). */
export function buildContentIndex(data: ContentData): ContentIndex {
  const byId = new Map<string, IndexedEntry>();
  const add = <K extends ContentKind>(kind: K, list: readonly EntryOf<K>[]) => {
    for (const entry of list) byId.set(entry.id, { kind, entry } as IndexedEntry);
  };
  add('biome', data.biomes);
  add('boss', data.bosses);
  add('creature', data.creatures);
  add('resource', data.resources);
  add('item', data.items);
  add('station', data.craftingStations);
  add('food', data.food);
  add('progression', data.progression);
  add('location', data.locations);
  add('tip', data.tips);

  const dropIndex = new Map<string, IndexedEntry[]>();
  for (const list of [data.creatures, data.bosses]) {
    for (const c of list) {
      for (const d of c.drops) {
        const who = byId.get(c.id);
        if (who) dropIndex.set(d.itemId, [...(dropIndex.get(d.itemId) ?? []), who]);
      }
    }
  }

  return {
    data,
    byId,
    tipsFor: (id) => {
      const isBiome = byId.get(id)?.kind === 'biome';
      // A biome panel shows every tip that applies in that biome (SPEC N6), not only
      // general biome tips; other entries show tips that name them.
      return data.tips.filter(
        (t) => t.subjectIds.includes(id) || (isBiome && (t.biomeIds as string[]).includes(id)),
      );
    },
    droppedBy: (itemId) => dropIndex.get(itemId) ?? [],
    categoryInfo: (category) => data.locationCategories.find((c) => c.id === category),
  };
}
