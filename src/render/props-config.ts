import type { BiomeId } from '../data/schema';

export const PROP_KINDS = ['conifer', 'broadleaf', 'deadTree', 'rock', 'spire'] as const;
export type PropKind = (typeof PROP_KINDS)[number];

export interface PropRule {
  kind: PropKind;
  /** Probability per heightmap cell. */
  density: number;
  /** Instance tint (our palette), multiplied with the mesh's vertex colours. */
  tint: string;
  scale: [number, number];
  /** Trees avoid steep cells; rocks don't. */
  needsFlat: boolean;
}

/**
 * Stylized scatter per biome. Visual approximation only (not game facts): it gives each
 * biome a recognizable silhouette at close zoom.
 */
export const PROP_RULES: Readonly<Record<BiomeId, readonly PropRule[]>> = {
  meadows: [
    { kind: 'broadleaf', density: 0.045, tint: '#9fd06a', scale: [0.8, 1.3], needsFlat: true },
    { kind: 'conifer', density: 0.01, tint: '#6f9e5a', scale: [0.8, 1.1], needsFlat: true },
    { kind: 'rock', density: 0.008, tint: '#a8a59c', scale: [0.5, 1.2], needsFlat: false },
  ],
  'black-forest': [
    { kind: 'conifer', density: 0.26, tint: '#4d7a4f', scale: [0.9, 1.6], needsFlat: true },
    { kind: 'rock', density: 0.02, tint: '#8a8a86', scale: [0.6, 1.6], needsFlat: false },
  ],
  swamp: [
    { kind: 'deadTree', density: 0.07, tint: '#6d6048', scale: [0.8, 1.4], needsFlat: true },
    { kind: 'broadleaf', density: 0.015, tint: '#6f7a45', scale: [0.8, 1.2], needsFlat: true },
  ],
  mountains: [
    { kind: 'rock', density: 0.05, tint: '#b5b4b8', scale: [0.8, 2.4], needsFlat: false },
    { kind: 'conifer', density: 0.02, tint: '#e4eef2', scale: [0.8, 1.2], needsFlat: true },
  ],
  plains: [
    { kind: 'broadleaf', density: 0.008, tint: '#b7c46a', scale: [0.7, 1.1], needsFlat: true },
    { kind: 'rock', density: 0.01, tint: '#c2b48a', scale: [0.5, 1.4], needsFlat: false },
  ],
  mistlands: [
    { kind: 'spire', density: 0.035, tint: '#6b6782', scale: [0.8, 2.2], needsFlat: false },
    { kind: 'deadTree', density: 0.06, tint: '#4a4458', scale: [1.0, 1.6], needsFlat: true },
  ],
  ashlands: [
    { kind: 'spire', density: 0.03, tint: '#3a2521', scale: [0.8, 2.0], needsFlat: false },
    { kind: 'rock', density: 0.03, tint: '#5a3b30', scale: [0.8, 2.2], needsFlat: false },
    { kind: 'deadTree', density: 0.01, tint: '#2f2420', scale: [0.8, 1.2], needsFlat: true },
  ],
  'deep-north': [
    { kind: 'conifer', density: 0.06, tint: '#eef6fa', scale: [0.8, 1.3], needsFlat: true },
    { kind: 'rock', density: 0.02, tint: '#cfe3ee', scale: [0.8, 2.0], needsFlat: false },
  ],
  ocean: [],
};
