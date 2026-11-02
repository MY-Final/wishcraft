/**
 * GARGANTUA — HDR bloom + film grade pipeline.
 *
 * A hand-rolled post stack keeps the presentation honest and dependency-free:
 *
 *   HDR ray-trace target
 *     → threshold / prefilter (½ res)
 *     → 13-tap downsample mip chain
 *     → additive tent upsample (all levels back into level 0)
 *     → composite: exposure · ACES · chromatic aberration · vignette · grain
 *
 * Only three.module.js and OrbitControls are vendored; no EffectComposer,
 * no UnrealBloomPass, no texture assets.
 */
import * as THREE from 'three';

const FULLSCREEN_VERT = /* glsl */ `precision highp float;
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const PREFILTER_FRAG = /* glsl */ `precision highp float;
uniform sampler2D tSource;
uniform vec2 uSourceTexel;
uniform vec2 uTargetTexel;
uniform float uThreshold;
out vec4 fragColor;

vec3 sampleBox(vec2 uv) {
  vec3 c = texture(tSource, uv + uSourceTexel * vec2(-1.0, -1.0)).rgb;
  c += texture(tSource, uv + uSourceTexel * vec2( 1.0, -1.0)).rgb;
  c += texture(tSource, uv + uSourceTexel * vec2(-1.0,  1.0)).rgb;
  c += texture(tSource, uv + uSourceTexel * vec2( 1.0,  1.0)).rgb;
  return c * 0.25;
}

float softKnee(vec3 colour) {
  float brightness = max(colour.r, max(colour.g, colour.b));
  float knee = max(uThreshold * 0.6, 0.0001);
  float soft = clamp(brightness - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 0.0001);
  return max(soft, brightness - uThreshold) / max(brightness, 0.0001);
}

void main() {
  vec2 uv = gl_FragCoord.xy * uTargetTexel;
  vec3 colour = sampleBox(uv);
  fragColor = vec4(colour * softKnee(colour), 1.0);
}
`;

const DOWNSAMPLE_FRAG = /* glsl */ `precision highp float;
uniform sampler2D tSource;
uniform vec2 uSourceTexel;
uniform vec2 uTargetTexel;
out vec4 fragColor;

vec3 tap(vec2 uv) { return texture(tSource, uv).rgb; }

