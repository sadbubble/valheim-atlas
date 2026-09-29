import type { IndexedEntry } from '../data/content-index';
import type { Boss, Creature } from '../data/content-schema';
import { useContentStore } from '../state/content-store';
import { ThreatCard } from './ThreatCard';

/** Dangers: a biome's creatures, a creature's attacks, a location's boss. */
export function ThreatsTab({ hit }: { hit: IndexedEntry }) {
  const index = useContentStore((s) => s.index);
  const fighter = (id: string): Creature | Boss | null => {
    const h = index?.byId.get(id);
    return h?.kind === 'creature' || h?.kind === 'boss' ? h.entry : null;
  };
  const list = (ids: readonly string[]) => {
    const found = ids.map(fighter).filter((x): x is Creature | Boss => x !== null);
    if (found.length === 0) return <p className="muted">No threats recorded.</p>;
    return (
      <div className="threat-list">
        {found.map((c) => (
          <ThreatCard key={c.id} entry={c} />
        ))}
      </div>
    );
  };

  switch (hit.kind) {
    case 'creature':
    case 'boss':
      return <ThreatCard entry={hit.entry} detailed />;
    case 'biome':
      return list(hit.entry.threats);
    case 'location': {
      const biome = hit.entry.biomeIds[0];
      const b = biome ? index?.byId.get(biome) : undefined;
      return (
        <>
          {hit.entry.bossId ? list([hit.entry.bossId]) : null}
          {b?.kind === 'biome' ? (
            <>
              <h4>Creatures of the {b.entry.name}</h4>
              {list(b.entry.threats)}
            </>
          ) : null}
        </>
      );
    }
    default:
      return <p className="muted">This isn&apos;t dangerous by itself.</p>;
  }
}
