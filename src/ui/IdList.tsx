import { EntityLink } from './EntityLink';
import { percent } from './fact-format';
import { Unverified } from './Unverified';

/** A list of linked entries with optional counts or drop chances (null → unverified). */
export function IdList({
  items,
  empty = 'none recorded',
}: {
  items: readonly { id: string; count?: number | null; chance?: number | null }[];
  empty?: string;
}) {
  if (items.length === 0) return <span className="muted">{empty}</span>;
  return (
    <ul className="id-list">
      {items.map((it, k) => (
        <li key={`${it.id}-${k}`}>
          {it.count !== undefined ? (
            <>{it.count === null ? <Unverified /> : `${it.count} ×`} </>
          ) : null}
          <EntityLink id={it.id} />
          {it.chance !== undefined ? (
            <>
              {' '}
              {it.chance === null ? (
                <Unverified />
              ) : (
                <span className="muted">({percent(it.chance)})</span>
              )}
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
