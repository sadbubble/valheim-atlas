import {
  AdditiveBlending,
  BackSide,
  Color,
  DataTexture,
  DoubleSide,
  FrontSide,
  RedFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector3,
  type IUniform,
  type Texture,
} from 'three';
import { SCENE_COLORS } from './palette';
import { RENDER } from './render-config';
import { PROP_FRAGMENT, PROP_VERTEX } from './shaders/props';
import { TERRAIN_FRAGMENT, TERRAIN_VERTEX } from './shaders/terrain';
import { WATER_FRAGMENT, WATER_VERTEX } from './shaders/water';
import {
  GLOW_VERTEX,
  HALO_FRAGMENT,
  RIM_FRAGMENT,
  RIM_VERTEX,
  SKY_FRAGMENT,
  SKY_VERTEX,
  STAR_FRAGMENT,
  STAR_VERTEX,
  WALL_FRAGMENT,
} from './shaders/environment';

/** Uniforms shared by every world material, updated once per frame. */
export interface SharedUniforms {
  [name: string]: IUniform;
  uTime: IUniform<number>;
  uExag: IUniform<number>;
  uExtent: IUniform<number>;
  uSunDir: IUniform<Vector3>;
  uSunColor: IUniform<Color>;
  uSkyAmbient: IUniform<Color>;
  uGroundAmbient: IUniform<Color>;
  uFogColor: IUniform<Color>;
  /** Aerial perspective: haze starts uFogStart metres out, then thickens with uFogDensity. */
  uFogDensity: IUniform<number>;
  uFogStart: IUniform<number>;
  uFogMax: IUniform<number>;
  /** World fade-in, 0 (only space) → 1 (fully shown); see WorldScene. */
  uReveal: IUniform<number>;
  uSpace: IUniform<Color>;
  uEdgeGlow: IUniform<Color>;
  uWorldRadius: IUniform<number>;
  uWaterEdge: IUniform<number>;
  uGrid: IUniform<number>;
  uGridSpacing: IUniform<number>;
  /** R8 soft mask of the highlighted biomes (render/highlight-mask.ts), linear filtering. */
  uHighlightMask: IUniform<Texture>;
  uHighlightOn: IUniform<number>;
}

/** A 1 × 1 empty mask: "nothing highlighted" (location-only highlights dim every biome). */
export function createEmptyMask(): DataTexture {
  const tex = new DataTexture(new Uint8Array(1), 1, 1, RedFormat, UnsignedByteType);
  tex.needsUpdate = true;
  return tex;
}

export interface WorldDims {
  extentM: number;
  worldRadiusM: number;
  waterEdgeM: number;
  seaLevelM: number;
}

/** Points the shared uniforms at a new world's dimensions. */
export function setWorldDims(shared: SharedUniforms, dims: Omit<WorldDims, 'seaLevelM'>): void {
  shared.uExtent.value = dims.extentM;
  shared.uWorldRadius.value = dims.worldRadiusM;
  shared.uWaterEdge.value = dims.waterEdgeM;
}

export function createSharedUniforms(dims: WorldDims): SharedUniforms {
  return {
    uTime: { value: 0 },
    uExag: { value: RENDER.exaggeration.default },
    uExtent: { value: dims.extentM },
    uSunDir: { value: new Vector3(0.55, 0.62, 0.42).normalize() },
    uSunColor: { value: new Color(SCENE_COLORS.sun) },
    uSkyAmbient: { value: new Color(SCENE_COLORS.skyAmbient) },
    uGroundAmbient: { value: new Color(SCENE_COLORS.groundAmbient) },
    uFogColor: { value: new Color(SCENE_COLORS.fog) },
    uFogDensity: { value: 1 / 70000 },
    uFogStart: { value: 0 },
    uFogMax: { value: RENDER.atmosphere.fogMax },
    uReveal: { value: 0 },
    uSpace: { value: new Color(SCENE_COLORS.space) },
    uEdgeGlow: { value: new Color(SCENE_COLORS.edgeGlow) },
    uWorldRadius: { value: dims.worldRadiusM },
    uWaterEdge: { value: dims.waterEdgeM },
    uGrid: { value: 0 },
    uGridSpacing: { value: RENDER.overlay.gridSpacingM },
    uHighlightMask: { value: createEmptyMask() },
    uHighlightOn: { value: 0 },
  };
}

