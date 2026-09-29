import { describe, expect, it } from 'vitest';
import { labelCovered } from './label-occlusion';
import { flightShape } from './navigation';
import { RENDER } from './render-config';

describe('labelCovered', () => {
  // One HUD button at x 500–700, y 700–740 in a 1280 × 800 viewport.
  const hud = new Float64Array([500, 700, 700, 740]);
  const at = (cx: number, cy: number) => labelCovered(cx, cy, 100, 24, hud, 1, 1280, 800, 6);

  it('hides a label that overlaps a HUD control, or its margin', () => {
    expect(at(600, 720)).toBe(true);
    expect(at(600, 690)).toBe(true); // bottom edge 702 inside the button
    expect(at(600, 684)).toBe(true); // 4 px above the button: within the 6 px margin
    expect(at(445, 720)).toBe(true); // right edge 495: within the margin
  });

  it('keeps labels that are clear of every control and inside the viewport', () => {
    expect(at(600, 600)).toBe(false);
    expect(at(300, 720)).toBe(false);
    expect(labelCovered(600, 720, 100, 24, hud, 0, 1280, 800, 6)).toBe(false);
  });

  it('hides labels that run off the screen', () => {
    expect(at(30, 400)).toBe(true);
    expect(at(1250, 400)).toBe(true);
    expect(at(600, 5)).toBe(true);
    expect(at(600, 795)).toBe(true);
  });
});

describe('flightShape', () => {
  const C = RENDER.camera;

  it('short hops: base duration, no arc', () => {
    expect(flightShape(0, 2200, 2200)).toEqual({ durationS: C.focusDurationS, arcM: 0 });
    expect(flightShape(C.fly.arcMinTravelM - 1, 2200, 2200).arcM).toBe(0);
  });

  it('long hops rise at mid-flight and take a little longer, within limits', () => {
    const f = flightShape(12000, 2200, 2200);
    expect(f.arcM).toBeGreaterThan(1000);
    expect(f.durationS).toBeGreaterThan(C.focusDurationS);
    expect(f.durationS).toBeLessThanOrEqual(C.fly.maxS);
    expect(flightShape(1e6, 2200, 2200).durationS).toBe(C.fly.maxS);
    // Never past the zoom limit.
    const far = flightShape(1e6, 30000, 30000);
    expect(30000 + far.arcM).toBeLessThanOrEqual(C.maxDistanceM);
  });

  it('no arc when the camera is already far out (e.g. from the overview)', () => {
    expect(flightShape(9000, 22500, 2200).arcM).toBe(0);
  });
});
