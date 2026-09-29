import { z } from 'zod';

export const MODES = ['newcomer', 'veteran'] as const;
/** Map layers the user can toggle. */
export const LAYERS = [
  'biomes',
  'bosses',
  'dungeons',
  'npcs',
  'vegvisirs',
  'villages',
  'landmarks',
  'creatures',
  'resources',
  'grid',
  'pins',
] as const;
export const SPOILER_LEVELS = [0, 1, 2] as const;

export type Mode = (typeof MODES)[number];
export type Layer = (typeof LAYERS)[number];
export type SpoilerLevel = (typeof SPOILER_LEVELS)[number];

export interface Pin {
  id: string;
  /** Game coordinates, metres. */
  x: number;
  z: number;
  label: string;
}

/** Camera view in game coordinates (see render/debug-hooks AtlasView). */
export interface CamView {
  x: number;
  z: number;
  distanceM: number;
  polar: number;
  azimuth: number;
}

export interface UrlState {
  seed: string;
  mode: Mode;
  layers: Layer[];
  /** Highest spoiler level shown; null = the mode's default (see effectiveSpoiler). */
  spoiler: SpoilerLevel | null;
  pins: Pin[];
  /** Location type ids filtered off the map (per-type filter within a layer; SPEC V2). */
  hide: string[];
  /** Panel to open from a shared link (content or pin id); consumed once on load. */
  sel: string | null;
  /** Initial camera from a shared link; null = overview. */
  cam: CamView | null;
}

/** Upper bound on seed length accepted from the URL; a sanity limit, not a game rule. */
export const MAX_SEED_LENGTH = 64;
export const MAX_PINS = 50;
export const MAX_PIN_LABEL = 40;
/** Sanity limit on hidden location types in a URL (not a game rule). */
export const MAX_HIDDEN_TYPES = 200;

/** The world shown when no seed is given (an arbitrary example seed, not a game fact). */
export const DEFAULT_SEED = 'HelloWorld';
export const DEFAULT_LAYERS: readonly Layer[] = [
  'biomes',
  'bosses',
  'dungeons',
  'npcs',
  'vegvisirs',
  'villages',
  'pins',
];

export const DEFAULT_URL_STATE: Readonly<UrlState> = {
  seed: DEFAULT_SEED,
  mode: 'newcomer',
  layers: [...DEFAULT_LAYERS],
  spoiler: null,
  pins: [],
  hide: [],
  sel: null,
  cam: null,
};

/** Newcomers default to spoiler-safe (SPEC F7); veterans see everything. */
export function effectiveSpoiler(state: Pick<UrlState, 'mode' | 'spoiler'>): SpoilerLevel {
  return state.spoiler ?? (state.mode === 'veteran' ? 2 : 0);
}

const seedSchema = z.string().trim().max(MAX_SEED_LENGTH);
const modeSchema = z.enum(MODES);
const layerSchema = z.enum(LAYERS);
const finite = z.coerce.number().refine(Number.isFinite);

function parseLayers(raw: string): Layer[] | null {
  if (raw === '') return [];
  const out: Layer[] = [];
  for (const part of raw.split(',')) {
    const p = layerSchema.safeParse(part);
    if (!p.success) return null;
    if (!out.includes(p.data)) out.push(p.data);
  }
  return out;
}

function parsePins(raw: string): Pin[] | null {
  const pins: Pin[] = [];
  for (const [k, part] of raw.split(';').entries()) {
    if (part === '' || pins.length >= MAX_PINS) continue;
    const [xs, zs, ...rest] = part.split(',');
    const x = finite.safeParse(xs);
    const z = finite.safeParse(zs);
    if (!x.success || !z.success) return null;
    let label = `Pin ${k + 1}`;
    try {
      if (rest.length > 0) label = decodeURIComponent(rest.join(',')).slice(0, MAX_PIN_LABEL);
    } catch {
      return null;
    }
    pins.push({ id: `pin-${k + 1}`, x: x.data, z: z.data, label });
  }
  return pins;
}

const typeIdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