export function createTerrainMaterial(
  shared: SharedUniforms,
  color: Texture,
  weights: Texture,
  snowLineM: number,
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: TERRAIN_VERTEX,
    fragmentShader: TERRAIN_FRAGMENT,
    side: FrontSide,
    uniforms: {
      ...shared,
      uColor: { value: color },
      uWeights: { value: weights },
      uHighlightColor: { value: new Color(SCENE_COLORS.highlight) },
      uSnowLine: { value: snowLineM },
      uRock: { value: new Color(SCENE_COLORS.rock) },
      uSnow: { value: new Color(SCENE_COLORS.snow) },
      uSand: { value: new Color(SCENE_COLORS.sand) },
      uAsh: { value: new Color(SCENE_COLORS.ash) },
      uLava: { value: new Color(SCENE_COLORS.lava) },
      uMist: { value: new Color(SCENE_COLORS.mist) },
    },
  });
}

export function createWaterMaterial(
  shared: SharedUniforms,
  height: Texture,
  seaLevelM: number,
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    // Pull water slightly toward the camera so it wins against terrain lying right at
    // sea level instead of z-fighting with it.
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    uniforms: {
      ...shared,
      uHeight: { value: height },
      uSeaLevel: { value: seaLevelM },
      uShallow: { value: new Color(SCENE_COLORS.waterShallow) },
      uDeep: { value: new Color(SCENE_COLORS.waterDeep) },
      uFoam: { value: new Color(SCENE_COLORS.foam) },
    },
  });
}

export function createRimMaterial(shared: SharedUniforms, depthM: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: RIM_VERTEX,
    fragmentShader: RIM_FRAGMENT,
    side: DoubleSide,
    uniforms: {
      uTime: shared.uTime,
      uReveal: shared.uReveal,
      uSpace: shared.uSpace,
      uTop: { value: new Color(SCENE_COLORS.crustTop) },
      uBottom: { value: new Color(SCENE_COLORS.crustBottom) },
      uGlow: { value: new Color(SCENE_COLORS.edgeGlow) },
      uDepth: { value: depthM },
    },
  });
}

export function createHaloMaterial(
  shared: SharedUniforms,
  inner: number,
  outer: number,
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    // Additive, so draw order doesn't matter: one pass instead of
    // three's default back-then-front passes for transparent double-sided materials.
    forceSinglePass: true,
    uniforms: {
      uGlow: { value: new Color(SCENE_COLORS.edgeGlow) },
      uInner: { value: inner },
      uOuter: { value: outer },
      uStrength: { value: 0.55 },
      uReveal: shared.uReveal,
    },
  });
}

export function createGlowWallMaterial(shared: SharedUniforms, heightM: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: WALL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    // Additive, so draw order doesn't matter: one pass instead of
    // three's default back-then-front passes for transparent double-sided materials.
    forceSinglePass: true,
    uniforms: {
      uGlow: { value: new Color(SCENE_COLORS.edgeGlow) },
      uHeight: { value: heightM },
      uStrength: { value: 0.35 },
      uReveal: shared.uReveal,
    },
  });
}

export function createStarMaterial(shared: SharedUniforms): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    // Opaque queue + renderOrder -100 draws stars first; no depth, so everything covers them.
    transparent: false,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: shared.uTime,
      uRadius: { value: 1000 },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color(SCENE_COLORS.star) },
    },
  });
}

export function createPropMaterial(shared: SharedUniforms, maxDistM: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: PROP_VERTEX,
    fragmentShader: PROP_FRAGMENT,
    vertexColors: true,
    side: DoubleSide,
    uniforms: { ...shared, uMaxDist: { value: maxDistM } },
  });
}

/**
 * Background sky on a camera-centred sphere: space above, a faint band of light at the
 * horizon (our own look), so distant hazy terrain melts into it instead of hitting black.
 */
export function createSkyMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uRadius: { value: 1000 },
      uSpace: { value: new Color(SCENE_COLORS.space) },
      uHorizon: { value: new Color(SCENE_COLORS.horizon) },
      uBandLow: { value: RENDER.atmosphere.horizonBand[0] },
      uBandHigh: { value: RENDER.atmosphere.horizonBand[1] },
      uStrength: { value: RENDER.atmosphere.horizonStrength },
    },
  });
}
