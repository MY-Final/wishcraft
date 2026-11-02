/**
 * GARGANTUA — Schwarzschild black hole raytracer.
 *
 * The whole image is produced by one full-screen fragment shader. Every pixel
 * launches a null geodesic in Schwarzschild spacetime and integrates the
 * Binet equation for light
 *
 *     d²u/dφ² + u = 3 M u²,        u = 1 / r
 *
 * with RK4 in the orbital plane. Nothing in the core image is a texture, a
 * sphere or a ring mesh: the shadow, photon ring, lensed disk images and
 * multiple disk crossings are all consequences of the integration.
 *
 * Units: r_s = 2M = 1. M = 0.5, photon sphere r = 1.5, ISCO r = 3,
 * critical impact parameter b_c = 3√3 M ≈ 2.598.
 *
 * The shader also carries the procedural sky (stars + Milky Way), the
 * accretion-disk emission model (Shakura–Sunyaev temperature, Keplerian
 * turbulence, Doppler beaming, gravitational redshift) and the ten debug
 * visualisations used by the HUD.
 */

export const BLACKHOLE_VERT = /* glsl */ `precision highp float;
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const BLACKHOLE_FRAG = /* glsl */ `precision highp float;
precision highp int;

out vec4 fragColor;

// ─── frame ───────────────────────────────────────────────────────────────────
uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uCamRight;
uniform vec3  uCamUp;
uniform vec3  uCamForward;
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uPixelAngle;

// ─── integration ─────────────────────────────────────────────────────────────
uniform float uStepAngle;
uniform int   uMaxSteps;
uniform int   uDebug;

// ─── the 21 live parameters ─────────────────────────────────────────────────
uniform float uDiskBrightness;
uniform float uDiskTemperature;
uniform float uDiskInner;
uniform float uDiskOuter;
uniform float uDiskThickness;
uniform float uDiskOpacity;
uniform float uDiskTurbulence;
uniform float uDiskSpinSpeed;
uniform float uBeaming;
uniform float uRedshift;
uniform float uPhotonRingBoost;
uniform float uStarBrightness;
uniform float uGalaxyBrightness;

#define MAX_STEPS 448
#define RS 1.0
#define MASS 0.5

const vec3 DISK_AXIS = vec3(0.0, 1.0, 0.0);

// ─── hashing / noise ────────────────────────────────────────────────────────
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

float fbm3(vec3 p) {
  float amp = 0.5;
  float sum = 0.0;
  for (int i = 0; i < 5; i++) {
    sum += amp * vnoise(p);
    p = p * 2.03 + vec3(11.7, 5.3, 7.9);
    amp *= 0.5;
  }
  return sum;
}

float fbm4(vec3 p) {
  float amp = 0.55;
  float sum = 0.0;
  for (int i = 0; i < 4; i++) {
    sum += amp * vnoise(p);
    p = p * 2.07 + vec3(3.1, 9.7, 1.3);
    amp *= 0.5;
  }
  return sum;
}

// ─── colour ────────────────────────────────────────────────────────────────
// Planck-locus approximation (Tanner Helland), returned in linear RGB.
vec3 blackbodyLinear(float kelvin) {
  float t = clamp(kelvin, 900.0, 40000.0) / 100.0;
  vec3 c;
  if (t <= 66.0) {
    c.r = 1.0;
    c.g = clamp(0.3900815787 * log(t) - 0.6318414437, 0.0, 1.0);
    c.b = t <= 19.0 ? 0.0 : clamp(0.5432067891 * log(t - 10.0) - 1.1962540891, 0.0, 1.0);
  } else {
    c.r = clamp(1.2929361860 * pow(t - 60.0, -0.1332047592), 0.0, 1.0);
    c.g = clamp(1.1298908608 * pow(t - 60.0, -0.0755148492), 0.0, 1.0);
    c.b = 1.0;
  }
  return pow(c, vec3(2.2));
}

