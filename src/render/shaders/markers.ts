import { OUTPUT_GLSL } from './common';

/**
 * Billboarded, screen-space-sized marker icons. Instance translation = (x, height above
 * sea, z) in game coordinates; height is exaggerated here like the terrain. The quad is
 * lifted so its bottom sits on the point.
 */
export const MARKER_VERTEX = /* glsl */ `
attribute float aIcon;
attribute vec3 aColor;
attribute float aSize;
attribute float aState;
uniform vec2 uViewport;
uniform float uExag;
uniform float uAtlasCols;
uniform float uAtlasRows;
uniform float uRefDist;
uniform float uMinScale;
uniform float uMaxScale;
varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vColor;
varying float vState;

void main() {
  vec3 base = vec3(instanceMatrix[3].x, instanceMatrix[3].y * uExag, instanceMatrix[3].z);
  vec4 wp = modelMatrix * vec4(base, 1.0);
  vec4 clip = projectionMatrix * viewMatrix * wp;
  float dist = distance(wp.xyz, cameraPosition);
  float scale = clamp(uRefDist / dist, uMinScale, uMaxScale);
  float px = aSize * scale * (aState > 0.5 && aState < 1.5 ? 1.25 : 1.0);
  vec2 offset = position.xy * px * 2.0 / uViewport + vec2(0.0, px / uViewport.y);
  clip.xy += offset * clip.w;
  gl_Position = clip;
  float col = mod(aIcon, uAtlasCols);
  float row = floor(aIcon / uAtlasCols);
  vUv = vec2((col + uv.x) / uAtlasCols, 1.0 - (row + 1.0 - uv.y) / uAtlasRows);
  vLocal = uv;
  vColor = aColor;
  vState = aState;
}
`;

// States: 0 normal, 1 selected/hovered, 2 highlighted, 3 dimmed, 4 cluster.
export const MARKER_FRAGMENT = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uTime;
uniform vec3 uGlyph;
uniform vec3 uRing;
uniform vec3 uGold;
varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vColor;
varying float vState;

void main() {
  vec2 p = vLocal - 0.5;
  float d = length(p);
  float disc = 1.0 - smoothstep(0.44, 0.5, d);
  if (disc < 0.01) discard;
  float ring = smoothstep(0.36, 0.4, d);
  vec3 ringCol = uRing;
  float pulse = 0.5 + 0.5 * sin(uTime * 4.0);
  if (vState > 0.5 && vState < 1.5) ringCol = uGold;
  if (vState > 1.5 && vState < 2.5) ringCol = mix(uRing, uGold, pulse);
  vec3 col = mix(vColor, ringCol, ring);
  float glyph = texture2D(uAtlas, vUv).a;
  col = mix(col, uGlyph, glyph);
  float alpha = disc;
  if (vState > 2.5 && vState < 3.5) {
    col = mix(col, vec3(dot(col, vec3(0.33))), 0.6);
    alpha *= 0.5;
  }
  if (vState > 3.5) {
    // Cluster: double ring.
    float inner = smoothstep(0.26, 0.29, d) * (1.0 - smoothstep(0.31, 0.34, d));
    col = mix(col, ringCol, inner * 0.8);
  }
  gl_FragColor = vec4(col, alpha);
  ${OUTPUT_GLSL}
}
`;
