/**
 * Small fuzzy matcher for the search bar: exact > prefix > word prefix > substring >
 * in-order subsequence (fewer, shorter gaps score higher). Returns null for no match.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = normalize(query);
  const t = normalize(text);
  if (q === '') return null;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 800 - Math.min(100, t.length - q.length);
  const words = t.split(/[^a-z0-9]+/);
  if (words.some((w) => w.startsWith(q))) return 600 - Math.min(100, t.length - q.length);
  const at = t.indexOf(q);
  if (at >= 0) return 400 - Math.min(100, at);
  // Subsequence with gap penalty.
  let score = 200;
  let ti = 0;
  let lastMatch = -1;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return null;
    if (lastMatch >= 0) score -= Math.min(20, found - lastMatch - 1) * 3;
    lastMatch = found;
    ti = found + 1;
  }
  return score > 0 ? score : 1;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .trim();
}

export interface Searchable {
  id: string;
  name: string;
  /** Extra text that can match with a lower weight (e.g. category, prefab). */
  keywords?: string;
  /** Lower = preferred on ties. */
  rank?: number;
}

export function fuzzySearch<T extends Searchable>(
  query: string,
  items: readonly T[],
  limit = 12,
): T[] {
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const name = fuzzyScore(query, item.name);
    const kw = item.keywords ? fuzzyScore(query, item.keywords) : null;
    const best = Math.max(name ?? -1, kw === null ? -1 : kw * 0.5);
    if (best > 0) scored.push({ item, score: best - (item.rank ?? 0) * 0.5 });
  }
  scored.sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length);
  return scored.slice(0, limit).map((s) => s.item);
}