vec3 turbo(float x) {
  x = clamp(x, 0.0, 1.0);
  vec3 c = vec3(0.0);
  c.r = clamp(1.61 * x - 0.19, 0.0, 1.0);
  c.g = clamp(1.35 * x + 0.32 * sin(3.14159 * x), 0.0, 1.0);
  c.b = clamp(1.9 - 2.2 * x, 0.0, 1.0);
  c += 0.25 * vec3(0.2, 0.1, 0.3) * sin(6.28318 * x);
  return clamp(c, 0.0, 1.0);
}

vec3 divergingG(float g) {
  // g < 1 → redshifted (warm), g > 1 → blueshifted (cool), g ≈ 1 → white.
  float d = clamp((g - 1.0) * 2.5, -1.0, 1.0);
  vec3 warm = vec3(1.0, 0.28, 0.06);
  vec3 cool = vec3(0.16, 0.48, 1.0);
  vec3 col = mix(vec3(0.86, 0.86, 0.82), warm, clamp(-d, 0.0, 1.0));
  col = mix(col, cool, clamp(d, 0.0, 1.0));
  return col;
}

// ─── procedural sky (no textures) ──────────────────────────────────────────
// Stars live in (azimuth, elevation) cells so their point-spread function is
// isotropic on the sky. The core radius is clamped to at least one pixel to
// avoid sub-pixel aliasing under lensing.
vec3 starLayer(vec3 dir, float scale, float density, float seed, float bright) {
  float azimuth = atan(dir.z, dir.x);
  float elevation = asin(clamp(dir.y, -1.0, 1.0));
  vec2 p = vec2(azimuth, elevation) * scale;
  vec2 cell = floor(p);
  vec2 f = p - cell - 0.5;

  float existence = hash31(vec3(cell, seed));
  if (existence < density) return vec3(0.0);

  vec2 jitter = (vec2(
    hash31(vec3(cell, seed + 3.7)),
    hash31(vec3(cell, seed + 8.1))
  ) - 0.5) * 0.82;

  float magnitude = pow(hash31(vec3(cell, seed + 13.9)), 6.0);
  float angular = length(f - jitter) / scale;
  float radius = uPixelAngle * (0.85 + 1.7 * magnitude);
  float core = smoothstep(radius, radius * 0.1, angular);
  float halo = smoothstep(radius * 3.6, 0.0, angular) * 0.07;
  float intensity = (core + halo) * (0.18 + 3.2 * magnitude) * bright;

  float temperature = mix(3200.0, 16000.0, pow(hash31(vec3(cell, seed + 21.1)), 1.7));
  vec3 tint = blackbodyLinear(temperature);
  tint = mix(vec3(1.0), tint, 0.66);
  return tint * intensity;
}

vec3 starField(vec3 dir) {
  float twinkle = 0.94 + 0.06 * sin(uTime * 2.1 + dot(dir, vec3(41.0, 17.0, 7.0)));
  vec3 col = vec3(0.0);
  col += starLayer(dir, 26.0, 0.915, 1.7, 1.0);
  col += starLayer(dir, 72.0, 0.945, 7.3, 0.7);
  col += starLayer(dir, 188.0, 0.962, 19.1, 0.45);
  col += starLayer(dir, 11.0, 0.992, 41.3, 1.8);
  // Unresolved star dust along the galactic band.
  float dust = pow(max(0.0, sin(dot(dir, normalize(vec3(0.42, 0.28, -0.86))) * 3.0 + 0.6)), 4.0);
  col += vec3(0.55, 0.63, 0.82) * dust * 0.006 * fbm4(dir * 260.0);
  return col * twinkle * uStarBrightness * 0.42;
}

