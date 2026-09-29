import { EntityLink } from './EntityLink';

/** Inline, comma-separated entity links (each spoiler-gated by EntityLink). */
export function LinkRun({ ids }: { ids: readonly string[] }) {
  if (ids.length === 0) return <span className="muted">none listed</span>;
  return (
    <span className="link-run">
      {ids.map((id, k) => (
        <span key={id}>
          {k > 0 ? ', ' : null}
          <EntityLink id={id} />
        </span>
      ))}
    </span>
  );
}
