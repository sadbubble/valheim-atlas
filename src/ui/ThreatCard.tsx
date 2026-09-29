import type { Boss, Creature } from '../data/content-schema';
import { Chips } from './Chips';
import { EntityLink } from './EntityLink';
import { damageText } from './fact-format';
import { Unverified } from './Unverified';
import { useSpoilerHidden } from './use-spoiler';

/** Plain labels for creature behaviour (SPEC N4: flagged hostile or passive). */
const BEHAVIOUR_LABELS: Record<Creature['behaviour'] | 'boss', string> = {
  aggressive: 'Hostile',
  neutral: 'Neutral',
  passive: 'Passive',
  boss: 'Boss',
};

/** A creature or boss with its behaviour, attacks and damage weaknesses/resistances. */
export function ThreatCard({
  entry,
  detailed = false,
}: {
  entry: Creature | Boss;
  detailed?: boolean;
}) {
  const hidden = useSpoilerHidden();
  const behaviour = 'behaviour' in entry ? entry.behaviour : 'boss';
  if (hidden(entry.spoilerLevel, entry.id)) {
    return (
      <div className="threat is-hidden">
        <span className="entity-hidden">Hidden by your spoiler setting</span>
      </div>
    );
  }
  return (
    <div className="threat">
      <div className="threat-head">
        {detailed ? <strong>{entry.name}</strong> : <EntityLink id={entry.id} />}
        <span className={`behaviour behaviour-${behaviour}`}>{BEHAVIOUR_LABELS[behaviour]}</span>
        <span className={`danger danger-${entry.dangerLevel}`}>{entry.dangerLevel}</span>
        <span className="muted">HP {entry.health === null ? <Unverified /> : entry.health}</span>
      </div>
      {entry.damageModifiers === null ? (
        <div>
          Damage modifiers: <Unverified />
        </div>
      ) : (
        <div className="threat-mods">
          <div>
            <span className="label">Weak to</span> <Chips items={entry.weaknesses} tone="weak" />
          </div>
          <div>
            <span className="label">Resists</span> <Chips items={entry.resistances} tone="resist" />
          </div>
          {entry.immunities.length > 0 ? (
            <div>
              <span className="label">Immune</span> <Chips items={entry.immunities} tone="immune" />
            </div>
          ) : null}
        </div>
      )}
      {detailed && entry.attacks.length > 0 ? (
        <ul className="attacks">
          {entry.attacks.map((a, k) => (
            <li key={`${a.name}-${k}`}>
              <span>{a.name}</span>{' '}
              <span className="muted">{damageText(a.damage) ?? 'no damage'}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
