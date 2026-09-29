import { useRef, type KeyboardEvent } from 'react';
import { KIND_LABELS } from '../data/content-index';
import { formatCoords } from '../lib/format';
import { highlightFor } from '../render/navigation';
import { useAppStore } from '../state/app-store';
import { useCameraStore } from '../state/camera-store';
import { useContentStore } from '../state/content-store';
import { useUiStore, type InfoTab } from '../state/ui-store';
import { Icon } from './Icon';
import { flyToHighlight } from './navigate';
import { LootTab } from './LootTab';
import { OverviewTab } from './OverviewTab';
import { PinPanel } from './PinPanel';
import { SpoilerBadge } from './SpoilerBadge';
import { ThreatsTab } from './ThreatsTab';
import { TipsTab } from './TipsTab';
import { spoilerLabel, useSpoilerHidden } from './use-spoiler';

const TABS: { id: InfoTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'threats', label: 'Threats' },
  { id: 'loot', label: 'Loot' },
  { id: 'tips', label: 'Tips' },
];

/** Details for the selected map entry, with tabs, spoiler gating and "Fly here". */
export function InfoPanel() {
  const selection = useUiStore((s) => s.selection);
  const tab = useUiStore((s) => s.tab);
  const index = useContentStore((s) => s.index);
  const pins = useAppStore((s) => s.pins);
  const veteran = useAppStore((s) => s.mode === 'veteran');
  const hidden = useSpoilerHidden();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  if (!selection) return null;

  const pin = pins.find((p) => p.id === selection.id);
  if (pin) return <PinPanel pin={pin} />;
  const hit = index?.byId.get(selection.id);
  if (!hit) return null;
  const e = hit.entry;
  const isHidden = hidden(e.spoilerLevel, e.id);

  const onTabKey = (ev: KeyboardEvent<HTMLDivElement>) => {
    const k = TABS.findIndex((t) => t.id === tab);
    const next =
      ev.key === 'ArrowRight'
        ? (k + 1) % TABS.length
        : ev.key === 'ArrowLeft'
          ? (k + TABS.length - 1) % TABS.length
          : ev.key === 'Home'
            ? 0
            : ev.key === 'End'
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    ev.preventDefault();
    const t = TABS[next];
    if (!t) return;
    useUiStore.getState().setTab(t.id);
    tabRefs.current[next]?.focus();
  };

  const fly = () => {
    if (selection.instance) {
      useCameraStore.getState().focus(selection.instance.x, selection.instance.z, 1500);
    } else if (index) {
      flyToHighlight(highlightFor(index, e.id));
    }
  };

  return (
    <section className="info-panel hud-panel" aria-labelledby="info-title" data-testid="info-panel">
      <header className="info-head">
        <span className="kind">{KIND_LABELS[hit.kind]}</span>
        <button
          type="button"
          className="icon-button"
          aria-label="Close panel"
          onClick={() => {
            useUiStore.getState().select(null);
          }}
        >
          <Icon id="close" />
        </button>
      </header>
      <h2 id="info-title" className={isHidden ? 'is-hidden' : undefined}>
        {e.name}
      </h2>
      <div className="row">
        <SpoilerBadge level={e.spoilerLevel} />
        {selection.instance ? (
          <span className="muted">{formatCoords(selection.instance.x, selection.instance.z)}</span>
        ) : null}
        <button type="button" className="fly-button" onClick={fly}>
          <Icon id="fly" /> Fly here
        </button>
      </div>

      {isHidden ? (
        <div className="spoiler-gate">
          <p>
            Details are hidden: this is a {spoilerLabel(e.spoilerLevel).toLowerCase()} and your
            setting shows less.
          </p>
          <button
            type="button"
            onClick={() => {
              useUiStore.getState().reveal(e.id);
            }}
          >
            Show anyway
          </button>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Details" className="tabs" onKeyDown={onTabKey}>
            {TABS.map((t, k) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[k] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="info-tabpanel"
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => {
                  useUiStore.getState().setTab(t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="info-tabpanel"
            aria-labelledby={`tab-${tab}`}
            className="tabpanel"
            tabIndex={0}
          >
            {tab === 'overview' ? <OverviewTab hit={hit} veteran={veteran} /> : null}
            {tab === 'threats' ? <ThreatsTab hit={hit} /> : null}
            {tab === 'loot' ? <LootTab hit={hit} /> : null}
            {tab === 'tips' ? <TipsTab hit={hit} /> : null}
          </div>
        </>
      )}
    </section>
  );
}
