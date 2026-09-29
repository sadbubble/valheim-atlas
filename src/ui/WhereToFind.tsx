import { IdList } from './IdList';

/**
 * Where a resource or item comes from (SPEC N5): its biomes, and an honest "unknown" for
 * locations because our data has no sourced loot tables for places yet.
 */
export function WhereToFind({ biomeIds }: { biomeIds: readonly string[] }) {
  return (
    <>
      <h4>Found in biomes</h4>
      <IdList items={biomeIds.map((id) => ({ id }))} empty="not tied to a biome" />
      <h4>Found in locations</h4>
      <p>
        <span
          className="unverified"
          title="No sourced loot tables for locations yet, so we don't guess."
        >
          unknown
        </span>{' '}
        <span className="muted">Our data has no sourced loot tables for places yet.</span>
      </p>
    </>
  );
}