function parseHide(raw: string): string[] | null {
  if (raw === '') return [];
  const out: string[] = [];
  for (const part of raw.split(',')) {
    if (!typeIdSchema.safeParse(part).success) return null;
    if (!out.includes(part)) out.push(part);
  }
  return out.length > MAX_HIDDEN_TYPES ? null : out;
}

function parseCam(raw: string): CamView | null {
  const parts = raw.split(',').map((p) => finite.safeParse(p));
  if (parts.length !== 5 || parts.some((p) => !p.success)) return null;
  const [x, z, d, polar, az] = parts.map((p) => (p.success ? p.data : 0)) as [
    number,
    number,
    number,
    number,
    number,
  ];
  if (d <= 0) return null;
  return { x, z, distanceM: d, polar, azimuth: az };
}

/**
 * Reads `?seed=&mode=&layers=&spoiler=&pins=&hide=&sel=&cam=` from a query string. Missing or invalid
 * values fall back to defaults field by field, so a hand-edited URL never breaks the app.
 */
export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const get = (k: string) => params.get(k);
  const seed = seedSchema.safeParse(get('seed') ?? DEFAULT_URL_STATE.seed);
  const mode = modeSchema.safeParse(get('mode') ?? DEFAULT_URL_STATE.mode);
  const layersRaw = get('layers');
  const spoilerRaw = get('spoiler');
  const pinsRaw = get('pins');
  const hideRaw = get('hide');
  const selRaw = get('sel');
  const camRaw = get('cam');
  const spoilerNum = spoilerRaw === null ? null : Number(spoilerRaw);
  return {
    seed: seed.success ? seed.data : DEFAULT_URL_STATE.seed,
    mode: mode.success ? mode.data : DEFAULT_URL_STATE.mode,
    layers: (layersRaw === null ? null : parseLayers(layersRaw)) ?? [...DEFAULT_LAYERS],
    spoiler:
      spoilerNum === 0 || spoilerNum === 1 || spoilerNum === 2
        ? spoilerNum
        : DEFAULT_URL_STATE.spoiler,
    pins: (pinsRaw === null ? null : parsePins(pinsRaw)) ?? [],
    hide: (hideRaw === null ? null : parseHide(hideRaw)) ?? [],
    sel: selRaw !== null && typeIdSchema.safeParse(selRaw).success ? selRaw : null,
    cam: camRaw === null ? null : parseCam(camRaw),
  };
}

const round = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

export function encodePins(pins: readonly Pin[]): string {
  return pins
    .map((p) => `${Math.round(p.x)},${Math.round(p.z)},${encodeURIComponent(p.label)}`)
    .join(';');
}

export function encodeCam(c: CamView): string {
  return [
    Math.round(c.x),
    Math.round(c.z),
    Math.round(c.distanceM),
    round(c.polar, 3),
    round(c.azimuth, 3),
  ].join(',');
}

const sameLayers = (a: readonly Layer[], b: readonly Layer[]) =>
  a.length === b.length && a.every((l) => b.includes(l));

/**
 * Writes the state into a query string (with leading `?`, or `''` when everything is
 * default). Defaults are omitted to keep shared URLs short; unrelated params in `base`
 * are preserved.
 */
export function toSearch(state: UrlState, base = ''): string {
  const params = new URLSearchParams(base);
  const put = (key: string, value: string | null) => {
    if (value === null) params.delete(key);
    else params.set(key, value);
  };
  put('seed', state.seed === DEFAULT_URL_STATE.seed ? null : state.seed);
  put('mode', state.mode === DEFAULT_URL_STATE.mode ? null : state.mode);
  put('layers', sameLayers(state.layers, DEFAULT_LAYERS) ? null : state.layers.join(','));
  put('spoiler', state.spoiler === null ? null : String(state.spoiler));
  put('pins', state.pins.length === 0 ? null : encodePins(state.pins));
  put('hide', state.hide.length === 0 ? null : state.hide.join(','));
  put('sel', state.sel);
  put('cam', state.cam === null ? null : encodeCam(state.cam));
  params.delete('layer'); // legacy single-layer param
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
