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
  fog: '#1a2c44',
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
