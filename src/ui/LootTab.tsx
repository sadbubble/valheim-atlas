import type { IndexedEntry } from '../data/content-index';
import { useContentStore } from '../state/content-store';
import { IdList } from './IdList';
import { RecipeView } from './RecipeView';
import { WhereToFind } from './WhereToFind';

/** What you get: drops, key resources, recipes and where things come from. */
export function LootTab({ hit }: { hit: IndexedEntry }) {
  const index = useContentStore((s) => s.index);
  switch (hit.kind) {
    case 'biome':
      return (
        <>
          <h4>Key resources</h4>
          <IdList items={hit.entry.keyResources.map((id) => ({ id }))} />
        </>
      );
    case 'creature':
      return (
        <>
          <h4>Drops</h4>
          <IdList items={hit.entry.drops.map((d) => ({ id: d.itemId, chance: d.chance }))} />
        </>
      );
    case 'boss':
      return (
        <>
          <h4>Summon with</h4>
          <IdList items={hit.entry.summonItems.map((s) => ({ id: s.itemId, count: s.count }))} />
          <h4>Drops</h4>
          <IdList items={hit.entry.drops.map((d) => ({ id: d.itemId, chance: d.chance }))} />
        </>
      );
    case 'resource':
      return (
        <>
          <p>{hit.entry.howToGet}</p>
          <WhereToFind biomeIds={hit.entry.biomeIds} />
          <h4>Dropped by</h4>
          <IdList
            items={hit.entry.droppedBy.map((id) => ({ id }))}
            empty="Not dropped by creatures"
          />
          {hit.entry.recipe ? (
            <>
              <h4>Recipe</h4>
              <RecipeView recipe={hit.entry.recipe} />
            </>
          ) : null}
        </>
      );
    case 'item':
    case 'food':
      return (
        <>
          <WhereToFind biomeIds={hit.entry.biomeIds} />
          <h4>Recipe</h4>
          <RecipeView recipe={hit.entry.recipe} />
          <h4>Dropped by</h4>
          <IdList items={(index?.droppedBy(hit.entry.id) ?? []).map((d) => ({ id: d.entry.id }))} />
        </>
      );
    case 'station':
      return (
        <>
          <h4>Build cost</h4>
          <RecipeView recipe={hit.entry.recipe} />
          <h4>Upgrades</h4>
          <ul className="id-list">
            {hit.entry.upgrades.map((u) => (
              <li key={u.id}>
                {u.name}
                {u.recipe ? <RecipeView recipe={u.recipe} /> : null}
              </li>
            ))}
          </ul>
        </>
      );
    case 'location':
      return (
        <>
          {hit.entry.revealsLocationIds && hit.entry.revealsLocationIds.length > 0 ? (
            <>
              <h4>Its Vegvisir can reveal</h4>
              <IdList items={hit.entry.revealsLocationIds.map((id) => ({ id }))} />
            </>
          ) : null}
          <p className="muted">Our data has no loot table for this place yet.</p>
        </>
      );
    case 'progression':
      return (
        <>
          <h4>Key items</h4>
          <IdList items={hit.entry.keyItemIds.map((id) => ({ id }))} />
        </>
      );
    case 'tip':
      return <IdList items={hit.entry.subjectIds.map((id) => ({ id }))} />;
  }
}
