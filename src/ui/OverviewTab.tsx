import type { IndexedEntry } from '../data/content-index';
import { useContentStore } from '../state/content-store';
import { EntityLink } from './EntityLink';
import { FactTable, type FactRow } from './FactTable';
import { damageText, num, percent, yesNo } from './fact-format';
import { IdList } from './IdList';
import { RecipeView } from './RecipeView';

function rowsFor(hit: IndexedEntry, biomeName: (id: string) => string): FactRow[] {
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
        { key: 'category', label: 'Kind', value: l.category },
        { key: 'quantity', label: 'Placement attempts per world', value: num(l.quantity) },
        { key: 'unique', label: 'One per world', value: yesNo(l.unique) },
        { key: 'minDistM', label: 'Min distance from centre', value: num(l.minDistM, ' m') },
        { key: 'maxDistM', label: 'Max distance from centre', value: num(l.maxDistM, ' m') },
        { key: 'minAltM', label: 'Min altitude above sea', value: num(l.minAltM, ' m') },
        { key: 'maxAltM', label: 'Max altitude above sea', value: num(l.maxAltM, ' m') },
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
  const e = hit.entry;
  return (
    <div className="overview">
      <p className="description">{e.description}</p>
      <FactTable rows={rowsFor(hit, biomeName)} entry={e} />
      <details className="veteran" open={veteran}>
        <summary>Veteran notes</summary>
        <p>{e.veteranNotes}</p>
      </details>
      <details className="sources">
        <summary>
          Sources ({e.sources.length}) · game version {e.gameVersion}
          {e.confidence ? ` · ${e.confidence === 'read' ? 'read from source' : e.confidence}` : ''}
        </summary>
        <ul>
          {e.sources.map((s) => (
            <li key={s}>
              {s.startsWith('https://') ? (
                <a href={s} target="_blank" rel="noopener noreferrer">
                  {s.replace(/^https:\/\/(www\.)?/, '').replace(/\/blob\/[0-9a-f]{40}\//, '/…/')}
                </a>
              ) : (
                <span>{s} (see docs/SOURCES.md)</span>
              )}
            </li>
          ))}
        </ul>
        {e.notes ? <p className="muted">{e.notes}</p> : null}
      </details>
    </div>
  );
}
