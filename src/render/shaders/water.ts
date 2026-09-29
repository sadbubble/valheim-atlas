import { LIGHT_GLSL, NOISE_GLSL, OUTPUT_GLSL } from './common';

export const WATER_VERTEX = /* glsl */ `
uniform float uExtent;
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  // Local position is in game coordinates (the world group mirrors z for three.js).
  vUv = vec2((position.x + uExtent) / (2.0 * uExtent), (uExtent - position.z) / (2.0 * uExtent));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const WATER_FRAGMENT = /* glsl */ `
uniform sampler2D uHeight;
uniform float uSeaLevel;
uniform float uTime;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uFoam;
varying vec3 vWorld;
varying vec2 vUv;
${NOISE_GLSL}
${LIGHT_GLSL}

// Analytic slope of a few directional sine waves (cheap), broken up by one noise sample.
vec2 waveSlope(vec2 p) {
  vec2 d1 = vec2(0.8, 0.6), d2 = vec2(-0.45, 0.89), d3 = vec2(0.96, -0.28), d4 = vec2(-0.7, -0.71);
  float f1 = 0.021, f2 = 0.034, f3 = 0.057, f4 = 0.089;
  vec2 g = d1 * f1 * cos(dot(p, d1) * f1 + uTime * 0.9) * 1.0
         + d2 * f2 * cos(dot(p, d2) * f2 + uTime * 1.2) * 0.7
         + d3 * f3 * cos(dot(p, d3) * f3 + uTime * 1.6) * 0.45
         + d4 * f4 * cos(dot(p, d4) * f4 + uTime * 2.1) * 0.3;
  return g * (0.6 + 0.8 * vnoise(p * 0.004 + uTime * 0.02));
}

void main() {
  float ground = texture2D(uHeight, vUv).r;
  float depth = uSeaLevel - ground;
  // Land per the heightmap: let the terrain show instead of painting water over it.
  if (depth < -0.5) discard;
  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 50.0, depth));

  vec2 p = vWorld.xz;
  vec2 slope = waveSlope(p) * 3.2;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 viewDir = normalize(cameraPosition - vWorld);

  vec3 lit = shade(col, n);
  float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  lit = mix(lit, uSkyAmbient * 0.55, fresnel * 0.45);
  float spec = pow(max(dot(reflect(-uSunDir, n), viewDir), 0.0), 90.0);
  lit += uSunColor * spec * 0.6;

  // Shoreline foam: animated bands in the shallowest water, fading out with distance so
  // the overview isn't speckled.
  float shore = 1.0 - smoothstep(0.0, 2.2, max(depth, 0.0));
  float bands = 0.5 + 0.5 * sin(depth * 3.2 - uTime * 1.8 + vnoise(p * 0.06) * 6.0);
  float near = 1.0 - smoothstep(2500.0, 9000.0, length(cameraPosition - vWorld));
  float foam = clamp(shore * (0.35 + 0.65 * bands), 0.0, 1.0) * mix(0.35, 1.0, near);
  lit = mix(lit, uFoam, foam * 0.75);

  gl_FragColor = vec4(atmosphere(lit, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;