vec3 galaxyBand(vec3 dir) {
  const vec3 galacticNormal = normalize(vec3(0.36, 0.50, -0.79));
  const vec3 galacticCore = normalize(vec3(-0.55, 0.72, 0.42));

  float plane = dot(dir, galacticNormal);
  float band = exp(-plane * plane * 46.0);
  float haloBand = exp(-plane * plane * 13.0) * 0.13;
  float core = pow(max(dot(dir, galacticCore), 0.0), 12.0);

  // Domain-warped clouds and dust lanes.
  vec3 warp = vec3(
    fbm4(dir * 3.1 + vec3(1.7, 4.1, 2.3)),
    fbm4(dir * 3.1 + vec3(6.2, 2.9, 8.4)),
    fbm4(dir * 3.1 + vec3(3.8, 7.7, 1.1))
  );
  vec3 q = dir * 4.3 + warp * 1.6;
  float clouds = fbm3(q * 1.7);
  float fine = fbm4(q * 7.0 + vec3(4.0));
  float dust = smoothstep(0.44, 0.7, fbm3(q * 5.2 + 3.7));
  float lanes = smoothstep(0.5, 0.74, fine) * smoothstep(0.2, 0.8, clouds);

  vec3 cold = vec3(0.36, 0.5, 0.9);
  vec3 warm = vec3(1.0, 0.66, 0.36);
  vec3 tint = mix(cold, warm, clamp(core * 1.6 + clouds * 0.22, 0.0, 1.0));
  float density = band * (0.2 + 0.8 * clouds) + haloBand * (0.05 + 0.2 * fine);
  density *= 1.0 - 0.86 * lanes * dust;
  density += core * band * 1.6;

  // Sparse emission-nebula patches: teal and magenta, very low level.
  float nebula = smoothstep(0.66, 0.88, fbm3(dir * 6.5 + vec3(21.0, 4.0, 13.0)));
  vec3 nebulaTint = mix(vec3(0.18, 0.55, 0.80), vec3(0.85, 0.22, 0.52), fine);
  density += nebula * 0.08;

  vec3 col = tint * density * 0.15 + nebulaTint * nebula * 0.008;
  return col * uGalaxyBrightness;
}

vec3 skyColor(vec3 dir) {
  return starField(dir) + galaxyBand(dir);
}

// ─── accretion disk ────────────────────────────────────────────────────────
float diskTemperatureAt(float r) {
  float rin = uDiskInner;
  float x = clamp(rin / max(r, rin), 0.0, 1.0);
  // Shakura–Sunyaev-like run, anchored at the inner edge: T ∝ r^(-3/4).
  return uDiskTemperature * pow(x, 0.75);
}

float diskDensityAt(float r) {
  float x = clamp((r - uDiskInner) / max(uDiskOuter - uDiskInner, 0.001), 0.0, 1.0);
  float inner = smoothstep(0.0, 0.022, x);
  float outer = 1.0 - smoothstep(0.64, 1.0, x);
  float radial = 0.34 + 0.66 * pow(max(1.0 - x, 0.0), 0.8);
  return inner * outer * radial;
}

