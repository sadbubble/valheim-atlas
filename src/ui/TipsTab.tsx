import type { IndexedEntry } from '../data/content-index';
import { useContentStore } from '../state/content-store';
import { SpoilerBadge } from './SpoilerBadge';
import { useSpoilerHidden } from './use-spoiler';

export function TipsTab({ hit }: { hit: IndexedEntry }) {
  const index = useContentStore((s) => s.index);
  const hidden = useSpoilerHidden();
  const tips = hit.kind === 'tip' ? [hit.entry] : (index?.tipsFor(hit.entry.id) ?? []);
  if (tips.length === 0) return <p className="muted">No tips for this yet.</p>;
  return (
    <ul className="tips">
      {tips.map((t) => (
        <li key={t.id} className={hidden(t.spoilerLevel, t.id) ? 'is-hidden' : undefined}>
          {hidden(t.spoilerLevel, t.id) ? (
            <span className="entity-hidden">Tip hidden by your spoiler setting</span>
          ) : (
            <>
              <p>{t.description}</p>
              <span className="muted">
                For {t.audience === 'all' ? 'everyone' : `${t.audience}s`} ·{' '}
                <SpoilerBadge level={t.spoilerLevel} />
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