void main() {
  vec2 uv = gl_FragCoord.xy * uTargetTexel;
  vec2 t = uSourceTexel;
  vec3 a = tap(uv + t * vec2(-2.0,  2.0));
  vec3 b = tap(uv + t * vec2( 0.0,  2.0));
  vec3 c = tap(uv + t * vec2( 2.0,  2.0));
  vec3 d = tap(uv + t * vec2(-2.0,  0.0));
  vec3 e = tap(uv);
  vec3 f = tap(uv + t * vec2( 2.0,  0.0));
  vec3 g = tap(uv + t * vec2(-2.0, -2.0));
  vec3 h = tap(uv + t * vec2( 0.0, -2.0));
  vec3 i = tap(uv + t * vec2( 2.0, -2.0));
  vec3 j = tap(uv + t * vec2(-1.0,  1.0));
  vec3 k = tap(uv + t * vec2( 1.0,  1.0));
  vec3 l = tap(uv + t * vec2(-1.0, -1.0));
  vec3 m = tap(uv + t * vec2( 1.0, -1.0));
  vec3 colour = e * 0.125;
  colour += (a + c + g + i) * 0.03125;
  colour += (b + d + f + h) * 0.0625;
  colour += (j + k + l + m) * 0.125;
  fragColor = vec4(colour, 1.0);
}
`;

const UPSAMPLE_FRAG = /* glsl */ `precision highp float;
uniform sampler2D tSource;
uniform vec2 uSourceTexel;
uniform vec2 uTargetTexel;
uniform float uRadius;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy * uTargetTexel;
  vec2 t = uSourceTexel * (0.65 + uRadius * 1.9);
  vec3 colour = texture(tSource, uv).rgb * 4.0;
  colour += (texture(tSource, uv + t * vec2(-1.0,  0.0)).rgb
           + texture(tSource, uv + t * vec2( 1.0,  0.0)).rgb
           + texture(tSource, uv + t * vec2( 0.0, -1.0)).rgb
           + texture(tSource, uv + t * vec2( 0.0,  1.0)).rgb) * 1.5;
  colour += (texture(tSource, uv + t * vec2(-1.0, -1.0)).rgb
           + texture(tSource, uv + t * vec2( 1.0, -1.0)).rgb
           + texture(tSource, uv + t * vec2(-1.0,  1.0)).rgb
           + texture(tSource, uv + t * vec2( 1.0,  1.0)).rgb) * 0.5;
  fragColor = vec4(colour / 10.0, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */ `precision highp float;
out vec4 fragColor;

uniform sampler2D tHDR;
uniform sampler2D tBloom;
uniform vec2 uResolution;
uniform float uTime;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uVignette;
uniform float uGrain;
uniform float uChroma;
uniform int uDebug;

vec3 acesFitted(vec3 colour) {
  const mat3 inputMat = mat3(
    0.59719, 0.07600, 0.02840,
    0.35458, 0.90834, 0.13383,
    0.04823, 0.01566, 0.83777
  );
  const mat3 outputMat = mat3(
     1.60475, -0.10208, -0.00327,
    -0.53108,  1.10813, -0.07276,
    -0.07367, -0.00605,  1.07602
  );
  colour = inputMat * colour;
  vec3 a = colour * (colour + 0.0245786) - 0.000090537;
  vec3 b = colour * (0.983729 * colour + 0.4329510) + 0.238081;
  colour = a / b;
  colour = outputMat * colour;
  return clamp(colour, 0.0, 1.0);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 compositeAt(vec2 uv, vec2 offset) {
  vec3 bloom = texture(tBloom, uv).rgb;
  vec2 uvR = uv + offset;
  vec2 uvB = uv - offset;
  vec3 hdrR = texture(tHDR, uvR).rgb;
  vec3 hdrG = texture(tHDR, uv).rgb;
  vec3 hdrB = texture(tHDR, uvB).rgb;
  vec3 colour = vec3(hdrR.r, hdrG.g, hdrB.b) + bloom * uBloomStrength;
  return colour;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 centred = uv - 0.5;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 radial = vec2(centred.x * aspect, centred.y);
  float r2 = dot(radial, radial);

  vec3 colour;

  if (uDebug == 1) {
    // Raw HDR: exposure + ACES only.
    colour = texture(tHDR, uv).rgb;
    colour *= uExposure;
    colour = acesFitted(colour);
    colour = pow(colour, vec3(1.0 / 2.2));
  } else if (uDebug >= 2 && uDebug <= 7) {
    // The shader wrote display-ready diagnostic colours.
    colour = texture(tHDR, uv).rgb;
  } else if (uDebug == 8) {
    // Lensed sky only, tone-mapped.
    colour = texture(tHDR, uv).rgb * uExposure;
    colour = acesFitted(colour);
    colour = pow(colour, vec3(1.0 / 2.2));
  } else if (uDebug == 9) {
    vec3 bloom = texture(tBloom, uv).rgb;
    colour = bloom * 2.0 / (1.0 + bloom);
    colour = pow(colour, vec3(1.0 / 2.2));
  } else {
    vec2 offset = radial * r2 * uChroma * 0.006;
    vec3 hdr = compositeAt(uv, offset);
    hdr *= uExposure;
    colour = acesFitted(hdr);

    // Optical vignette — gentle, keeps the shadow black.
    float edge = smoothstep(0.12, 0.86, sqrt(r2));
    colour *= 1.0 - uVignette * edge * edge * 0.85;

    // Film grain, luminance-weighted so the black holes stay black.
    float lum = dot(colour, vec3(0.299, 0.587, 0.114));
    float grain = (hash12(gl_FragCoord.xy + fract(uTime) * 197.0) - 0.5) * 2.0;
    colour += grain * uGrain * 0.045 * smoothstep(0.015, 0.32, lum);

    colour = pow(max(colour, vec3(0.0)), vec3(1.0 / 2.2));

    // Dither to keep the deep shadow gradient band-free.
    colour += (hash12(gl_FragCoord.xy + 17.0) - 0.5) / 255.0;
  }

  fragColor = vec4(colour, 1.0);
}
`;

function fullscreenGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function rawMaterial(fragmentShader, uniforms) {
  return new THREE.RawShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader,
    uniforms,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });
}

function halfFloatSupported(renderer) {
  const gl = renderer.getContext();
  if (!gl) return false;
  const ext =
    gl.getExtension('EXT_color_buffer_float') ||
    gl.getExtension('EXT_color_buffer_half_float');
  return Boolean(ext);
}

