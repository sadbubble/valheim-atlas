import { z } from 'zod';

export const MODES = ['newcomer', 'veteran'] as const;
export const LAYERS = ['biomes', 'locations', 'rings'] as const;

export type Mode = (typeof MODES)[number];
export type Layer = (typeof LAYERS)[number];

export interface UrlState {
  seed: string;
  mode: Mode;
  layer: Layer;
}

/** Upper bound on seed length accepted from the URL; a sanity limit, not a game rule. */
export const MAX_SEED_LENGTH = 64;

/** The world shown when no seed is given (an arbitrary example seed, not a game fact). */
export const DEFAULT_SEED = 'HelloWorld';

export const DEFAULT_URL_STATE: Readonly<UrlState> = {
  seed: DEFAULT_SEED,
  mode: 'newcomer',
  layer: 'biomes',
};

const seedSchema = z.string().trim().max(MAX_SEED_LENGTH);
const modeSchema = z.enum(MODES);
const layerSchema = z.enum(LAYERS);

/**
 * Reads `?seed=&mode=&layer=` from a query string. Missing or invalid values fall back to
 * defaults, so a hand-edited URL never breaks the app.
 */
export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const pick = <T>(schema: z.ZodType<T>, key: keyof UrlState, fallback: T): T => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : fallback;
  };
  return {
    seed: pick(seedSchema, 'seed', DEFAULT_URL_STATE.seed),
    mode: pick(modeSchema, 'mode', DEFAULT_URL_STATE.mode),
    layer: pick(layerSchema, 'layer', DEFAULT_URL_STATE.layer),
  };
}

/**
 * Writes the state into a query string (with leading `?`, or `''` when everything is
 * default). Default values are omitted to keep shared URLs short. Unrelated params in
 * `base` are preserved.
 */
export function toSearch(state: UrlState, base = ''): string {
  const params = new URLSearchParams(base);
  for (const key of ['seed', 'mode', 'layer'] as const) {
    if (state[key] === DEFAULT_URL_STATE[key]) params.delete(key);
    else params.set(key, state[key]);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
