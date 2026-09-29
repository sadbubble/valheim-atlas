import { LIGHT_GLSL, OUTPUT_GLSL } from './common';

/**
 * Instanced props. The instance translation's y is ground height above sea (metres) and is
 * exaggerated here, so props follow the terrain without being stretched. Props shrink away
 * near the maximum distance instead of popping.
 */
export const PROP_VERTEX = /* glsl */ `
uniform float uExag;
uniform float uMaxDist;
varying vec3 vWorld;
varying vec3 vColor;
void main() {
  vec3 base = vec3(instanceMatrix[3].x, instanceMatrix[3].y * uExag, instanceMatrix[3].z);
  float d = distance((modelMatrix * vec4(base, 1.0)).xyz, cameraPosition);
  float fade = 1.0 - smoothstep(uMaxDist * 0.75, uMaxDist, d);
  vec3 wp = (modelMatrix * vec4(base + mat3(instanceMatrix) * position * fade, 1.0)).xyz;
  vWorld = wp;
  vColor = color;
#ifdef USE_INSTANCING_COLOR
  vColor *= instanceColor;
#endif
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

export const PROP_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vColor;
${LIGHT_GLSL}
void main() {
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 viewDir = normalize(cameraPosition - vWorld);
  if (dot(n, viewDir) < 0.0) n = -n;
  gl_FragColor = vec4(atmosphere(shade(vColor, n), vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;
