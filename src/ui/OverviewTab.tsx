import type { IndexedEntry } from '../data/content-index';
import type { LocationCategory } from '../data/schema';
import { useContentStore } from '../state/content-store';
import { EntityLink } from './EntityLink';
import { FactTable, type FactRow } from './FactTable';
import { damageText, num, percent, yesNo } from './fact-format';
import { IdList } from './IdList';
import { CategoryGlossary } from './CategoryGlossary';
import { RecipeView } from './RecipeView';
import { SourceList } from './SourceList';

/** A placement limit: omitted means "no limit" (CLAUDE.md rule 3), null stays unverified. */
const limit = (v: number | null | undefined) => (v === undefined ? 'no limit' : num(v, ' m'));

function rowsFor(
  hit: IndexedEntry,
  biomeName: (id: string) => string,
  categoryName: (c: LocationCategory) => string,
): FactRow[] {
  const e = hit.entry;
  const common: FactRow[] = [
    { key: 'tier', label: 'Tier', value: e.tier === 0 ? 'Any' : String(e.tier) },
    { key: 'dangerLevel', label: 'Danger', value: e.dangerLevel },
    {
      key: 'biomeIds',
      label: 'Biomes',
      value: e.biomeIds.length > 0 ? e.biomeIds.map(biomeName).join(', ') : undefined,
    },
  ];
  switch (hit.kind) {
    case 'biome': {
      const b = hit.entry;
      return [
        { key: 'tier', label: 'Tier', value: b.tier === 0 ? 'Any' : String(b.tier) },
        { key: 'dangerLevel', label: 'Danger', value: b.dangerLevel },
        {
          key: 'recommendedGearTier',
          label: 'Recommended gear tier',
          value: num(b.recommendedGearTier),
        },
        { key: 'weather', label: 'Weather', value: b.weather.join(', ') || undefined },
        {
          key: 'bossId',
          label: 'Boss',
          value: b.bossId ? <EntityLink id={b.bossId} /> : undefined,
        },
        {
          key: 'whatToBring',
          label: 'What to bring',
          value: <IdList items={b.whatToBring.map((id) => ({ id }))} />,
        },
      ];
    }
    case 'boss': {
      const b = hit.entry;
      return [
        ...common,
        { key: 'order', label: 'Boss order', value: String(b.order) },
        { key: 'health', label: 'Health', value: num(b.health) },
        { key: 'altarLocationId', label: 'Altar', value: <EntityLink id={b.altarLocationId} /> },
        {
          key: 'summonItems',
          label: 'Summon with',
          value: <IdList items={b.summonItems.map((s) => ({ id: s.itemId, count: s.count }))} />,
        },
        {
          key: 'forsakenPower',
          label: 'Forsaken power',
          value: b.forsakenPower ? (
            <span>
              {b.forsakenPower.effect}{' '}
              <span className="muted">
                (lasts {num(b.forsakenPower.durationS, ' s') ?? 'unverified'}, cooldown{' '}
                {num(b.forsakenPower.cooldownS, ' s') ?? 'unverified'})
              </span>
            </span>
          ) : undefined,
        },
      ];
    }
    case 'creature': {
      const c = hit.entry;
      return [
        ...common,
        { key: 'behaviour', label: 'Behaviour', value: c.behaviour },
        { key: 'health', label: 'Health', value: num(c.health) },
        { key: 'tameable', label: 'Tameable', value: yesNo(c.tameable) },
      ];
    }
    case 'resource': {
      const r = hit.entry;
      return [
        ...common,
        { key: 'howToGet', label: 'How to get', value: r.howToGet },
        { key: 'weight', label: 'Weight', value: num(r.weight) },
        { key: 'stackSize', label: 'Stack size', value: num(r.stackSize) },
        { key: 'teleportable', label: 'Teleportable', value: yesNo(r.teleportable) },
      ];
    }
    case 'item': {
      const i = hit.entry;
      return [
        ...common,
        { key: 'category', label: 'Type', value: `${i.category} · ${i.subcategory}` },
        { key: 'damage', label: 'Damage', value: damageText(i.damage) },
        { key: 'damagePerLevel', label: 'Per upgrade', value: damageText(i.damagePerLevel) },
        { key: 'armor', label: 'Armor', value: num(i.armor) },
        { key: 'armorPerLevel', label: 'Armor per upgrade', value: num(i.armorPerLevel) },
        { key: 'blockPower', label: 'Block power', value: num(i.blockPower) },
        { key: 'weight', label: 'Weight', value: num(i.weight) },
        { key: 'maxQuality', label: 'Max quality', value: num(i.maxQuality) },
        { key: 'recipe', label: 'Recipe', value: <RecipeView recipe={i.recipe} /> },
      ];
    }
    case 'food': {
      const f = hit.entry;
      return [
        ...common,
        { key: 'health', label: 'Health', value: num(f.health) },
        { key: 'stamina', label: 'Stamina', value: num(f.stamina) },
        { key: 'eitr', label: 'Eitr', value: num(f.eitr) },
        { key: 'durationS', label: 'Duration', value: num(f.durationS, ' s') },
        { key: 'healPerTick', label: 'Healing per tick', value: num(f.healPerTick) },
        { key: 'recipe', label: 'Recipe', value: <RecipeView recipe={f.recipe} /> },
      ];
    }
    case 'station': {
      const s = hit.entry;
      return [
        ...common,
        { key: 'recipe', label: 'Build cost', value: <RecipeView recipe={s.recipe} /> },
        {
          key: 'upgrades',
          label: 'Upgrades',
          value: s.upgrades.length > 0 ? s.upgrades.map((u) => u.name).join(', ') : undefined,
        },
      ];
    }
    case 'location': {
      const l = hit.entry;
      return [
        ...common,
        { key: 'category', label: 'Kind', value: categoryName(l.category) },
        { key: 'quantity', label: 'Placement attempts per world', value: num(l.quantity) },
        { key: 'prioritized', label: 'Placed before other places', value: yesNo(l.prioritized) },
        { key: 'unique', label: 'One per world', value: yesNo(l.unique) },
        { key: 'minDistM', label: 'Min distance from centre', value: limit(l.minDistM) },
        { key: 'maxDistM', label: 'Max distance from centre', value: limit(l.maxDistM) },
        { key: 'minAltM', label: 'Min altitude above sea', value: limit(l.minAltM) },
        { key: 'maxAltM', label: 'Max altitude above sea', value: limit(l.maxAltM) },
        {
          key: 'bossId',
          label: 'Boss',
          value: l.bossId ? <EntityLink id={l.bossId} /> : undefined,
        },
        { key: 'npc', label: 'NPC', value: l.npc },
        {
          key: 'vegvisirChance',
          label: 'Vegvisir chance',
          value:
            l.vegvisirChance === undefined
              ? undefined
              : l.vegvisirChance === null
                ? null
                : percent(l.vegvisirChance),
        },
        { key: 'prefab', label: 'Game prefab', value: l.prefab },
      ];
    }
    case 'progression': {
      const p = hit.entry;
      return [
        { key: 'order', label: 'Step', value: String(p.order) },
        {
          key: 'bossId',
          label: 'Boss',
          value: p.bossId ? <EntityLink id={p.bossId} /> : undefined,
        },
        {
          key: 'goals',
          label: 'Goals',
          value: (
            <ul className="id-list">
              {p.goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          ),
        },
      ];
    }
    case 'tip':
      return common;
  }
}

/** Beginner description, key facts (null → "unverified"), veteran notes and sources. */
export function OverviewTab({ hit, veteran }: { hit: IndexedEntry; veteran: boolean }) {
  const index = useContentStore((s) => s.index);
  const biomeName = (id: string) => {
    const b = index?.byId.get(id);
    return b?.kind === 'biome' ? b.entry.name : id;
  };
  const categoryName = (c: LocationCategory) => index?.categoryInfo(c)?.name ?? c;
  const e = hit.entry;
  return (
    <div className="overview">
      <p className="description">{e.description}</p>
      {hit.kind === 'location' ? <CategoryGlossary category={hit.entry.category} /> : null}
      <FactTable rows={rowsFor(hit, biomeName, categoryName)} entry={e} />
      <details className="veteran" open={veteran}>
        <summary>Veteran notes</summary>
        <p>{e.veteranNotes}</p>
      </details>
      <SourceList
        sources={e.sources}
        gameVersion={e.gameVersion}
        confidence={e.confidence}
        notes={e.notes}
      />
    </div>
  );
}
