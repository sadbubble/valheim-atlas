import { frameStats } from './frame-stats';

/** Camera view in game coordinates (x = east, z = north). */
export interface AtlasView {
  x: number;
  z: number;
  distanceM: number;
  /** Angle from straight down (0) toward the horizon, radians. */
  polar: number;
  /** 0 = looking north from the south. */
  azimuth: number;
}

export interface AtlasDebug {
  /** True once a world is rendered. */
  ready: boolean;
  getView(): AtlasView | null;
  setView(view: AtlasView): void;
  /** Biome id at a game position of the current world (null off the grid or before a world). */
  biomeAt(x: number, z: number): string | null;
  stats: typeof frameStats;
}

declare global {
  interface Window {
    __atlas?: AtlasDebug;
  }
}

/** A tiny read/drive hook for e2e tests and screenshot scripts. No game data in here. */
export function atlasDebug(): AtlasDebug {
  window.__atlas ??= {
    ready: false,
    getView: () => null,
    setView: () => undefined,
    biomeAt: () => null,
    stats: frameStats,
  };
  return window.__atlas;
}
