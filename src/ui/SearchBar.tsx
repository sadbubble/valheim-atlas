import { useMemo, useState, type KeyboardEvent } from 'react';
import { KIND_LABELS, type ContentKind } from '../data/content-index';
import { fuzzySearch, type Searchable } from '../lib/fuzzy';
import { useContentStore } from '../state/content-store';
import { Icon } from './Icon';
import { openEntry } from './navigate';
import { SpoilerBadge } from './SpoilerBadge';
import { useSpoilerHidden } from './use-spoiler';

export const SEARCH_INPUT_ID = 'atlas-search';

const SEARCH_KINDS: readonly ContentKind[] = [
  'biome',
  'location',
  'boss',
  'creature',
  'item',
  'resource',
  'food',
  'station',
];

interface Result extends Searchable {
  kind: ContentKind;
  spoilerLevel: number;
}

/** Fuzzy search over biomes, locations, bosses, creatures and items ("/" to focus). */
export function SearchBar() {
  const index = useContentStore((s) => s.index);
  const hidden = useSpoilerHidden();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const items = useMemo<Result[]>(() => {
    if (!index) return [];
    const out: Result[] = [];
    for (const [id, hit] of index.byId) {
      if (!SEARCH_KINDS.includes(hit.kind)) continue;
      const e = hit.entry as {
        name: string;
        prefab?: string | null;
        category?: string;
        subcategory?: string;
      };
      out.push({
        id,
        name: e.name,
        keywords: [KIND_LABELS[hit.kind], e.category, e.subcategory, e.prefab]
          .filter(Boolean)
          .join(' '),
        rank: SEARCH_KINDS.indexOf(hit.kind),
        kind: hit.kind,
        spoilerLevel: hit.entry.spoilerLevel,
      });
    }
    return out;
  }, [index]);

  const results = useMemo(
    () => (query.trim() ? fuzzySearch(query, items, 10) : []),
    [query, items],
  );
  const showList = open && results.length > 0;

  const choose = (r: Result | undefined) => {
    if (!r) return;
    openEntry(r.id, { fly: true });
    setQuery('');
    setOpen(false);
    (document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null)?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setQuery('');
      setOpen(false);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="search" role="search">
      <Icon id="search" />
      <input
        id={SEARCH_INPUT_ID}
        type="search"
        role="combobox"
        aria-label="Search biomes, creatures, items and locations"
        aria-expanded={showList}
        aria-controls="search-results"
        aria-autocomplete="list"
        {...(showList ? { 'aria-activedescendant': `search-opt-${active}` } : {})}
        placeholder={index ? 'Search… (press /)' : 'Loading data…'}
        disabled={!index}
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
        }}
        onKeyDown={onKeyDown}
      />
      {showList ? (
        <ul id="search-results" role="listbox" className="search-results hud-panel">
          {results.map((r, k) => {
            const isHidden = hidden(r.spoilerLevel, r.id);
            return (
              <li
                key={r.id}
                id={`search-opt-${k}`}
                role="option"
                aria-selected={k === active}
                className={`${k === active ? 'active' : ''}${isHidden ? ' is-hidden' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
                onMouseEnter={() => {
                  setActive(k);
                }}
              >
                <span className="result-name">{r.name}</span>
                <span className="muted">{KIND_LABELS[r.kind]}</span>
                {isHidden ? <SpoilerBadge level={r.spoilerLevel} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
