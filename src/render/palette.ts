import type { BiomeId } from '../data/schema';

/**
 * Our own stylized palette for the 3D view (CLAUDE.md rule 1: original palette only).
 * Colours are linear-ish sRGB hex strings; three.js converts them.
 */
export const GROUND_COLORS: Readonly<Record<BiomeId, string>> = {
  meadows: '#7fa653',
  'black-forest': '#35573a',
  swamp: '#5c5a3b',
  mountains: '#8e9198',
  plains: '#c7b765',
  mistlands: '#4a4860',
  ashlands: '#4e2a22',
  'deep-north': '#cfdde6',
  ocean: '#9a8c67',
};

export const SCENE_COLORS = {
  space: '#050912',
  /** Aerial-perspective haze; close to the horizon band so far terrain melts into it. */
  fog: '#7f9cba',
  horizon: '#46648a',
  highlight: '#ffd166',
  sun: '#fff1d6',
  skyAmbient: '#9cc3e6',
  groundAmbient: '#3a3326',
  rock: '#77757a',
  snow: '#f4f8fb',
  sand: '#d8c890',
  ash: '#2d2522',
  lava: '#ff6a1f',
  mist: '#2e2a45',
  edgeGlow: '#7fd4ff',
  waterShallow: '#3fb0b8',
  waterDeep: '#0f2f5a',
  foam: '#e8f6fb',
  crustTop: '#3b2f28',
  crustBottom: '#0d0b10',
  star: '#dfe9ff',
} as const;

/** Marker badge colour per map layer (our palette). */
export const LAYER_COLORS = {
  biomes: '#9fb3c0',
  bosses: '#d8453a',
  dungeons: '#8a5cc7',
  npcs: '#e0b43c',
  vegvisirs: '#3cb8d8',
  villages: '#9a6b3f',
  landmarks: '#7d8a7a',
  creatures: '#c7643c',
  resources: '#4fae6e',
  grid: '#dfe9ff',
  pins: '#ef6f9d',
} as const;

export const MARKER_COLORS = {
  glyph: '#ffffff',
  ring: '#f5e6c8',
  selected: '#ffd166',
  highlight: '#ffd166',
  hidden: '#5b6470',
} as const;
