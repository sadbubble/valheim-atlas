import { useMemo, useState, type KeyboardEvent } from 'react';
import { KIND_LABELS } from '../data/content-index';
import { useContentStore } from '../state/content-store';
import { Icon } from './Icon';
import { openEntry } from './navigate';
import { buildSearchItems, searchVisible, type SearchResult } from './search-model';
import { SpoilerBadge } from './SpoilerBadge';
import { useSpoilerHidden } from './use-spoiler';

export const SEARCH_INPUT_ID = 'atlas-search';

/**
 * Fuzzy search over biomes, locations, bosses, guide steps, creatures and items ("/" to
 * focus). Entries above the spoiler setting are counted, not named (see search-model.ts).
 */
export function SearchBar() {
  const index = useContentStore((s) => s.index);
  const hidden = useSpoilerHidden();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const items = useMemo(() => (index ? buildSearchItems(index) : []), [index]);
  const { shown: results, hiddenCount } = searchVisible(query, items, hidden);
  const showList = open && (results.length > 0 || hiddenCount > 0);

  const choose = (r: SearchResult | undefined) => {
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
        aria-label="Search biomes, creatures, items, locations and guide steps"
        aria-expanded={showList}
        aria-controls="search-results"
        aria-autocomplete="list"
        {...(showList && results.length > 0
          ? { 'aria-activedescendant': `search-opt-${active}` }
          : {})}
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
          {hiddenCount > 0 ? (
            <li
              className="search-hidden-note muted"
              role="option"
              aria-selected={false}
              aria-disabled="true"
            >
              {hiddenCount} more {hiddenCount === 1 ? 'match is' : 'matches are'} hidden by your
              spoiler setting
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
