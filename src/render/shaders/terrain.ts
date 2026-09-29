import { LIGHT_GLSL, NOISE_GLSL, OUTPUT_GLSL, OVERLAY_GLSL } from './common';

export const TERRAIN_VERTEX = /* glsl */ `
uniform float uExag;
uniform float uExtent;
varying vec3 vWorld;
varying vec2 vUv;
varying float vHeight;
varying vec2 vGame;

void main() {
  vec3 p = position;
  vGame = p.xz;
  vHeight = p.y;
  p.y *= uExag;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vUv = vec2((p.x + uExtent) / (2.0 * uExtent), (uExtent - p.z) / (2.0 * uExtent));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const TERRAIN_FRAGMENT = /* glsl */ `
uniform sampler2D uColor;
uniform sampler2D uWeights;
uniform float uTime;
uniform float uSnowLine;
uniform vec3 uRock;
uniform vec3 uSnow;
uniform vec3 uSand;
uniform vec3 uAsh;
uniform vec3 uLava;
uniform vec3 uMist;
uniform sampler2D uHighlightMask;
uniform float uHighlightOn;
uniform vec3 uHighlightColor;
varying vec3 vWorld;
varying vec2 vUv;
varying float vHeight;
varying vec2 vGame;
${OVERLAY_GLSL}
${NOISE_GLSL}
${LIGHT_GLSL}

void main() {
  if (length(vWorld.xz) > uWaterEdge) discard;
  vec3 n = flatNormal(vWorld);
  float slope = 1.0 - n.y;
  vec3 base = texture2D(uColor, vUv).rgb;
  vec4 w = texture2D(uWeights, vUv); // r mountains, g ashlands, b mistlands, a deep north
  float h = vHeight;
  float grain = fbm3(vWorld.xz * 0.018);

  vec3 col = base * (0.86 + 0.28 * grain);

  // Beaches just above the waterline (not in Ashlands or the Deep North).
  float beach = (1.0 - smoothstep(1.0, 3.5, h)) * (1.0 - w.g) * (1.0 - w.a);
  col = mix(col, uSand, beach * 0.75);

  // Bare rock on steep slopes; mountains get rockier sooner.
  float rock = smoothstep(0.2, 0.42, slope + w.r * 0.1 + (grain - 0.5) * 0.12);
  col = mix(col, uRock * (0.8 + 0.35 * grain), rock);

  // Snow: above the snow line in mountains, almost everywhere in the Deep North.
  float snowHigh = smoothstep(uSnowLine, uSnowLine + 70.0, h + (grain - 0.5) * 80.0) * w.r;
  float snow = max(snowHigh, w.a * 0.92) * (1.0 - smoothstep(0.5, 0.75, slope));
  col = mix(col, uSnow * (0.93 + 0.1 * grain), snow);

  // Ashlands: dark ash with glowing lava cracks.
  col = mix(col, uAsh * (0.7 + 0.6 * grain), w.g * 0.7);
  float lava = 0.0;
  if (w.g > 0.01) {
    float c = fbm3(vWorld.xz * 0.011 + 3.1);
    float crack = smoothstep(0.5, 0.515, c) * (1.0 - smoothstep(0.53, 0.545, c));
    lava = w.g * crack * (1.0 - smoothstep(0.25, 0.55, slope));
  }

  // Mistlands: darker, violet-tinted ground.
  col = mix(col, col * 0.55 + uMist * 0.35, w.b * 0.7);

  vec3 lit = shade(col, n);
  float pulse = 0.7 + 0.3 * sin(uTime * 1.4 + grain * 9.0);
  lit += uLava * lava * pulse * 1.8;

  // Dark mist pooling in Mistlands lowlands, drifting slowly.
  if (w.b > 0.01) {
    float drift = fbm3(vWorld.xz * 0.0025 + vec2(uTime * 0.012, -uTime * 0.008));
    float mist = w.b * (1.0 - smoothstep(15.0, 160.0, h)) * (0.45 + 0.55 * drift);
    lit = mix(lit, uMist * 1.15, clamp(mist, 0.0, 1.0) * 0.8);
  }

  // Search highlight: pulse the matching biomes, dim the rest. The mask is a blurred copy
  // of the biome grid (render/highlight-mask.ts); its 0.5 iso-line is a smooth curve, drawn
  // with a screen-space antialiased edge and a thin bright outline.
  if (uHighlightOn > 0.5) {
    float m = texture2D(uHighlightMask, vUv).r;
    float aa = max(fwidth(m), 0.002);
    float hl = smoothstep(0.5 - aa, 0.5 + aa, m);
    float outline = 1.0 - smoothstep(aa * 1.5, aa * 3.0, abs(m - 0.5));
    float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
    lit = mix(lit * 0.5, lit, hl) + uHighlightColor * hl * (0.08 + 0.12 * pulse);
    lit = mix(lit, uHighlightColor, outline * (0.55 + 0.25 * pulse));
  }
  lit = overlayGrid(lit, vGame);
  gl_FragColor = vec4(atmosphere(lit, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;