float diskTurbulence(float r, float phi, float seed) {
  float omega = sqrt(MASS / max(r * r * r, 0.001));
  float spin = uTime * uDiskSpinSpeed * 6.0;
  // Two differentially rotating layers: the shear between them is the
  // visible turbulence rather than a static noise texture.
  float a = phi - omega * spin * 3.4;
  float a2 = phi - omega * spin * 2.0 + 0.7;
  float lr = log(max(r / uDiskInner, 0.001));

  vec2 cs = vec2(cos(a), sin(a));
  vec2 cs2 = vec2(cos(a2), sin(a2));

  float large = fbm3(vec3(cs * 1.3, lr * 0.55) + seed * 0.37);
  float medium = fbm4(vec3(cs * 3.8, lr * 1.05) + seed * 0.71 + 2.4);
  float fine = fbm4(vec3(cs2 * 8.6, lr * 2.2) + seed * 1.13 + 7.7);

  // Spiral filaments sheared by radius: the classic accretion-flow look.
  float spiralAngle = a + lr * 1.55;
  float spiral = fbm4(vec3(cos(spiralAngle) * 4.8, sin(spiralAngle) * 4.8, lr * 1.4) + 4.1);
  float arms = 0.5 + 0.5 * sin(spiralAngle * 2.0 + medium * 5.0);

  float n = 0.46 * large + 0.27 * medium + 0.12 * fine + 0.15 * spiral;
  float filaments = smoothstep(0.34, 0.86, spiral) * 0.5 + smoothstep(0.48, 0.9, fine) * 0.2;
  // Large-scale gaps and bright clumps: keeps the lensed arcs from reading as
  // concentric tree-rings.
  float gaps = smoothstep(0.3, 0.68, fbm3(vec3(cs * 2.4, lr * 0.4) + seed + 8.3));
  float pattern = mix(1.0, clamp(0.12 + 1.5 * n + 0.3 * arms + filaments, 0.02, 2.4), uDiskTurbulence);
  pattern *= mix(0.38, 1.22, gaps);
  return pattern;
}

// A crossing of the equatorial plane by the backward-traced geodesic.
struct DiskHit {
  float alpha;
  float g;
  float temp;
  float r;
  vec3 emission;
};

DiskHit sampleDiskCrossing(vec3 hit, float r, float bz, vec3 tangent, float seed) {
  DiskHit outHit;
  float phi = atan(hit.z, hit.x);
  float temp = diskTemperatureAt(r);
  float density = diskDensityAt(r);
  float turb = diskTurbulence(r, phi, seed);

  // observed / emitted frequency ratio for a circular Keplerian emitter
  float omega = sqrt(MASS / (r * r * r));
  float denom = 1.0 - omega * bz;
  float g = sqrt(max(1.0 - 3.0 * MASS / r, 0.001)) / max(abs(denom), 0.12);
  g = clamp(g, 0.05, 4.0);

  float gSpec = mix(1.0, g, uRedshift);
  float tempObs = temp * gSpec;
  float beaming = pow(max(g, 0.04), 4.0 * uBeaming);
  float radialGlow = pow(clamp(uDiskInner / r, 0.0, 1.2), 0.9);

  float pathSlope = max(abs(dot(tangent, DISK_AXIS)), 0.028);
  float clumping = clamp(0.28 + turb * 0.8, 0.18, 1.7);
  float tau = uDiskOpacity * density * clumping * (0.35 + 2.7 * uDiskThickness) / pathSlope;
  float alpha = 1.0 - exp(-tau);

  float emissive = uDiskBrightness * density * radialGlow * turb * beaming;
  // T⁴ bolometric scaling, gently compressed so the outer disk stays legible.
  emissive *= pow(temp / max(uDiskTemperature, 1.0), 2.8);
  emissive *= 2.6;

  vec3 colour = blackbodyLinear(tempObs);
  // Hot inner rim gets a white-hot core without flattening the outer colours.
  colour = mix(colour, vec3(1.0, 0.95, 0.9), smoothstep(0.6, 1.0, radialGlow) * 0.4);
  // A touch of saturation keeps the disk golden instead of muddy grey.
  float luma = dot(colour, vec3(0.299, 0.587, 0.114));
  colour = max(mix(vec3(luma), colour, 1.15), vec3(0.0));

  outHit.alpha = clamp(alpha, 0.0, 0.995);
  outHit.g = g;
  outHit.temp = tempObs;
  outHit.r = r;
  outHit.emission = colour * emissive * (0.35 + 0.65 * outHit.alpha);
  return outHit;
}

// ─── geodesic integration ──────────────────────────────────────────────────
struct Trace {
  vec3 colour;
  float b;
  float steps;
  float crossings;
  float g;
  float temp;
  float deflection;
  float captured;
  float ring;
};

