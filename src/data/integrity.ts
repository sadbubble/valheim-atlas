import type { SourceId, SourceRef } from './schema';

/** Returns every cited source ID that is missing from the sources list. */
export function findUnknownSourceIds(
  cited: readonly SourceId[],
  sources: readonly SourceRef[],
): SourceId[] {
  const known = new Set(sources.map((s) => s.id));
  return [...new Set(cited)].filter((id) => !known.has(id));
}

/** Returns IDs that appear more than once in the sources list. */
export function findDuplicateSourceIds(sources: readonly SourceRef[]): SourceId[] {
  const seen = new Set<SourceId>();
  const dupes = new Set<SourceId>();
  for (const { id } of sources) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}
