import type { LocationCategory } from '../data/schema';
import { useContentStore } from '../state/content-store';
import { SourceList } from './SourceList';
import { useSpoilerHidden } from './use-spoiler';

/** Plain-language explanation of a location's category (SPEC N7), with its own sources. */
export function CategoryGlossary({ category }: { category: LocationCategory }) {
  const info = useContentStore((s) => s.index?.categoryInfo(category));
  const hidden = useSpoilerHidden();
  if (!info) return null;
  if (hidden(info.spoilerLevel, `category:${info.id}`)) {
    return (
      <p className="glossary entity-hidden">
        What this kind of place is: hidden by your spoiler setting.
      </p>
    );
  }
  const title = `What is a ${info.name.toLowerCase()}?`;
  return (
    <aside className="glossary" aria-label={title} data-testid="category-glossary">
      <strong>{title}</strong>
      <p>{info.description}</p>
      <SourceList sources={info.sources} />
    </aside>
  );
}
