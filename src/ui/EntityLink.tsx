import { useContentStore } from '../state/content-store';
import { openEntry } from './navigate';
import { useSpoilerHidden } from './use-spoiler';

/** A button that opens another entry, or a greyed placeholder if it is a spoiler. */
export function EntityLink({ id, suffix }: { id: string; suffix?: string }) {
  const hit = useContentStore((s) => s.index?.byId.get(id));
  const hidden = useSpoilerHidden();
  if (!hit) return <span className="muted">{id}</span>;
  if (hidden(hit.entry.spoilerLevel, id)) {
    return (
      <span className="entity-hidden" title="Hidden by your spoiler setting">
        Hidden entry
      </span>
    );
  }
  return (
    <button
      type="button"
      className="entity-link"
      onClick={() => {
        openEntry(id);
      }}
    >
      {hit.entry.name}
      {suffix ? <span className="muted"> {suffix}</span> : null}
    </button>
  );
}
