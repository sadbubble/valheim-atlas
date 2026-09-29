import type { ContentData } from '../data/load';
import { collectTodo } from '../data/validate';

export interface UnverifiedSummary {
  /** Every null value in the content data (the same list as docs/DATA_TODO.md). */
  total: number;
  byFile: { file: string; count: number }[];
}

/** Maps the loaded content back to its data files, as `collectTodo` expects. */
function asDataFiles(data: ContentData) {
  return {
    biomes: data.biomes,
    bosses: data.bosses,
    creatures: data.creatures,
    resources: data.resources,
    items: data.items,
    'crafting-stations': data.craftingStations,
    food: data.food,
    progression: data.progression,
    locations: data.locations,
    tips: data.tips,
  };
}

/** How many values are unverified (null), in total and per data file (About view, F12). */
export function unverifiedSummary(data: ContentData): UnverifiedSummary {
  const todo = collectTodo(asDataFiles(data));
  const counts = new Map<string, number>();
  for (const t of todo) counts.set(t.file, (counts.get(t.file) ?? 0) + 1);
  return {
    total: todo.length,
    byFile: [...counts].map(([file, count]) => ({ file, count })),
  };
}

export interface CitationSummary {
  /** Distinct page/file URLs cited by content entries. */
  urls: number;
  /** Distinct sites (host names) those URLs are on, sorted. */
  sites: string[];
  /** Content entries whose sources disagree (`confidence: "conflict"`). */
  conflicts: number;
}

/** What the content entries cite, beyond the main source list in sources.json. */
export function citationSummary(data: ContentData): CitationSummary {
  const urls = new Set<string>();
  let conflicts = 0;
  for (const list of Object.values(asDataFiles(data))) {
    for (const entry of list) {
      for (const s of entry.sources) if (s.startsWith('https://')) urls.add(s);
      if ('confidence' in entry && entry.confidence === 'conflict') conflicts++;
    }
  }
  const sites = new Set([...urls].map((u) => new URL(u).hostname.replace(/^www\./, '')));
  return { urls: urls.size, sites: [...sites].sort(), conflicts };
}
