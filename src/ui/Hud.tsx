import { lazy, Suspense, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { useMeta } from '../data/use-meta';
import { RENDER } from '../render/render-config';
import { appStore, useAppStore } from '../state/app-store';
import { useRenderStore } from '../state/render-store';
import { useUiStore, type Drawer } from '../state/ui-store';
import { MODES } from '../state/url-state';
import { useWorldStore, type WorldStatus } from '../state/world-store';
import { IS_APPROXIMATION } from '../world/generator-info';
import { ABOUT_BUTTON_ID, DISCLAIMER } from './about-shared';
import { CameraControls } from './CameraControls';
import { ControlsHint } from './ControlsHint';
import { CoordReadout } from './CoordReadout';
import { ExactMapLink } from './ExactMapLink';
import { FirstRunDialog } from './FirstRunDialog';
import { Icon } from './Icon';
import { InfoPanel } from './InfoPanel';
import { CACHE_STEP_LABEL, LOADING_STEPS } from './loading-model';
import { LayerPanel } from './LayerPanel';
import { ProgressionGuide } from './ProgressionGuide';
import { SearchBar } from './SearchBar';
import { StatsOverlay } from './StatsOverlay';
import { ToolPanel } from './ToolPanel';
import { Tooltip } from './Tooltip';
import { useShortcuts } from './use-shortcuts';

// Not needed for the first paint: loaded when the About view is first opened (SPEC §8).
const AboutDialog = lazy(() => import('./AboutDialog').then((m) => ({ default: m.AboutDialog })));

const SIDE_DRAWER_ID = 'side-drawer';

const DRAWER_TABS: { id: Drawer; label: string }[] = [
  { id: 'map', label: 'Layers & tools' },
  { id: 'guide', label: 'Progression guide' },
];

function describeStatus(status: WorldStatus): string {
  switch (status.kind) {
    case 'idle':
      return 'No seed yet: enter one to generate';
    case 'generating':
      return status.stage === 'cache'
        ? `${CACHE_STEP_LABEL}…`
        : `${LOADING_STEPS[status.stage === 'locations' ? 1 : 0]}… ${Math.round(status.progress * 100)}%`;
    case 'preparing':
      return `${LOADING_STEPS[2]}…`;
    case 'ready':
      return `World ready: ${status.world.locations.length} locations${status.fromCache ? ' (cached)' : ''}`;
    case 'error':
      return `Generation failed: ${status.message}`;
  }
}

export function Hud() {
  const { seed, mode, setSeed, setMode } = useAppStore((s) => s);
  const aboutOpen = useAppStore((s) => s.about);
  const status = useWorldStore((s) => s.status);
  const drawer = useUiStore((s) => s.drawer);
  const drawerOpen = useUiStore((s) => s.drawerOpen);
  const meta = useMeta();
  const exaggeration = useRenderStore((s) => s.exaggeration);
  const showProps = useRenderStore((s) => s.showProps);
  const showStats = useRenderStore((s) => s.showStats);
  const { setExaggeration, setShowProps, setShowStats } = useRenderStore.getState();
  const [draft, setDraft] = useState(seed);
  const [prevSeed, setPrevSeed] = useState(seed);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useShortcuts();
  if (seed !== prevSeed) {
    // Keep the input in sync when the seed changes externally (back/forward navigation).
    setPrevSeed(seed);
    setDraft(seed);
  }

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSeed(draft);
  };

  const onTabKey = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const k = DRAWER_TABS.findIndex((t) => t.id === drawer);
    const next = (k + (ev.key === 'ArrowRight' ? 1 : DRAWER_TABS.length - 1)) % DRAWER_TABS.length;
    const t = DRAWER_TABS[next];
    if (!t) return;
    useUiStore.getState().setDrawer(t.id);
    tabRefs.current[next]?.focus();
  };

  const approximate = status.kind === 'ready' ? status.world.isApproximation : IS_APPROXIMATION;

  return (
    <div className="hud">
      <header className="hud-top">
        <div className="hud-panel hud-brand">
          <h1 className="hud-title">Valheim Atlas</h1>
          {status.kind === 'ready' && status.world.isApproximation ? (
            <span
              className="hud-badge"
              title="This world follows Valheim's published layout rules but is not the real world for this seed."
            >
              Approximation
            </span>
          ) : null}
          {/* Small screens fold the side drawer away; this unfolds it (hidden on desktop). */}
          <button
            type="button"
            className="drawer-toggle"
            aria-expanded={drawerOpen}
            aria-controls={SIDE_DRAWER_ID}
            onClick={() => {
              useUiStore.getState().setDrawerOpen(!drawerOpen);
            }}
          >
            <Icon id={drawerOpen ? 'close' : 'layers'} size={16} />
            {drawerOpen ? 'Hide menu' : 'Menu'}
          </button>
        </div>
        <SearchBar />
      </header>

      <aside
        className="hud-panel hud-side"
        aria-label="Map controls"
        id={SIDE_DRAWER_ID}
        data-open={drawerOpen}
      >
        <form onSubmit={onSubmit} className="hud-row">
          <label htmlFor="seed-input">Seed</label>
          <input
            id="seed-input"
            value={draft}
            maxLength={64}
            placeholder="e.g. MyWorld"
            onChange={(e) => {
              setDraft(e.target.value);
            }}
          />
          <button type="submit">Go</button>
        </form>
        {approximate ? <ExactMapLink /> : null}

        <div className="hud-row" role="radiogroup" aria-label="Mode">
          <span>Mode</span>
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={mode === m ? 'active' : undefined}
              onClick={() => {
                setMode(m);
              }}
            >
              {m === 'newcomer' ? 'Newcomer' : 'Veteran'}
            </button>
          ))}
        </div>
        <p className="hud-status" aria-live="polite">
          {describeStatus(status)}
        </p>

        <div role="tablist" aria-label="Side panel" className="tabs" onKeyDown={onTabKey}>
          {DRAWER_TABS.map((t, k) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[k] = el;
              }}
              type="button"
              role="tab"
              id={`drawer-tab-${t.id}`}
              aria-selected={drawer === t.id}
              aria-controls={`drawer-panel-${t.id}`}
              tabIndex={drawer === t.id ? 0 : -1}
              onClick={() => {
                useUiStore.getState().setDrawer(t.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {drawer === 'map' ? (
          <div
            role="tabpanel"
            id="drawer-panel-map"
            aria-labelledby="drawer-tab-map"
            className="drawer-panel"
          >
            <div className="hud-row">
              <label htmlFor="exag-input">Relief</label>
              <input
                id="exag-input"
                type="range"
                min={RENDER.exaggeration.min}
                max={RENDER.exaggeration.max}
                step={RENDER.exaggeration.step}
                value={exaggeration}
                onChange={(e) => {
                  setExaggeration(Number(e.target.value));
                }}
              />
              <span className="hud-value">{exaggeration.toFixed(1)}×</span>
            </div>

            <div className="hud-row">
              <label className="hud-check">
                <input
                  type="checkbox"
                  checked={showProps}
                  onChange={(e) => {
                    setShowProps(e.target.checked);
                  }}
                />
                Trees &amp; rocks
              </label>
              <label className="hud-check">
                <input
                  type="checkbox"
                  checked={showStats}
                  onChange={(e) => {
                    setShowStats(e.target.checked);
                  }}
                />
                FPS
              </label>
            </div>

            <LayerPanel />
            <ToolPanel />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="drawer-panel-guide"
            aria-labelledby="drawer-tab-guide"
            className="drawer-panel"
          >
            <ProgressionGuide />
          </div>
        )}
      </aside>

      <section className="hud-center" aria-label="Camera">
        <ControlsHint />
        <CameraControls />
      </section>

      <InfoPanel />
      <Tooltip />
      {showStats ? <StatsOverlay /> : null}

      <footer className="hud-panel hud-footer">
        <CoordReadout />
        <span>
          {meta.status === 'ready'
            ? `Target game version ${meta.meta.targetGameVersion}`
            : meta.status === 'loading'
              ? 'Loading data…'
              : 'Data failed to load'}
        </span>
        <span className="disclaimer" data-testid="disclaimer">
          {DISCLAIMER}
        </span>
        <button
          type="button"
          id={ABOUT_BUTTON_ID}
          className="about-button"
          aria-haspopup="dialog"
          onClick={() => {
            appStore.getState().setAbout(true);
          }}
        >
          About &amp; sources
        </button>
      </footer>
      <FirstRunDialog />
      {aboutOpen ? (
        <Suspense fallback={null}>
          <AboutDialog
            onClose={() => {
              appStore.getState().setAbout(false);
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