Trace traceRay(vec3 ro, vec3 rd, bool sampleDiskLayer) {
  Trace tr;
  tr.colour = vec3(0.0);
  tr.b = 0.0;
  tr.steps = 0.0;
  tr.crossings = 0.0;
  tr.g = 1.0;
  tr.temp = 0.0;
  tr.deflection = 0.0;
  tr.captured = 0.0;
  tr.ring = 0.0;

  float r0 = length(ro);
  vec3 e1 = ro / r0;
  float dr = dot(rd, e1);
  vec3 perp = rd - dr * e1;
  float dt = length(perp);

  float f0 = max(1.0 - RS / r0, 1e-4);
  float b = r0 * dt / sqrt(f0);
  float bz = -dot(cross(ro, rd), DISK_AXIS) / sqrt(f0);
  tr.b = b;
  tr.ring = exp(-pow((b - 2.598076) / 0.055, 2.0));

  if (dt < 2.0e-3) {
    // Radial ray: no angular momentum, so the outcome is analytic.
    tr.steps = 0.0;
    if (dr < 0.0) {
      tr.captured = 1.0;
    } else {
      tr.colour = skyColor(rd);
    }
    return tr;
  }

  vec3 e2 = perp / dt;

  float u = 1.0 / r0;
  float du = -u * sqrt(max(1.0 - u, 0.0)) * dr / dt;
  float c = 1.0;
  float s = 0.0;
  float ch = cos(uStepAngle);
  float sh = sin(uStepAngle);
  float yPrev = ro.y;

  float transmittance = 1.0;
  float phi = 0.0;
  bool escaped = false;
  bool captured = false;
  vec3 escapeDir = rd;

  for (int i = 0; i < MAX_STEPS; i++) {
    if (i >= uMaxSteps) break;

    float uPrev = u;
    float cPrev = c;
    float sPrev = s;

    // RK4 for u'' = -u + 1.5 u² over one angular step.
    float h = uStepAngle;
    float k1u = du;
    float k1d = -u + 1.5 * u * u;
    float u2 = u + 0.5 * h * k1u;
    float k2u = du + 0.5 * h * k1d;
    float k2d = -u2 + 1.5 * u2 * u2;
    float u3 = u + 0.5 * h * k2u;
    float k3u = du + 0.5 * h * k2d;
    float k3d = -u3 + 1.5 * u3 * u3;
    float u4 = u + h * k3u;
    float k4u = du + h * k3d;
    float k4d = -u4 + 1.5 * u4 * u4;
    u += (h / 6.0) * (k1u + 2.0 * k2u + 2.0 * k3u + k4u);
    du += (h / 6.0) * (k1d + 2.0 * k2d + 2.0 * k3d + k4d);

    // Advance the orbital-plane angle (recurrence — no trig in the hot loop).
    float cn = c * ch - s * sh;
    s = s * ch + c * sh;
    c = cn;

    tr.steps += 1.0;
    phi += h;

    if (u <= 0.0) {
      float tEsc = uPrev / max(uPrev - u, 1e-6);
      vec3 dirPrev = cPrev * e1 + sPrev * e2;
      vec3 dirNew = c * e1 + s * e2;
      escapeDir = normalize(mix(dirPrev, dirNew, clamp(tEsc, 0.0, 1.0)));
      escaped = true;
      break;
    }
    if (u >= 1.0) {
      captured = true;
      break;
    }

    float rNew = 1.0 / u;
    float y = rNew * (c * e1.y + s * e2.y);

    if (sampleDiskLayer && yPrev * y < 0.0) {
      float tHit = yPrev / (yPrev - y);
      tHit = clamp(tHit, 0.0, 1.0);
      float rPrev = 1.0 / uPrev;
      vec3 pPrev = rPrev * (cPrev * e1 + sPrev * e2);
      vec3 pNew = rNew * (c * e1 + s * e2);
      vec3 hit = mix(pPrev, pNew, tHit);
      float rHit = length(hit);
      if (rHit >= uDiskInner && rHit <= uDiskOuter) {
        vec3 tangent = normalize(pNew - pPrev + vec3(1e-7));
        DiskHit dh = sampleDiskCrossing(hit, rHit, bz, tangent, 0.0);
        tr.colour += transmittance * dh.emission;
        transmittance *= 1.0 - dh.alpha;
        if (tr.crossings < 0.5) {
          tr.g = dh.g;
          tr.temp = dh.temp;
        }
        tr.crossings += 1.0;
      }
    }

    yPrev = y;
  }

  if (escaped) {
    tr.deflection = acos(clamp(dot(rd, escapeDir), -1.0, 1.0));
    if (sampleDiskLayer) {
      // Disk light is already accumulated; add the lensed background.
      tr.colour += transmittance * skyColor(escapeDir);
    } else {
      tr.colour = skyColor(escapeDir);
    }
  } else if (captured) {
    tr.captured = 1.0;
    // Light from the disk in front of the horizon still reaches the camera.
    if (!sampleDiskLayer) tr.colour = vec3(0.0);
  } else {
    // Step budget exhausted: these are the near-critical rays that keep
    // winding around the photon sphere. Treat them as absorbed by the shadow.
    tr.captured = 1.0;
  }

  tr.deflection = tr.deflection > 0.0 ? tr.deflection : (captured ? 3.14159265 : 0.0);
  return tr;
}

