/** Shared GLSL: our own hash/value noise, stylized lighting and the atmosphere/edge glow. */
export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm3(vec2 p) {
  return vnoise(p) * 0.57 + vnoise(p * 2.07 + 13.1) * 0.29 + vnoise(p * 4.13 + 7.7) * 0.14;
}
`;

export const LIGHT_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyAmbient;
uniform vec3 uGroundAmbient;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec3 uEdgeGlow;
uniform float uWorldRadius;
uniform float uWaterEdge;

vec3 shade(vec3 albedo, vec3 n) {
  float diff = max(dot(n, uSunDir), 0.0);
  vec3 amb = mix(uGroundAmbient, uSkyAmbient, n.y * 0.5 + 0.5);
  return albedo * (amb * 0.62 + uSunColor * diff * 0.95);
}

vec3 atmosphere(vec3 col, vec3 worldPos) {
  float dist = length(worldPos - cameraPosition);
  float fog = 1.0 - exp(-dist * uFogDensity);
  col = mix(col, uFogColor, clamp(fog, 0.0, 1.0) * 0.8);
  float r = length(worldPos.xz);
  float glow = smoothstep(uWorldRadius * 0.93, uWaterEdge, r);
  return mix(col, uEdgeGlow, glow * 0.5);
}

vec3 flatNormal(vec3 worldPos) {
  vec3 n = normalize(cross(dFdx(worldPos), dFdy(worldPos)));
  return n.y < 0.0 ? -n : n;
}
`;

/** three.js output conversion (tone mapping + sRGB), for ShaderMaterial fragments. */
export const OUTPUT_GLSL = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;

/**
 * Optional 1 km coordinate grid in game coordinates (x east, z north), axes drawn brighter,
 * plus warm distance rings around the world centre at the same spacing (SPEC F2/N1: how far
 * from spawn you are).
 */
export const OVERLAY_GLSL = /* glsl */ `
uniform float uGrid;
uniform float uGridSpacing;
vec3 overlayGrid(vec3 col, vec2 game) {
  if (uGrid < 0.5) return col;
  vec2 q = game / uGridSpacing;
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  vec2 a = abs(game) / fwidth(game);
  float axis = 1.0 - min(min(a.x, a.y) / 2.0, 1.0);
  col = mix(col, vec3(0.95, 0.97, 1.0), max(line * 0.3, axis * 0.6));
  float rq = length(game) / uGridSpacing;
  float rg = abs(fract(rq - 0.5) - 0.5) / fwidth(rq);
  float ring = 1.0 - min(rg / 1.5, 1.0);
  return mix(col, vec3(1.0, 0.85, 0.5), ring * 0.5);
}
`;
