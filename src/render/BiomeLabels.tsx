import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useAppStore } from '../state/app-store';
import { useContentStore } from '../state/content-store';
import { useMapStore } from '../state/map-store';
import { useRenderStore } from '../state/render-store';
import { useUiStore } from '../state/ui-store';
import { effectiveSpoiler } from '../state/url-state';
import { collectHudRects, labelCovered } from './label-occlusion';
import { sampleHeight } from './pick';
import { RENDER } from './render-config';
import type { TerrainModel } from './terrain-model';

const LABEL_SPACING_M = 1800;
/** Room for this many HUD rects (panels, search, camera buttons…). */
const MAX_HUD_RECTS = 32;

const tmp = new Vector3();

/**
 * Biome name labels (the "biomes" layer); each is a real button, so keyboard reachable.
 * A label that would sit under a HUD control or run off the screen is hidden
 * (visibility: hidden, so it can't be clicked, focused or read out there) until it moves
 * clear again: HUD targets are never partly covered (WCAG 2.2 target size).
 */
export function BiomeLabels({ model }: { model: TerrainModel }) {
  const on = useAppStore((s) => s.layers.includes('biomes'));
  const spoiler = useAppStore(effectiveSpoiler);
  const anchors = useMapStore((s) => s.anchors);
  const index = useContentStore((s) => s.index);
  const exag = useRenderStore((s) => s.exaggeration);
  const shown = useRenderStore((s) => s.sceneStage === 'shown');
  const revealed = useUiStore((s) => s.revealed);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const state = useRef({
    hud: new Float64Array(MAX_HUD_RECTS * 4),
    hudCount: 0,
    viewportW: 0,
    viewportH: 0,
    covered: new Int8Array(64).fill(-1),
    widths: new Float64Array(64),
    heights: new Float64Array(64),
  });

  // HUD layout changes rarely (panels opening, resizes): re-read it a few times a second,
  // outside the render loop, so useFrame only does arithmetic.
  useEffect(() => {
    const s = state.current;
    const refresh = () => {
      s.hudCount = collectHudRects(document, s.hud);
      s.viewportW = document.documentElement.clientWidth;
      s.viewportH = document.documentElement.clientHeight;
    };
    refresh();
    const timer = setInterval(refresh, RENDER.labels.hudRefreshMs);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const visible =
    on && index && shown
      ? anchors.filter((a) => {
          const b = index.byId.get(a.biome);
          // Spoiler-hidden biomes get no label at all rather than a stack of "Unknown" tags.
          const hidden =
            b !== undefined && b.entry.spoilerLevel > spoiler && !revealed.includes(a.biome);
          return b !== undefined && a.biome !== 'ocean' && !hidden;
        })
      : [];
  // Largest regions first; skip labels that would crowd a bigger one.
  const placed: typeof anchors = [];
  for (const a of [...visible].sort((p, q) => q.areaM2 - p.areaM2)) {
    if (placed.every((s) => Math.hypot(s.x - a.x, s.z - a.z) > LABEL_SPACING_M)) placed.push(a);
  }
  const items = placed.flatMap((a) => {
    const biome = index?.byId.get(a.biome);
    if (biome?.kind !== 'biome') return [];
    const yM = Math.max(0, sampleHeight(model.world, a.x, a.z) - model.seaLevelM) * exag + 40;
    return [{ a, yM, name: biome.entry.name, tier: biome.entry.tier }];
  });

  useFrame(({ camera, size }) => {
    const s = state.current;
    const n = Math.min(items.length, s.covered.length);
    for (let k = 0; k < n; k++) {
      const el = buttons.current[k];
      const it = items[k];
      if (!el || !it) continue;
      if (!(s.widths[k] ?? 0)) {
        s.widths[k] = el.offsetWidth;
        s.heights[k] = el.offsetHeight;
      }
      // Scene position: the world group mirrors game z.
      tmp.set(it.a.x, it.yM, -it.a.z).project(camera);
      const behind = tmp.z > 1;
      const cx = size.left + ((tmp.x + 1) / 2) * size.width;
      const cy = size.top + ((1 - tmp.y) / 2) * size.height;
      const covered =
        behind ||
        labelCovered(
          cx,
          cy,
          s.widths[k] ?? 0,
          s.heights[k] ?? 0,
          s.hud,
          s.hudCount,
          s.viewportW || size.width,
          s.viewportH || size.height,
          RENDER.labels.hudMarginPx,
        );
      // Never yank a label away from the keyboard user who is on it.
      const hide = covered && document.activeElement !== el ? 1 : 0;
      if (s.covered[k] !== hide) {
        s.covered[k] = hide;
        el.classList.toggle('is-covered', hide === 1);
        el.setAttribute('aria-hidden', hide ? 'true' : 'false');
      }
    }
  });

  // New label set: forget cached sizes and states.
  const signature = items.map((it) => `${it.a.biome}@${it.a.x},${it.a.z}`).join('|');
  useEffect(() => {
    const s = state.current;
    s.covered.fill(-1);
    s.widths.fill(0);
    s.heights.fill(0);
  }, [signature]);

  return (
    <>
      {items.map((it, k) => (
        <Html
          key={`${it.a.biome}-${it.a.x}-${it.a.z}`}
          position={[it.a.x, it.yM, it.a.z]}
          center
          zIndexRange={[5, 0]}
        >
          <button
            ref={(el) => {
              buttons.current[k] = el;
            }}
            type="button"
            className="biome-label is-covered"
            aria-hidden="true"
            title={it.tier > 0 ? `Tier ${it.tier}` : undefined}
            onClick={() => {
              useUiStore.getState().select({ id: it.a.biome });
            }}
          >
            {it.name}
          </button>
        </Html>
      ))}
    </>
  );
}
