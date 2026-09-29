import { KIND_LABELS, type ContentIndex, type ContentKind } from '../data/content-index';
import { fuzzySearch, normalize, type Searchable } from '../lib/fuzzy';

/** Searchable content kinds, in tie-break order (lower first). */
export const SEARCH_KINDS: readonly ContentKind[] = [
  'biome',
  'location',
  'boss',
  'progression',
  'creature',
  'item',
  'resource',
  'food',
  'station',
];

export interface SearchResult extends Searchable {
  kind: ContentKind;
  spoilerLevel: number;
}

export function buildSearchItems(index: ContentIndex): SearchResult[] {
  const out: SearchResult[] = [];
  for (const [id, hit] of index.byId) {
    if (!SEARCH_KINDS.includes(hit.kind)) continue;
    const e = hit.entry as {
      name: string;
      prefab?: string | null;
      category?: string;
      subcategory?: string;
    };
    out.push({
      id,
      name: e.name,
      keywords: [
        KIND_LABELS[hit.kind],
        hit.kind === 'progression' ? 'progression guide' : undefined,
        e.category,
        e.subcategory,
        e.prefab,
      ]
        .filter(Boolean)
        .join(' '),
      rank: SEARCH_KINDS.indexOf(hit.kind),
      kind: hit.kind,
      spoilerLevel: hit.entry.spoilerLevel,
    });
  }
  return out;
}

/**
 * Runs the search and drops results hidden by the spoiler setting, so partial queries never
 * leak late-game names. A hidden entry is only listed when the query is its exact name (the
 * user already knows it); the rest are counted, not named.
 */
export function searchVisible(
  query: string,
  items: readonly SearchResult[],
  isHidden: (level: number, id: string) => boolean,
  limit = 10,
): { shown: SearchResult[]; hiddenCount: number } {
  if (!query.trim()) return { shown: [], hiddenCount: 0 };
  const q = normalize(query);
  const shown: SearchResult[] = [];
  let hiddenCount = 0;
  for (const r of fuzzySearch(query, items, items.length)) {
    if (isHidden(r.spoilerLevel, r.id) && normalize(r.name) !== q) hiddenCount++;
    else if (shown.length < limit) shown.push(r);
  }
  return { shown, hiddenCount };
}