function createTarget(renderer, width, height) {
  const type = halfFloatSupported(renderer) ? THREE.HalfFloatType : THREE.UnsignedByteType;
  return new THREE.WebGLRenderTarget(Math.max(2, width), Math.max(2, height), {
    type,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
}

export function createPostPipeline({ renderer, width, height, levels = 5 }) {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const quad = new THREE.Mesh(fullscreenGeometry(), new THREE.MeshBasicMaterial());
  quad.frustumCulled = false;
  scene.add(quad);

  const prefilter = rawMaterial(PREFILTER_FRAG, {
    tSource: { value: null },
    uSourceTexel: { value: new THREE.Vector2(1 / width, 1 / height) },
    uTargetTexel: { value: new THREE.Vector2(1 / width, 1 / height) },
    uThreshold: { value: 0.7 },
  });
  const downsample = rawMaterial(DOWNSAMPLE_FRAG, {
    tSource: { value: null },
    uSourceTexel: { value: new THREE.Vector2() },
    uTargetTexel: { value: new THREE.Vector2() },
  });
  const upsample = rawMaterial(UPSAMPLE_FRAG, {
    tSource: { value: null },
    uSourceTexel: { value: new THREE.Vector2() },
    uTargetTexel: { value: new THREE.Vector2() },
    uRadius: { value: 0.6 },
  });
  upsample.blending = THREE.AdditiveBlending;
  upsample.transparent = true;

  const composite = rawMaterial(COMPOSITE_FRAG, {
    tHDR: { value: null },
    tBloom: { value: null },
    uResolution: { value: new THREE.Vector2(width, height) },
    uTime: { value: 0 },
    uExposure: { value: 1 },
    uBloomStrength: { value: 0.85 },
    uVignette: { value: 0.55 },
    uGrain: { value: 0.32 },
    uChroma: { value: 0.55 },
    uDebug: { value: 0 },
  });

  const state = {
    width,
    height,
    outputWidth: width,
    outputHeight: height,
    hdr: createTarget(renderer, width, height),
    bloom: [],
    levels: [],
  };

  function buildBloomChain(levelCount) {
    for (const target of state.bloom) target.dispose();
    state.bloom = [];
    let w = Math.max(2, Math.floor(width / 2));
    let h = Math.max(2, Math.floor(height / 2));
    for (let i = 0; i < levelCount; i++) {
      state.bloom.push(createTarget(renderer, w, h));
      w = Math.max(2, Math.floor(w / 2));
      h = Math.max(2, Math.floor(h / 2));
    }
  }

  function resize(nextWidth, nextHeight, levelCount = levels) {
    width = Math.max(2, Math.floor(nextWidth));
    height = Math.max(2, Math.floor(nextHeight));
    state.width = width;
    state.height = height;
    state.hdr.setSize(width, height);
    buildBloomChain(levelCount);
  }

  /** Presentation resolution (the final composite draws to the canvas). */
  function setOutputSize(nextWidth, nextHeight) {
    state.outputWidth = Math.max(2, Math.floor(nextWidth));
    state.outputHeight = Math.max(2, Math.floor(nextHeight));
    composite.uniforms.uResolution.value.set(state.outputWidth, state.outputHeight);
  }

  function draw(material, target, clear) {
    quad.material = material;
    renderer.setRenderTarget(target ?? null);
    if (clear) renderer.clear();
    renderer.render(scene, camera);
  }

  /**
   * @param {THREE.Texture} hdrTexture
   * @param {object} options
   */
  function render(hdrTexture, options = {}) {
    const {
      time = 0,
      exposure = 1,
      bloomStrength = 0.85,
      bloomRadius = 0.6,
      bloomThreshold = 0.7,
      vignette = 0.55,
      grain = 0.32,
      chroma = 0.55,
      debug = 0,
    } = options;

    composite.uniforms.tHDR.value = hdrTexture;

    if (debug === 1 || debug >= 8) {
      composite.uniforms.uTime.value = time;
      composite.uniforms.uExposure.value = exposure;
      composite.uniforms.uDebug.value = debug;
      draw(composite, null, true);
      return;
    }

    // Bright pass into the first (half-resolution) bloom mip.
    prefilter.uniforms.tSource.value = hdrTexture;
    prefilter.uniforms.uSourceTexel.value.set(1 / width, 1 / height);
    prefilter.uniforms.uTargetTexel.value.set(1 / state.bloom[0].width, 1 / state.bloom[0].height);
    prefilter.uniforms.uThreshold.value = bloomThreshold;
    draw(prefilter, state.bloom[0], true);

    for (let i = 1; i < state.bloom.length; i++) {
      const source = state.bloom[i - 1];
      downsample.uniforms.tSource.value = source.texture;
      downsample.uniforms.uSourceTexel.value.set(1 / source.width, 1 / source.height);
      downsample.uniforms.uTargetTexel.value.set(
        1 / state.bloom[i].width,
        1 / state.bloom[i].height,
      );
      draw(downsample, state.bloom[i], true);
    }

    upsample.uniforms.uRadius.value = bloomRadius;
    renderer.autoClear = false;
    for (let i = state.bloom.length - 2; i >= 0; i--) {
      const source = state.bloom[i + 1];
      upsample.uniforms.tSource.value = source.texture;
      upsample.uniforms.uSourceTexel.value.set(1 / source.width, 1 / source.height);
      upsample.uniforms.uTargetTexel.value.set(
        1 / state.bloom[i].width,
        1 / state.bloom[i].height,
      );
      draw(upsample, state.bloom[i], false);
    }
    renderer.autoClear = true;

    composite.uniforms.tBloom.value = state.bloom[0].texture;
    composite.uniforms.uTime.value = time;
    composite.uniforms.uExposure.value = exposure;
    composite.uniforms.uBloomStrength.value = bloomStrength;
    composite.uniforms.uVignette.value = vignette;
    composite.uniforms.uGrain.value = grain;
    composite.uniforms.uChroma.value = chroma;
    composite.uniforms.uDebug.value = debug;
    draw(composite, null, true);
  }

  return {
    hdr: state.hdr,
    resize,
    setOutputSize,
    render,
    dispose() {
      state.hdr.dispose();
      for (const target of state.bloom) target.dispose();
      quad.geometry.dispose();
      quad.material.dispose();
      prefilter.dispose();
      downsample.dispose();
      upsample.dispose();
      composite.dispose();
    },
    get debugTargets() {
      return state.bloom;
    },
  };
}

export const POST_VERT = FULLSCREEN_VERT;
