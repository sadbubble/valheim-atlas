import {
  AdditiveBlending,
  Color,
  DoubleSide,
  FrontSide,
  ShaderMaterial,
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
  uFogDensity: IUniform<number>;
  uEdgeGlow: IUniform<Color>;
  uWorldRadius: IUniform<number>;
  uWaterEdge: IUniform<number>;
  uGrid: IUniform<number>;
  uGridSpacing: IUniform<number>;
  uHighlight: IUniform<number[]>;
  uHighlightOn: IUniform<number>;
}

export interface WorldDims {
  extentM: number;
  worldRadiusM: number;
  waterEdgeM: number;
  seaLevelM: number;
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
    uEdgeGlow: { value: new Color(SCENE_COLORS.edgeGlow) },
    uWorldRadius: { value: dims.worldRadiusM },
    uWaterEdge: { value: dims.waterEdgeM },
    uGrid: { value: 0 },
    uGridSpacing: { value: RENDER.overlay.gridSpacingM },
    uHighlight: { value: new Array<number>(9).fill(0) },
    uHighlightOn: { value: 0 },
  };
}

export function createTerrainMaterial(
  shared: SharedUniforms,
  color: Texture,
  weights: Texture,
  biomeIndex: Texture,
  gridResolution: number,
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
      uBiomeIndex: { value: biomeIndex },
      uGridRes: { value: gridResolution },
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
      uTop: { value: new Color(SCENE_COLORS.crustTop) },
      uBottom: { value: new Color(SCENE_COLORS.crustBottom) },
      uGlow: { value: new Color(SCENE_COLORS.edgeGlow) },
      uDepth: { value: depthM },
    },
  });
}

export function createHaloMaterial(inner: number, outer: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      uGlow: { value: new Color(SCENE_COLORS.edgeGlow) },
      uInner: { value: inner },
      uOuter: { value: outer },
      uStrength: { value: 0.55 },
    },
  });
}

export function createGlowWallMaterial(heightM: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: WALL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      uGlow: { value: new Color(SCENE_COLORS.edgeGlow) },
      uHeight: { value: heightM },
      uStrength: { value: 0.35 },
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
