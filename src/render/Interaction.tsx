import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Raycaster, Vector2, type PerspectiveCamera, type Vector3 } from 'three';
import { KIND_LABELS } from '../data/content-index';
import { appStore } from '../state/app-store';
import { useCameraStore } from '../state/camera-store';
import { useContentStore } from '../state/content-store';
import { useUiStore } from '../state/ui-store';
import { markerRegistry, pickMarker, type PlacedMarker } from './marker-registry';
import type { SharedUniforms } from './materials';
import { highlightFor } from './navigation';
import { pickSurface, sampleHeight } from './pick';
import { RENDER } from './render-config';
import type { TerrainModel } from './terrain-model';

interface ControlsLike {
  enabled: boolean;
  target: Vector3;
}

/**
 * Pointer interaction with the map: hover tooltips, cursor coordinates, clicking markers,
 * placing/dragging pins and measuring. Store updates happen in event/rAF callbacks, never
 * inside useFrame.
 */
export function Interaction({ model, shared }: { model: TerrainModel; shared: SharedUniforms }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as ControlsLike | null;

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    let pending: PointerEvent | null = null;
    let frame = 0;
    let down: { x: number; y: number; button: number } | null = null;
    let dragPin: string | null = null;

    const local = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };
    const surfaceAt = (e: MouseEvent) => {
      const p = local(e);
      ndc.set((p.x / p.w) * 2 - 1, -(p.y / p.h) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const { origin: o, direction: d } = raycaster.ray;
      return pickSurface(
        model.world,
        model.seaLevelM,
        shared.uExag.value,
        [o.x, o.y, -o.z],
        [d.x, d.y, -d.z],
        (camera as PerspectiveCamera).far,
        Math.max(5, o.y / 400),
      );
    };
    const markerAt = (e: MouseEvent): PlacedMarker | null => {
      const p = local(e);
      return pickMarker(markerRegistry.markers, camera, p.x, p.y, p.w, p.h, shared.uExag.value);
    };

    const process = () => {
      frame = 0;
      const e = pending;
      pending = null;
      if (!e) return;
      const ui = useUiStore.getState();
      const hit = surfaceAt(e);
      ui.setCursor(
        hit
          ? {
              x: hit.x,
              z: hit.z,
              heightM: sampleHeight(model.world, hit.x, hit.z) - model.seaLevelM,
            }
          : null,
      );
      if (dragPin) {
        if (hit) appStore.getState().movePin(dragPin, hit.x, hit.z);
        return;
      }
      const m = markerAt(e);
      el.style.cursor = m ? 'pointer' : ui.tool === 'none' ? '' : 'crosshair';
      if (!m) {
        if (ui.hover) ui.setHover(null);
        return;
      }
      if (ui.hover?.key === m.key && ui.hover.screenX === e.clientX) return;
      ui.setHover({
        key: m.key,
        screenX: e.clientX,
        screenY: e.clientY,
        ...describe(m),
      });
    };

    const describe = (m: PlacedMarker): { title: string; subtitle: string } => {
      if (m.hidden) return { title: 'Unknown place', subtitle: 'Hidden by your spoiler setting' };
      if (m.cluster > 1) return { title: m.label, subtitle: 'Click to zoom in' };
      if (m.layer === 'pins') return { title: m.label, subtitle: 'Your pin · drag to move' };
      const kind = useContentStore.getState().index?.byId.get(m.contentId)?.kind;
      return { title: m.label, subtitle: kind ? KIND_LABELS[kind] : m.layer };
    };

    const onMove = (e: PointerEvent) => {
      pending = e;
      if (!frame) frame = requestAnimationFrame(process);
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, button: e.button };
      const m = e.button === 0 ? markerAt(e) : null;
      if (m?.layer === 'pins') {
        dragPin = m.contentId;
        if (controls) controls.enabled = false;
        el.setPointerCapture(e.pointerId);
      }
    };
    const onUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      const moved = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : Infinity;
      if (dragPin) {
        const id = dragPin;
        dragPin = null;
        if (controls) controls.enabled = true;
        if (moved <= RENDER.markers.clickSlopPx) useUiStore.getState().select({ id });
        return;
      }
      if (!start || start.button !== 0 || moved > RENDER.markers.clickSlopPx) return;
      onClick(e);
    };
    const onClick = (e: PointerEvent) => {
      const ui = useUiStore.getState();
      if (ui.tool === 'measure' || ui.tool === 'pin') {
        const hit = surfaceAt(e);
        if (!hit) return;
        if (ui.tool === 'measure') ui.addMeasurePoint(hit);
        else {
          const pin = appStore.getState().addPin(hit.x, hit.z);
          if (pin) ui.select({ id: pin.id });
        }
        return;
      }
      const m = markerAt(e);
      if (!m) return;
      if (m.cluster > 1) {
        const current = controls ? camera.position.distanceTo(controls.target) : 10000;
        useCameraStore
          .getState()
          .focus(m.x, m.z, Math.max(RENDER.camera.minDistanceM * 4, current * 0.45));
        return;
      }
      if (m.layer === 'pins') {
        ui.select({ id: m.contentId });
        return;
      }
      ui.select(
        {
          id: m.contentId,
          ...(m.instanceId ? { instance: { id: m.instanceId, x: m.x, z: m.z } } : {}),
        },
        m.tab ?? 'overview',
      );
      const index = useContentStore.getState().index;
      if (index) ui.setHighlight(highlightFor(index, m.contentId));
    };
    const onLeave = () => {
      pending = null;
      const ui = useUiStore.getState();
      ui.setHover(null);
      ui.setCursor(null);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
      el.style.cursor = '';
    };
  }, [gl, camera, controls, model, shared]);

  return null;
}
