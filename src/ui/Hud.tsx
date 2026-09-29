import { useState, type SubmitEvent } from 'react';
import { useMeta } from '../data/use-meta';
import { RENDER } from '../render/render-config';
import { useAppStore } from '../state/app-store';
import { useCameraStore } from '../state/camera-store';
import { useRenderStore } from '../state/render-store';
import { LAYERS, MODES, type Layer } from '../state/url-state';
import { useWorldStore, type WorldStatus } from '../state/world-store';
import { StatsOverlay } from './StatsOverlay';

const LAYER_LABELS: Record<Layer, string> = {
  biomes: 'Biomes',
  locations: 'Locations',
  rings: 'Distance rings',
};

function describeStatus(status: WorldStatus): string {
  switch (status.kind) {
    case 'idle':
      return 'No seed yet: enter one to generate';
    case 'generating':
      return `Generating… ${Math.round(status.progress * 100)}%`;
    case 'ready':
      return `World ready: ${status.world.locations.length} locations${
        status.fromCache ? ' (cached)' : ''
      }`;
    case 'error':
      return `Generation failed: ${status.message}`;
  }
}

export function Hud() {
  const { seed, mode, layer, setSeed, setMode, setLayer } = useAppStore((s) => s);
  const status = useWorldStore((s) => s.status);
  const meta = useMeta();
  const exaggeration = useRenderStore((s) => s.exaggeration);
  const showProps = useRenderStore((s) => s.showProps);
  const showStats = useRenderStore((s) => s.showStats);
  const { setExaggeration, setShowProps, setShowStats } = useRenderStore.getState();
  const [draft, setDraft] = useState(seed);
  const [prevSeed, setPrevSeed] = useState(seed);
  if (seed !== prevSeed) {
    // Keep the input in sync when the seed changes externally (back/forward navigation).
    setPrevSeed(seed);
    setDraft(seed);
  }

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSeed(draft);
  };

  return (
    <div className="hud">
      <header className="hud-panel hud-top">
        <h1 className="hud-title">Valheim Atlas</h1>
        {status.kind === 'ready' && status.world.isApproximation ? (
          <span
            className="hud-badge"
            title="This world follows Valheim's published layout rules but is not the real world for this seed."
          >
            Approximation
          </span>
        ) : null}
        <a className="hud-link" href={`debug.html${window.location.search}`}>
          Biome map (debug)
        </a>
      </header>

      <section className="hud-panel hud-controls" aria-label="Map controls">
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

        <div className="hud-row">
          <label htmlFor="layer-select">Layer</label>
          <select
            id="layer-select"
            value={layer}
            onChange={(e) => {
              const next = LAYERS.find((l) => l === e.target.value);
              if (next) setLayer(next);
            }}
          >
            {LAYERS.map((l) => (
              <option key={l} value={l}>
                {LAYER_LABELS[l]}
              </option>
            ))}
          </select>
        </div>

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
          <button
            type="button"
            onClick={() => {
              useCameraStore.getState().overview();
            }}
          >
            Reset view
          </button>
        </div>
        <p className="hud-hint">
          Drag to orbit · scroll to zoom · right-drag to pan · double-click to focus
        </p>

        <p className="hud-status" aria-live="polite">
          {describeStatus(status)}
        </p>
      </section>

      {showStats ? <StatsOverlay /> : null}

      <footer className="hud-panel hud-footer">
        <span>
          {meta.status === 'ready'
            ? `Target game version ${meta.meta.targetGameVersion}`
            : meta.status === 'loading'
              ? 'Loading data…'
              : 'Data failed to load'}
        </span>
        <span>Fan-made; not affiliated with Iron Gate or Coffee Stain.</span>
      </footer>
    </div>
  );
}
