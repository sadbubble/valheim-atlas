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
uniform float uSelectedScale;
uniform float uHaloScale;
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
  bool selected = aState > 0.5 && aState < 1.5;
  float px = aSize * scale * (selected ? uSelectedScale : 1.0);
  // A selected/hovered marker gets a bigger quad with room for the halo ring around it;
  // vLocal stays in icon space (0..1 across the icon disc).
  float quad = selected ? uHaloScale : 1.0;
  vec2 offset = position.xy * px * quad * 2.0 / uViewport + vec2(0.0, px / uViewport.y);
  clip.xy += offset * clip.w;
  gl_Position = clip;
  vLocal = (uv - 0.5) * quad + 0.5;
  float col = mod(aIcon, uAtlasCols);
  float row = floor(aIcon / uAtlasCols);
  vec2 iuv = clamp(vLocal, 0.0, 1.0);
  vUv = vec2((col + iuv.x) / uAtlasCols, 1.0 - (row + 1.0 - iuv.y) / uAtlasRows);
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
uniform float uReveal;
varying vec2 vUv;
varying vec2 vLocal;
varying vec3 vColor;
varying float vState;

void main() {
  vec2 p = vLocal - 0.5;
  float d = length(p);
  float disc = 1.0 - smoothstep(0.44, 0.5, d);
  float pulse = 0.5 + 0.5 * sin(uTime * 4.0);
  if (vState > 0.5 && vState < 1.5 && disc < 0.99) {
    // Selected/hovered: a gold halo ring that slowly swells and fades (still under reduced
    // motion, when the shader clock stands still).
    float w = fract(uTime * 0.7);
    float rr = 0.55 + 0.1 * w;
    float halo = (1.0 - smoothstep(0.0, 0.035, abs(d - rr))) * (1.0 - w * 0.8);
    float a = max(halo, disc);
    if (a < 0.01) discard;
    if (disc < 0.01) {
      gl_FragColor = vec4(uGold, halo * uReveal);
      ${OUTPUT_GLSL}
      return;
    }
  }
  if (disc < 0.01) discard;
  float ring = smoothstep(0.36, 0.4, d);
  vec3 ringCol = uRing;
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
  gl_FragColor = vec4(col, alpha * uReveal);
  ${OUTPUT_GLSL}
}
`;
