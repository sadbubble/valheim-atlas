import { NOISE_GLSL, OUTPUT_GLSL } from './common';

/** Crust wall around the disc edge and the floating underside. */
export const RIM_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const RIM_FRAGMENT = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uGlow;
uniform float uDepth;
uniform float uTime;
varying vec3 vWorld;
${NOISE_GLSL}
void main() {
  float t = clamp(-vWorld.y / uDepth, 0.0, 1.0);
  float angle = atan(vWorld.z, vWorld.x);
  float strata = 0.8 + 0.2 * sin(vWorld.y * 0.09 + fbm3(vec2(angle * 40.0, vWorld.y * 0.01)) * 4.0);
  vec3 col = mix(uTop, uBottom, pow(t, 0.6)) * strata;
  // Glowing seams: waterline and a faint band of light running round the crust.
  float waterline = 1.0 - smoothstep(0.0, 0.035, t);
  float vein = smoothstep(0.62, 0.66, fbm3(vec2(angle * 60.0, vWorld.y * 0.004 + uTime * 0.02)));
  col += uGlow * (waterline * 0.9 + vein * 0.35 * (1.0 - t));
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT_GLSL}
}
`;

/** Additive glow: flat halo ring around the disc and a soft atmosphere wall above the edge. */
export const GLOW_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uGlow;
uniform float uInner;
uniform float uOuter;
uniform float uStrength;
varying vec3 vWorld;
varying vec3 vNormalW;
void main() {
  float r = length(vWorld.xz);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float a = pow(1.0 - t, 2.2) * uStrength;
  gl_FragColor = vec4(uGlow * a, a);
  ${OUTPUT_GLSL}
}
`;

export const WALL_FRAGMENT = /* glsl */ `
uniform vec3 uGlow;
uniform float uHeight;
uniform float uStrength;
varying vec3 vWorld;
varying vec3 vNormalW;
void main() {
  float t = clamp(vWorld.y / uHeight, 0.0, 1.0);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float rim = 1.0 - abs(dot(normalize(vNormalW), viewDir));
  float a = pow(1.0 - t, 2.5) * (0.35 + 0.65 * rim) * uStrength;
  gl_FragColor = vec4(uGlow * a, a);
  ${OUTPUT_GLSL}
}
`;

/** Stars on a camera-centred sphere, always behind everything. */
export const STAR_VERTEX = /* glsl */ `
attribute float aSize;
attribute float aTwinkle;
uniform float uRadius;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec3 wp = cameraPosition + normalize(position) * uRadius;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  vAlpha = 0.55 + 0.45 * sin(uTime * (0.6 + aTwinkle) + aTwinkle * 40.0);
  gl_PointSize = aSize * uPixelRatio;
}
`;

export const STAR_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = (1.0 - smoothstep(0.1, 0.5, d)) * vAlpha;
  gl_FragColor = vec4(uColor * a, a);
  ${OUTPUT_GLSL}
}
`;
