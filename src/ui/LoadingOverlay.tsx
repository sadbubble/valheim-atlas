import { useEffect, useState } from 'react';
import { useReducedMotion } from '../lib/reduced-motion';
import { RENDER } from '../render/render-config';
import { useRenderStore } from '../state/render-store';
import { useWorldStore } from '../state/world-store';
import { LOADING_STEPS, loadingView, type LoadingView } from './loading-model';

/**
 * Centre-screen progress while a world is generated, prepared and its shaders compiled;
 * fades out as the world fades in (both instant under reduced motion). Purely visual: the
 * side panel's status line announces the same progress to screen readers.
 */
export function LoadingOverlay() {
  const status = useWorldStore((s) => s.status);
  const scene = useRenderStore((s) => s.sceneStage);
  const reduced = useReducedMotion();
  const view = loadingView(status, scene);
  const key = view ? `${view.seed}|${view.step}|${view.label}|${view.percent}` : '';
  // Keep the last view on screen while it fades out.
  const [held, setHeld] = useState<{ key: string; view: LoadingView | null }>({ key, view });
  if (view && held.key !== key) setHeld({ key, view });
  const leaving = !view && held.view !== null;
  if (leaving && reduced) setHeld({ key: '', view: null });

  useEffect(() => {
    if (!leaving) return;
    // Fallback in case no transitionend arrives (e.g. the tab is hidden).
    const t = setTimeout(
      () => {
        setHeld({ key: '', view: null });
      },
      RENDER.loading.fadeOutS * 1000 + 200,
    );
    return () => {
      clearTimeout(t);
    };
  }, [leaving]);

  const shown = held.view;
  if (!shown) return null;
  return (
    <div
      className={`loading-overlay${leaving ? ' is-leaving' : ''}`}
      data-testid="loading-overlay"
      aria-hidden="true"
      style={{ transitionDuration: `${RENDER.loading.fadeOutS}s` }}
      onTransitionEnd={() => {
        if (leaving) setHeld({ key: '', view: null });
      }}
    >
      <div className="loading-card">
        <p className="loading-title">Building your world</p>
        <p className="loading-seed">
          Seed <strong>{shown.seed}</strong>
        </p>
        <ol className="loading-steps">
          {LOADING_STEPS.map((label, k) => (
            <li
              key={label}
              className={k < shown.step ? 'is-done' : k === shown.step ? 'is-current' : undefined}
            >
              {k === shown.step ? shown.label : label}
            </li>
          ))}
        </ol>
        <div className="loading-bar">
          <div className="loading-bar-fill" style={{ width: `${shown.percent}%` }} />
        </div>
        <p className="loading-percent">{shown.percent}%</p>
      </div>
    </div>
  );
}
