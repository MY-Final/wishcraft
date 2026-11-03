/**
 * AQUA PURE — procedural outdoor environment.
 *
 * This module owns everything that is not the bottle: the sky, clouds, meadow,
 * near-field grass, wildflowers, sun/shadow rig, fog and the procedural PMREM
 * environment map that gives the clear PET its outdoor reflections.
 *
 * Units are millimetres throughout (1 world unit = 1 mm); the bottle stands at
 * the origin and reaches y ≈ 205. Every tunable value is read from CONFIG.
 *
 * The module is deliberately asset-free: all textures are painted into
 * canvases at runtime, so the whole scene loads from a single JS module.
 *
 * Public API:
 *   const environment = createEnvironment({ scene, renderer, config });
 *   environment.update(dt, elapsed);
 *   environment.sunDirection;              // normalised THREE.Vector3
 *   environment.setEnvironmentIntensity(v);
 *   environment.dispose();
 */

import * as THREE from 'three';
import { CONFIG } from './config.js';

const TAU = Math.PI * 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ */
/* Deterministic random / noise helpers                                */
/* ------------------------------------------------------------------ */

/** Small, fast, deterministic PRNG so the meadow looks identical each load. */
function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1] — used for non-repeating meadow colour. */
function valueNoise2D(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** CSS rgba() string for a THREE.Color (stored in linear working space). */
function colorCss(color, alpha = 1) {
  const srgb = color.clone().convertLinearToSRGB();
  return `rgba(${Math.round(srgb.r * 255)}, ${Math.round(srgb.g * 255)}, ${Math.round(srgb.b * 255)}, ${alpha})`;
}

/**
 * Draw a shape at (x, y) and at its wrapped copies so the resulting texture is
 * seamless when tiled. `margin` is how far the shape can reach past a vertex.
 */
function drawWrapped(ctx, size, x, y, margin, draw) {
  for (let ox = -1; ox <= 1; ox += 1) {
    const px = x + ox * size;
    if (px < -margin || px > size + margin) continue;
    for (let oy = -1; oy <= 1; oy += 1) {
      const py = y + oy * size;
      if (py < -margin || py > size + margin) continue;
      ctx.save();
      ctx.translate(px, py);
      draw(ctx);
      ctx.restore();
    }
  }
}

/** Radial-gradient puff, optionally stretched into an ellipse. */
function paintPuff(ctx, x, y, rx, ry, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx / ry, 1);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  gradient.addColorStop(0, colorCss(color, alpha));
  gradient.addColorStop(0.55, colorCss(color, alpha * 0.52));
  gradient.addColorStop(1, colorCss(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, ry, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Procedural textures                                                 */
/* ------------------------------------------------------------------ */

/**
 * Seamless meadow texture: mottled base, fine grass-blade strokes and a light
 * grain pass. The texture is deliberately high-frequency; the instanced
 * blades and macro vertex tint break up the repeat at every scale.
 */
function createGrassTexture(envCfg, renderer) {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(0xa9a17c3);

  const ground = new THREE.Color(envCfg.groundColor);
  const dark = new THREE.Color(envCfg.grassDark);
  const light = new THREE.Color(envCfg.grassLight);

  ctx.fillStyle = colorCss(ground);
  ctx.fillRect(0, 0, size, size);

  // Wide, soft colour patches break up any obvious tiling.
  for (let i = 0; i < 170; i += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = 50 + rng() * 190;
    const color = rng() < 0.48 ? dark : light;
    const alpha = 0.02 + rng() * 0.055;
    drawWrapped(ctx, size, x, y, radius, (c) => {
      const gradient = c.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, colorCss(color, alpha));
      gradient.addColorStop(0.65, colorCss(color, alpha * 0.55));
      gradient.addColorStop(1, colorCss(color, 0));
      c.fillStyle = gradient;
      c.beginPath();
      c.arc(0, 0, radius, 0, TAU);
      c.fill();
    });
  }

  // Fine directional blade strokes — this is what reads as "grass" up close.
  for (let i = 0; i < 2600; i += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const length = 5 + Math.pow(rng(), 1.65) * 21;
    const lean = (rng() - 0.5) * length * 1.15;
    const colorRoll = rng();
    const color = colorRoll < 0.52 ? dark : colorRoll < 0.82 ? light : ground;
    const alpha = 0.11 + rng() * 0.34;
    const lineWidth = 0.55 + rng() * 1.25;
    drawWrapped(ctx, size, x, y, 40, (c) => {
      c.strokeStyle = colorCss(color, alpha);
      c.lineWidth = lineWidth;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(lean * 0.24, -length * 0.58, lean, -length);
      c.stroke();
    });
  }

  // A sparse second pass of sunlit tips.
  for (let i = 0; i < 620; i += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const length = 4 + rng() * 13;
    const lean = (rng() - 0.5) * length;
    drawWrapped(ctx, size, x, y, 28, (c) => {
      c.strokeStyle = colorCss(light, 0.16 + rng() * 0.24);
      c.lineWidth = 0.5 + rng() * 0.8;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(lean * 0.3, -length * 0.55, lean, -length);
      c.stroke();
    });
  }

  // Sub-pixel grain; avoids the slightly soapy look of pure gradients.
  const image = ctx.getImageData(0, 0, size, size);
  const pixels = image.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const n = (rng() - 0.5) * 18;
    pixels[i] = clamp(pixels[i] + n, 0, 255);
    pixels[i + 1] = clamp(pixels[i + 1] + n * 1.06, 0, 255);
    pixels[i + 2] = clamp(pixels[i + 2] + n * 0.8, 0, 255);
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(envCfg.grassRepeat, envCfg.grassRepeat);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

/** Soft cloud texture painted from radial puffs. Two silhouettes: cumulus / wisp. */
function createCloudTexture(seed, kind) {
  const wispy = kind === 'wispy';
  const width = 512;
  const height = wispy ? 128 : 256;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(seed);

  const white = new THREE.Color('#ffffff');
  const cool = new THREE.Color('#aec4da');

  if (wispy) {
    for (let i = 0; i < 22; i += 1) {
      const x = width * 0.5 + (rng() - 0.5) * width * 0.68;
      const y = height * 0.5 + (rng() - 0.5) * height * 0.34;
      paintPuff(ctx, x, y, 55 + rng() * 130, 7 + rng() * 15, white, 0.05 + rng() * 0.105);
    }
    for (let i = 0; i < 8; i += 1) {
      const x = width * 0.5 + (rng() - 0.5) * width * 0.45;
      const y = height * 0.48 + (rng() - 0.5) * height * 0.2;
      paintPuff(ctx, x, y, 42 + rng() * 80, 5 + rng() * 8, white, 0.09 + rng() * 0.08);
    }
  } else {
    const baseY = height * 0.69;

    // Volume shadow along the underside.
    for (let i = 0; i < 11; i += 1) {
      const t = (i + 0.5) / 11;
      const x = lerp(width * 0.15, width * 0.85, t) + (rng() - 0.5) * 28;
      const y = baseY + (rng() - 0.35) * 11;
      paintPuff(ctx, x, y, 58 + rng() * 74, 20 + rng() * 17, cool, 0.09 + rng() * 0.08);
    }

    // Main cauliflower body; arch shape keeps the top round and the base flat.
    for (let i = 0; i < 26; i += 1) {
      const t = clamp(0.06 + rng() * 0.88, 0, 1);
      const arch = Math.sin(Math.PI * t);
      const x = lerp(width * 0.1, width * 0.9, t) + (rng() - 0.5) * 22;
      const y = baseY - arch * height * 0.27 - rng() * height * 0.1;
      const radius = 28 + rng() * 40 + arch * 24;
      paintPuff(ctx, x, y, radius * 1.12, radius * 0.88, white, 0.13 + rng() * 0.16);
    }

    // Bright, tightly packed tops.
    for (let i = 0; i < 13; i += 1) {
      const x = width * 0.5 + (rng() - 0.5) * width * 0.52;
      const y = height * 0.36 + (rng() - 0.5) * height * 0.13;
      paintPuff(ctx, x, y, 22 + rng() * 36, 18 + rng() * 28, white, 0.16 + rng() * 0.15);
    }
  }

  // Feather the rectangular canvas edges so sprites never show a hard border.
  ctx.globalCompositeOperation = 'destination-out';
  const fadeX = width * 0.15;
  const fadeY = height * 0.18;
  const left = ctx.createLinearGradient(0, 0, fadeX, 0);
  left.addColorStop(0, 'rgba(0,0,0,1)');
  left.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, fadeX, height);
  const right = ctx.createLinearGradient(width, 0, width - fadeX, 0);
  right.addColorStop(0, 'rgba(0,0,0,1)');
  right.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = right;
  ctx.fillRect(width - fadeX, 0, fadeX, height);
  const top = ctx.createLinearGradient(0, 0, 0, fadeY);
  top.addColorStop(0, 'rgba(0,0,0,1)');
  top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, fadeY);
  const bottom = ctx.createLinearGradient(0, height, 0, height - fadeY);
  bottom.addColorStop(0, 'rgba(0,0,0,1)');
  bottom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, height - fadeY, width, fadeY);
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Tiny daisy-like wildflower on transparent background. */
function createFlowerTexture() {
  const size = 128;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size * 0.5;
  const baseY = size - 4;

  // Stem.
  ctx.strokeStyle = '#3f6b2e';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.quadraticCurveTo(cx - 4, size * 0.66, cx + 1, size * 0.44);
  ctx.stroke();

  // Leaves.
  ctx.fillStyle = '#4d7d35';
  for (const [lx, ly, rx, ry, angle] of [
    [cx - 11, size * 0.73, 10, 4, -0.55],
    [cx + 12, size * 0.63, 9, 3.6, 0.5],
  ]) {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Petals.
  const petalColor = '#fbf7ea';
  const petalCount = 7;
  for (let i = 0; i < petalCount; i += 1) {
    const angle = (i / petalCount) * TAU;
    const px = cx + Math.cos(angle) * 9.5;
    const py = size * 0.34 + Math.sin(angle) * 9.5;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = petalColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.5, 4.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Pollen centre.
  const centre = ctx.createRadialGradient(cx, size * 0.34, 0, cx, size * 0.34, 5.4);
  centre.addColorStop(0, '#ffe082');
  centre.addColorStop(1, '#efb93f');
  ctx.fillStyle = centre;
  ctx.beginPath();
  ctx.arc(cx, size * 0.34, 5.4, 0, TAU);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Radial falloff used as a soft ambient-occlusion/contact shadow decal. */
function createContactShadowTexture() {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const radius = size * 0.5;
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,0.58)');
  gradient.addColorStop(0.28, 'rgba(0,0,0,0.46)');
  gradient.addColorStop(0.58, 'rgba(0,0,0,0.2)');
  gradient.addColorStop(0.82, 'rgba(0,0,0,0.055)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * One tapered, gently folded grass blade. Height is 1 so instance scaling can
 * set the real blade length in millimetres; normals are biased upward so the
 * meadow catches the sun instead of reading as a field of black slivers.
 */
function createBladeGeometry(rng) {
  const segments = 5;
  const halfWidth = 0.032 + rng() * 0.018;
  const bend = 0.08 + rng() * 0.16;
  const twist = (rng() - 0.5) * 0.8;

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const taper = Math.pow(1 - t, 0.72);
    const w = halfWidth * taper;
    const angle = twist * t;
    const cx = Math.sin(t * 1.5) * bend * 0.35;
    const cz = t * t * bend;
    const dx = Math.cos(angle) * w;
    const dz = Math.sin(angle) * w;

    positions.push(cx - dx, t, cz - dz, cx + dx, t, cz + dz);

    const nx = Math.sin(angle) * 0.42;
    const ny = 0.9;
    const nz = Math.cos(angle) * 0.55;
    const invLength = 1 / Math.hypot(nx, ny, nz);
    normals.push(nx * invLength, ny * invLength, nz * invLength);
    normals.push(nx * invLength, ny * invLength, nz * invLength);

    uvs.push(0, t, 1, t);
  }

  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Two crossed vertical quads — cheap camera-facing-ish wildflower billboards. */
function createCrossedBillboardGeometry() {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const addQuad = (axis) => {
    const base = positions.length / 3;
    if (axis === 'x') {
      positions.push(-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0);
      normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
    } else {
      positions.push(0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
    }
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  addQuad('x');
  addQuad('z');

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Adds a tiny time-driven sway to a grass material without touching instances. */
function applyGrassSway(material, timeUniform) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassTime = timeUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uGrassTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 instanceOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float swayPhase = instanceOrigin.x * 0.042 + instanceOrigin.z * 0.058;
  float tipWeight = clamp(position.y, 0.0, 1.0);
  tipWeight *= tipWeight;
  float sway = sin(uGrassTime * 1.35 + swayPhase) * 0.055
             + sin(uGrassTime * 2.27 + swayPhase * 1.73) * 0.022;
  transformed.x += sway * tipWeight;
  transformed.z += sway * 0.62 * tipWeight;
#endif`
      );
  };
}

/* ------------------------------------------------------------------ */
/* Sky shader                                                          */
/* ------------------------------------------------------------------ */

const SKY_VERTEX_SHADER = /* glsl */ `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uTopColor;
uniform vec3 uHorizonColor;
uniform vec3 uZenithGlow;
uniform vec3 uSunColor;
uniform vec3 uSunDirection;
uniform float uExposure;

varying vec3 vWorldPosition;

void main() {
  vec3 direction = normalize(vWorldPosition - cameraPosition);
  float height = clamp(direction.y, -1.0, 1.0);
  float up = max(height, 0.0);

  // Horizon → zenith gradient. A low exponent is important here: the hero
  // camera only frames the first ~5° of sky, so the blue has to arrive fast.
  float t = pow(up, 0.3);
  vec3 sky = mix(uHorizonColor, uTopColor, t);

  // Cool zenith lift keeps the deep blue from feeling like a flat poster.
  float zenith = smoothstep(0.12, 1.0, up);
  sky = mix(sky, uZenithGlow, zenith * 0.22);

  // A restrained haze band — enough atmosphere without bleaching the horizon.
  float haze = exp(-up * 10.0);
  sky = mix(sky, uHorizonColor, haze * 0.16);

  vec3 sunDir = normalize(uSunDirection);
  float cosSun = max(dot(direction, sunDir), 0.0);

  // Broad atmospheric scattering around the sun.
  float scatter = pow(cosSun, 6.0) * 0.14 + pow(cosSun, 32.0) * 0.24 + pow(cosSun, 180.0) * 0.42;
  sky += uSunColor * scatter;

  // Tight halo just outside the disc.
  sky += uSunColor * pow(cosSun, 1200.0) * 0.85;

  // The sun disc itself — slightly enlarged for a hero-shot feel.
  float disc = smoothstep(0.99982, 0.99993, cosSun);
  sky += uSunColor * disc * 2.3;

  // Warm haze band where the sun azimuth meets the horizon.
  vec2 horizonDir = direction.xz;
  float horizonLength = length(horizonDir);
  horizonDir = horizonLength > 0.0001 ? horizonDir / horizonLength : vec2(1.0, 0.0);
  vec2 sunHorizon = normalize(sunDir.xz + vec2(0.0001));
  float azimuth = max(dot(horizonDir, sunHorizon), 0.0);
  sky += uSunColor * pow(azimuth, 6.0) * exp(-up * 7.0) * 0.1;

  // Below the horizon we only ever see a soft ground haze.
  vec3 below = mix(uHorizonColor, uTopColor, 0.24);
  sky = mix(sky, below, smoothstep(0.0, 0.18, -height));

  // Subtle dither kills gradient banding in the 8-bit framebuffer.
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  sky += vec3((dither - 0.5) * 0.0035);

  gl_FragColor = vec4(sky * uExposure, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function createSkyMaterial(envCfg, sunDirection, exposure = 1) {
  return new THREE.ShaderMaterial({
    name: 'AQUA_PURE_SKY',
    uniforms: {
      uTopColor: { value: new THREE.Color(envCfg.skyTop) },
      uHorizonColor: { value: new THREE.Color(envCfg.skyHorizon) },
      uZenithGlow: { value: new THREE.Color(envCfg.skyZenithGlow) },
      uSunColor: { value: new THREE.Color(envCfg.sunColor) },
      uSunDirection: { value: sunDirection.clone() },
      uExposure: { value: exposure },
    },
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    // The sky is a painted backdrop rather than a lit surface; letting ACES
    // desaturate it would wash the horizon out to grey in the product framing.
    toneMapped: false,
  });
}

/* ------------------------------------------------------------------ */
/* Environment assembly                                                */
/* ------------------------------------------------------------------ */

export function createEnvironment({ scene, renderer, config = CONFIG } = {}) {
  if (!scene || !renderer) {
    throw new Error('[AQUA PURE] createEnvironment requires { scene, renderer }.');
  }

  const envCfg = config.environment ?? CONFIG.environment;
  const renderCfg = config.render ?? CONFIG.render;

  const root = new THREE.Group();
  root.name = 'AQUA_PURE_ENVIRONMENT';
  scene.add(root);

  const sunDirection = new THREE.Vector3(...envCfg.sunDirection).normalize();

  /* ------------------------------------------------------------------ */
  /* Renderer state                                                      */
  /* ------------------------------------------------------------------ */

  if (renderer.toneMapping === THREE.NoToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  renderer.toneMappingExposure = renderCfg.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  /* ------------------------------------------------------------------ */
  /* Sky dome                                                            */
  /* ------------------------------------------------------------------ */

  const skyRadius = Math.max(24000, envCfg.fogFar * 1.3);
  const skyMaterial = createSkyMaterial(envCfg, sunDirection, renderCfg.exposure);
  const skyGeometry = new THREE.SphereGeometry(skyRadius, 48, 24);
  const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
  skyDome.name = 'AQUA_PURE_SKY_DOME';
  skyDome.renderOrder = -1000;
  skyDome.frustumCulled = false;
  root.add(skyDome);

  /* ------------------------------------------------------------------ */
  /* Lighting rig                                                        */
  /* ------------------------------------------------------------------ */

  const bottleCenter = new THREE.Vector3(0, 96, 0);

  const sunLight = new THREE.DirectionalLight(new THREE.Color(envCfg.sunColor), envCfg.sunIntensity);
  sunLight.name = 'AQUA_PURE_SUN';
  sunLight.position.copy(bottleCenter).addScaledVector(sunDirection, 1500);
  sunLight.target.position.copy(bottleCenter);
  sunLight.castShadow = true;

  const shadow = sunLight.shadow;
  shadow.mapSize.set(renderCfg.shadowMapSize, renderCfg.shadowMapSize);
  shadow.camera.left = -210;
  shadow.camera.right = 210;
  shadow.camera.top = 240;
  shadow.camera.bottom = -240;
  shadow.camera.near = 500;
  shadow.camera.far = 2600;
  shadow.camera.updateProjectionMatrix();
  shadow.bias = -0.00018;
  shadow.normalBias = 0.32;
  shadow.radius = 2;

  root.add(sunLight);
  root.add(sunLight.target);

  const hemiSky = new THREE.Color(envCfg.skyTop).lerp(new THREE.Color(envCfg.skyHorizon), 0.58);
  const hemiGround = new THREE.Color(envCfg.groundColor).lerp(new THREE.Color(envCfg.grassLight), 0.4);
  const hemiLight = new THREE.HemisphereLight(hemiSky, hemiGround, envCfg.hemiIntensity);
  hemiLight.name = 'AQUA_PURE_HEMI';
  root.add(hemiLight);

  // Cool rim from behind the bottle separates the clear PET from the meadow.
  const rimLight = new THREE.DirectionalLight(new THREE.Color('#cfe7ff'), envCfg.rimIntensity);
  rimLight.name = 'AQUA_PURE_RIM';
  rimLight.position.set(-620, 420, -560);
  rimLight.target.position.copy(bottleCenter);
  root.add(rimLight);
  root.add(rimLight.target);

  /* ------------------------------------------------------------------ */
  /* Ground meadow                                                       */
  /* ------------------------------------------------------------------ */

  const grassTexture = createGrassTexture(envCfg, renderer);
  const groundSize = envCfg.grassSize;
  const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 96, 96);
  groundGeometry.rotateX(-Math.PI / 2);

  const positionAttribute = groundGeometry.getAttribute('position');
  const colors = new Float32Array(positionAttribute.count * 3);
  const tint = new THREE.Color();

  for (let i = 0; i < positionAttribute.count; i += 1) {
    const x = positionAttribute.getX(i);
    const z = positionAttribute.getZ(i);
    const distance = Math.hypot(x, z);

    // Gentle swells far from the product plinth; dead flat under the bottle.
    const ripple = (valueNoise2D(x * 0.00042 + 11.3, z * 0.00042 - 7.7) - 0.5) * 150;
    const swell = (valueNoise2D(x * 0.00018 - 4.1, z * 0.00018 + 9.2) - 0.5) * 120;
    positionAttribute.setY(i, smoothstep(900, 5200, distance) * (ripple + swell) * 0.5);

    const macro = valueNoise2D(x * 0.00055 + 3.1, z * 0.00055 - 2.4);
    const micro = valueNoise2D(x * 0.0042 - 8.3, z * 0.0042 + 5.6);
    const shade = macro * 0.62 + micro * 0.38;
    // Keep the vertex tint close to white: the painted map owns the colour and
    // this only supplies large-scale brightness / yellow-green variation.
    const brightness = 0.88 + shade * 0.26;
    tint.setRGB(brightness, brightness * 1.01, brightness * 0.91);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  groundGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  groundGeometry.computeVertexNormals();

  const groundMaterial = new THREE.MeshStandardMaterial({
    name: 'AQUA_PURE_MEADOW',
    map: grassTexture,
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
    dithering: true,
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.name = 'AQUA_PURE_GROUND';
  ground.receiveShadow = true;
  root.add(ground);

  /* ------------------------------------------------------------------ */
  /* Near-field instanced grass                                          */
  /* ------------------------------------------------------------------ */

  const grassTime = { value: 0 };
  const bladeCount = Math.max(0, Math.round(envCfg.grassBlades));
  const bladeRadius = envCfg.grassBladeRadius;
  const bladeRng = mulberry32(0x51ee7);
  const bladeVariants = 3;
  const variantGeometries = [];
  for (let v = 0; v < bladeVariants; v += 1) {
    variantGeometries.push(createBladeGeometry(bladeRng));
  }

  const bladeMaterials = variantGeometries.map(() => {
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide,
      dithering: true,
    });
    material.shadowSide = THREE.DoubleSide;
    applyGrassSway(material, grassTime);
    return material;
  });

  const bladeDark = new THREE.Color(envCfg.grassDark);
  const bladeLight = new THREE.Color(envCfg.grassLight);
  const bladeBase = new THREE.Color(envCfg.groundColor);
  const dummy = new THREE.Object3D();
  const bladeColor = new THREE.Color();

  const bladesPerVariant = Math.ceil(bladeCount / bladeVariants);
  let bladesRemaining = bladeCount;

  for (let v = 0; v < bladeVariants; v += 1) {
    const count = Math.min(bladesPerVariant, bladesRemaining);
    bladesRemaining -= count;
    if (count <= 0) continue;

    const mesh = new THREE.InstancedMesh(variantGeometries[v], bladeMaterials[v], count);
    mesh.name = `AQUA_PURE_GRASS_${v}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    for (let i = 0; i < count; i += 1) {
      const angle = bladeRng() * TAU;
      // Manicured meadow: keep a clean presentation ring around the bottle,
      // then fill the near field with short blades out to ~520 mm.
      const radius = 75 + Math.sqrt(bladeRng()) * Math.max(1, bladeRadius - 75);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 14 + bladeRng() * 24;
      const widthScale = height * (0.3 + bladeRng() * 0.18);

      dummy.position.set(x, 0, z);
      dummy.rotation.set((bladeRng() - 0.5) * 0.16, bladeRng() * TAU, (bladeRng() - 0.5) * 0.16);
      dummy.scale.set(widthScale, height, widthScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Varied greens: a few yellow-green sun blades, some deeper shade.
      bladeColor.copy(bladeDark).lerp(bladeLight, Math.pow(bladeRng(), 0.7));
      bladeColor.lerp(bladeBase, bladeRng() * 0.28);
      bladeColor.offsetHSL((bladeRng() - 0.5) * 0.035, (bladeRng() - 0.5) * 0.1, (bladeRng() - 0.5) * 0.08);
      mesh.setColorAt(i, bladeColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
  }

  /* ------------------------------------------------------------------ */
  /* Wildflower billboards                                               */
  /* ------------------------------------------------------------------ */

  const flowerTexture = createFlowerTexture();
  const flowerGeometry = createCrossedBillboardGeometry();
  const flowerRng = mulberry32(0xf10a3);

  const flowerPalettes = [
    { color: '#ffffff', count: 30 },
    { color: '#ffe8a3', count: 20 },
  ];

  for (let paletteIndex = 0; paletteIndex < flowerPalettes.length; paletteIndex += 1) {
    const palette = flowerPalettes[paletteIndex];
    const material = new THREE.MeshStandardMaterial({
      map: flowerTexture,
      color: new THREE.Color(palette.color),
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0,
    });
    const mesh = new THREE.InstancedMesh(flowerGeometry, material, palette.count);
    mesh.name = `AQUA_PURE_FLOWERS_${paletteIndex}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    for (let i = 0; i < palette.count; i += 1) {
      const angle = flowerRng() * TAU;
      const radius = 55 + Math.sqrt(flowerRng()) * 640;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 20 + flowerRng() * 18;
      const width = height * (0.46 + flowerRng() * 0.16);

      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, flowerRng() * TAU, 0);
      dummy.scale.set(width, height, width);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  }

  /* ------------------------------------------------------------------ */
  /* Contact shadow decal                                                */
  /* ------------------------------------------------------------------ */

  const contactShadowTexture = createContactShadowTexture();
  const contactShadowSize = envCfg.contactShadowSize;
  const contactShadowGeometry = new THREE.PlaneGeometry(contactShadowSize, contactShadowSize);
  contactShadowGeometry.rotateX(-Math.PI / 2);
  const contactShadowMaterial = new THREE.MeshBasicMaterial({
    name: 'AQUA_PURE_CONTACT_SHADOW',
    map: contactShadowTexture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const contactShadow = new THREE.Mesh(contactShadowGeometry, contactShadowMaterial);
  contactShadow.name = 'AQUA_PURE_CONTACT_SHADOW';
  contactShadow.position.y = 0.5;
  contactShadow.scale.set(1.06, 1, 0.9);
  contactShadow.renderOrder = 2;
  root.add(contactShadow);

  /* ------------------------------------------------------------------ */
  /* Clouds                                                              */
  /* ------------------------------------------------------------------ */

  const cloudTextures = {
    cumulus: [0, 1, 2].map((i) => createCloudTexture(0xc10d + i * 977, 'cumulus')),
    wispy: [0, 1].map((i) => createCloudTexture(0x9e55 + i * 613, 'wispy')),
  };
  const cloudRng = mulberry32(0xc10d5a);
  const cloudGroup = new THREE.Group();
  cloudGroup.name = 'AQUA_PURE_CLOUDS';
  root.add(cloudGroup);

  const cloudDrift = [];
  const cloudCount = Math.max(1, Math.round(envCfg.clouds));
  const sunAzimuth = Math.atan2(sunDirection.z, sunDirection.x);
  const cloudSunColor = new THREE.Color(envCfg.sunColor);

  // The hero camera only frames the first few degrees above the horizon, so a
  // couple of soft low clouds are placed deliberately in that top band. The
  // remainder keeps the taller, distant layer for when the visitor looks up.
  const cameraStart = config.camera?.start ?? [318, 208, 362];
  const heroViewAzimuth = Math.atan2(cameraStart[2], cameraStart[0]) + Math.PI;
  const lowCloudCount = Math.min(3, cloudCount);

  for (let i = 0; i < cloudCount; i += 1) {
    const lowBand = i < lowCloudCount;
    const wispy = !lowBand && i % 3 === 2;

    let angle;
    let radius;
    let y;
    let width;
    let height;
    let opacity;

    if (lowBand) {
      // Placed just above the horizon in the hero camera's opening frame:
      // two to four quiet clouds, offset so the bottle does not hide them all.
      const heroOffsets = [-0.34, 0.08, 0.36];
      angle = heroViewAzimuth + heroOffsets[i % heroOffsets.length] + (cloudRng() - 0.5) * 0.08;
      radius = 9500 + cloudRng() * 3500;
      const elevation = THREE.MathUtils.degToRad(2.6 + cloudRng() * 3.0);
      y = 208 + Math.tan(elevation) * radius;
      width = 1900 + cloudRng() * 700;
      height = width * (0.4 + cloudRng() * 0.1);
      opacity = 0.5 + cloudRng() * 0.16;
    } else {
      angle = (i / cloudCount) * TAU + (cloudRng() - 0.5) * 0.5;
      radius = Math.sqrt(lerp(envCfg.cloudMinRadius ** 2, envCfg.cloudMaxRadius ** 2, cloudRng()));
      y = wispy
        ? lerp(envCfg.cloudMaxY * 0.75, envCfg.cloudMaxY, cloudRng())
        : lerp(envCfg.cloudMinY, envCfg.cloudMaxY * 0.8, Math.pow(cloudRng(), 0.82));
      width = radius * (wispy ? 0.46 + cloudRng() * 0.22 : 0.3 + cloudRng() * 0.19);
      height = wispy ? width * (0.14 + cloudRng() * 0.05) : width * (0.4 + cloudRng() * 0.12);
      opacity = wispy ? 0.3 + cloudRng() * 0.14 : 0.62 + cloudRng() * 0.22;
    }

    const texturePool = wispy ? cloudTextures.wispy : cloudTextures.cumulus;
    const texture = texturePool[Math.floor(cloudRng() * texturePool.length)];

    const warmth = Math.pow(Math.max(0, Math.cos(angle - sunAzimuth)), 2);
    const baseColor = new THREE.Color(wispy ? '#f4faff' : '#ffffff').lerp(cloudSunColor, warmth * 0.3);

    const material = new THREE.SpriteMaterial({
      map: texture,
      color: baseColor,
      transparent: true,
      opacity,
      depthWrite: false,
      fog: false,
      toneMapped: true,
    });
    material.rotation = (cloudRng() - 0.5) * 0.07;

    const sprite = new THREE.Sprite(material);
    sprite.name = `AQUA_PURE_CLOUD_${i}`;
    sprite.scale.set(width, height, 1);
    sprite.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    sprite.renderOrder = 1;
    cloudGroup.add(sprite);

    cloudDrift.push({
      sprite,
      angle,
      radius,
      speed: (8 + cloudRng() * 18) / radius,
      baseY: y,
      bobPhase: cloudRng() * TAU,
      bobAmount: 8 + cloudRng() * 16,
    });

    // A second, smaller layer gives the taller cumulus real depth. The low-band
    // clouds stay single-sprites so they read as quiet background detail.
    if (!wispy && !lowBand) {
      const layerTexture = cloudTextures.cumulus[Math.floor(cloudRng() * cloudTextures.cumulus.length)];
      const layerMaterial = new THREE.SpriteMaterial({
        map: layerTexture,
        color: baseColor.clone(),
        transparent: true,
        opacity: 0.32 + cloudRng() * 0.22,
        depthWrite: false,
        fog: false,
        toneMapped: true,
      });
      layerMaterial.rotation = (cloudRng() - 0.5) * 0.1;
      const layer = new THREE.Sprite(layerMaterial);
      layer.name = `AQUA_PURE_CLOUD_${i}_LAYER`;
      layer.scale.set(width * (0.58 + cloudRng() * 0.22), height * (0.55 + cloudRng() * 0.2), 1);
      layer.position.set(
        Math.cos(angle + (cloudRng() - 0.5) * 0.035) * radius * (0.96 + cloudRng() * 0.06),
        y + height * (0.08 + cloudRng() * 0.16),
        Math.sin(angle + (cloudRng() - 0.5) * 0.035) * radius * (0.96 + cloudRng() * 0.06)
      );
      layer.renderOrder = 1;
      cloudGroup.add(layer);

      cloudDrift.push({
        sprite: layer,
        angle,
        radius,
        speed: (8 + cloudRng() * 18) / radius,
        baseY: layer.position.y,
        bobPhase: cloudRng() * TAU,
        bobAmount: 5 + cloudRng() * 10,
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Fog / background                                                    */
  /* ------------------------------------------------------------------ */

  const previousFog = scene.fog ?? null;
  const previousBackground = scene.background ?? null;
  const previousEnvironment = scene.environment ?? null;
  const previousEnvironmentIntensity = scene.environmentIntensity ?? 1;

  const fog = new THREE.Fog(new THREE.Color(envCfg.fogColor), envCfg.fogNear, envCfg.fogFar);
  const environmentBackground = new THREE.Color(envCfg.skyHorizon);
  scene.fog = fog;
  scene.background = environmentBackground;

  /* ------------------------------------------------------------------ */
  /* Procedural PMREM environment map                                    */
  /* ------------------------------------------------------------------ */

  let environmentTarget = null;
  let pmremGenerator = null;

  try {
    const envScene = new THREE.Scene();
    const envSkyMaterial = createSkyMaterial(envCfg, sunDirection, 1);
    const envSkyGeometry = new THREE.SphereGeometry(22000, 40, 20);
    const envSky = new THREE.Mesh(envSkyGeometry, envSkyMaterial);
    envSky.renderOrder = -1000;
    envSky.frustumCulled = false;
    envScene.add(envSky);

    const envGroundGeometry = new THREE.CircleGeometry(30000, 64);
    envGroundGeometry.rotateX(-Math.PI / 2);
    const envGroundMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(envCfg.groundColor),
      fog: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const envGround = new THREE.Mesh(envGroundGeometry, envGroundMaterial);
    envGround.position.y = -8;
    envScene.add(envGround);

    pmremGenerator = new THREE.PMREMGenerator(renderer);
    environmentTarget = pmremGenerator.fromScene(envScene, 0.02, 1, 50000, {
      size: 256,
      position: new THREE.Vector3(0, 30, 0),
    });
    pmremGenerator.dispose();
    pmremGenerator = null;

    scene.environment = environmentTarget.texture;
    scene.environmentIntensity = envCfg.environmentIntensity;

    envSkyGeometry.dispose();
    envSkyMaterial.dispose();
    envGroundGeometry.dispose();
    envGroundMaterial.dispose();
  } catch (error) {
    if (pmremGenerator) {
      pmremGenerator.dispose();
      pmremGenerator = null;
    }
    console.warn('[AQUA PURE] Procedural PMREM environment generation failed.', error);
  }

  /* ------------------------------------------------------------------ */
  /* Update / API                                                        */
  /* ------------------------------------------------------------------ */

  let elapsedTime = 0;
  let disposed = false;

  function update(dt = 0, elapsed = 0) {
    if (disposed) return;

    const delta = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
    elapsedTime += delta;
    const time = Number.isFinite(elapsed) ? elapsed : elapsedTime;

    grassTime.value = time;
    if (skyMaterial.uniforms.uExposure) {
      skyMaterial.uniforms.uExposure.value = renderer.toneMappingExposure;
    }

    for (let i = 0; i < cloudDrift.length; i += 1) {
      const cloud = cloudDrift[i];
      cloud.angle += cloud.speed * delta;
      cloud.sprite.position.x = Math.cos(cloud.angle) * cloud.radius;
      cloud.sprite.position.z = Math.sin(cloud.angle) * cloud.radius;
      cloud.sprite.position.y = cloud.baseY + Math.sin(time * 0.11 + cloud.bobPhase) * cloud.bobAmount;
    }
  }

  function setEnvironmentIntensity(value) {
    if (disposed) return;
    const intensity = Number.isFinite(value) ? Math.max(0, value) : 0;
    scene.environmentIntensity = intensity;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;

    scene.remove(root);

    const seenTextures = new Set();
    root.traverse((object) => {
      if (object.geometry) object.geometry.dispose();

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) {
          if (value && value.isTexture && !seenTextures.has(value)) {
            seenTextures.add(value);
            value.dispose();
          }
        }
        material.dispose();
      }
    });

    if (environmentTarget) {
      if (scene.environment === environmentTarget.texture) {
        scene.environment = previousEnvironment;
      }
      environmentTarget.dispose();
      environmentTarget = null;
    }

    if (scene.fog === fog) scene.fog = previousFog;
    if (scene.background === environmentBackground) scene.background = previousBackground;
    scene.environmentIntensity = previousEnvironmentIntensity;
  }

  return {
    update,
    sunDirection,
    setEnvironmentIntensity,
    dispose,
  };
}
