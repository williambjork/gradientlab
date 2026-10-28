export const MAX_LAYERS = 8

export const vertexShader = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`

export const fragmentShader = /* glsl */ `#version 300 es
precision highp float;

#define MAX_LAYERS ${MAX_LAYERS}

uniform vec2 uCanvasSize;
uniform vec2 uViewOrigin;
uniform vec2 uViewSpan;

uniform int uLayerCount;
uniform vec2 uCenter[MAX_LAYERS];
uniform vec2 uRadii[MAX_LAYERS];
uniform float uAngle[MAX_LAYERS];
/** Animated rotation and scale, applied around uPivot rather than the light itself */
uniform float uTurn[MAX_LAYERS];
uniform vec2 uPivot[MAX_LAYERS];
uniform float uScale[MAX_LAYERS];
uniform float uOpacity[MAX_LAYERS];
uniform sampler2D uPalette;
uniform vec3 uBackground;

uniform vec2 uPointer;
uniform float uPull;
uniform float uPullRadius;

/** Ring 1 radius, ring 2 radius, ring 1 weight, ring 2 weight */
uniform vec4 uBlur;

out vec4 outColor;

vec2 inverseRotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(c * v.x + s * v.y, -s * v.x + c * v.y);
}

vec3 field(vec2 p) {
  vec2 delta = p - uPointer;
  float strength = uPull * exp(-dot(delta, delta) / (2.0 * uPullRadius * uPullRadius));

  vec3 acc = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < MAX_LAYERS; i++) {
    if (i >= uLayerCount) break;
    float opacity = uOpacity[i];
    if (opacity <= 0.001) continue;

    vec2 center = uCenter[i];
    vec2 lookup = mix(p, center + delta * 0.6, strength);
    vec2 pivot = uPivot[i];
    vec2 settled = pivot + inverseRotate(lookup - pivot, uTurn[i]) / uScale[i];
    vec2 local = inverseRotate(settled - center, uAngle[i]);
    float d = length(local / uRadii[i]);

    vec2 uv = vec2(clamp(d, 0.0, 1.0), (float(i) + 0.5) / float(MAX_LAYERS));
    acc += textureLod(uPalette, uv, 0.0).rgb * opacity;
    total += opacity;
  }
  return acc / max(total, 1.0) + uBackground * max(0.0, 1.0 - total);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uCanvasSize;
  uv.y = 1.0 - uv.y;
  vec2 p = uViewOrigin + uv * uViewSpan;

  // 13 taps: centre plus two staggered rings of six.
  vec3 color = field(p);
  float total = 1.0;
  for (int k = 0; k < 6; k++) {
    float a = float(k) * 1.0471976;
    color += field(p + vec2(cos(a), sin(a)) * uBlur.x) * uBlur.z;
    float b = a + 0.5235988;
    color += field(p + vec2(cos(b), sin(b)) * uBlur.y) * uBlur.w;
    total += uBlur.z + uBlur.w;
  }
  color /= total;

  color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(color, 1.0);
}
`