// ─── debug visualisations ─────────────────────────────────────────────────
vec3 debugColour(Trace tr) {
  if (uDebug == 2) {
    float cost = tr.steps / float(max(uMaxSteps, 1));
    return turbo(cost) * (tr.captured > 0.5 ? 0.45 : 1.0);
  }
  if (uDebug == 3) {
    if (tr.captured > 0.5) {
      float edge = smoothstep(2.48, 2.66, tr.b);
      return mix(vec3(0.92, 0.95, 1.0), vec3(1.0, 0.34, 0.08), edge * 0.65);
    }
    return vec3(0.012, 0.018, 0.026);
  }
  if (uDebug == 4) {
    if (tr.captured > 0.5) return vec3(0.02, 0.0, 0.0);
    return turbo(clamp(tr.deflection / 3.14159265, 0.0, 1.0));
  }
  if (uDebug == 5) {
    float passes = tr.crossings / 6.0;
    return turbo(clamp(passes, 0.0, 1.0)) * (tr.captured > 0.5 ? 0.35 : 1.0);
  }
  if (uDebug == 6) {
    if (tr.crossings < 0.5) return vec3(0.01, 0.012, 0.018);
    return divergingG(tr.g);
  }
  if (uDebug == 7) {
    if (tr.crossings < 0.5) return vec3(0.01, 0.012, 0.018);
    float x = clamp((tr.temp - 2000.0) / 12000.0, 0.0, 1.0);
    return blackbodyLinear(tr.temp) * (0.35 + 0.9 * x);
  }
  return tr.colour;
}

void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
  vec3 rd = normalize(
    uCamForward +
    uCamRight * (uv.x * uAspect * uTanHalfFov) +
    uCamUp * (uv.y * uTanHalfFov)
  );

  bool sampleDiskLayer = uDebug != 8;
  Trace tr = traceRay(uCamPos, rd, sampleDiskLayer);

  vec3 colour;
  if (uDebug >= 2 && uDebug <= 7) {
    colour = debugColour(tr);
  } else if (uDebug == 8) {
    colour = tr.colour;
  } else {
    colour = tr.colour;
    // A restrained physical photon-ring gain: near-critical rays cross the
    // disk many times, and the finite step budget truncates those extra
    // images. The gain only touches the exact critical annulus.
    colour += tr.ring * uPhotonRingBoost * vec3(1.0, 0.72, 0.44) * 0.10;
  }

  fragColor = vec4(max(colour, vec3(0.0)), 1.0);
}
`;
