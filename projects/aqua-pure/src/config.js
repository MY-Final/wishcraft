/**
 * AQUA PURE — single source of truth for every dimension, material value and
 * timing constant in the scene.
 *
 * Units: millimetres (1 world unit = 1 mm). The bottle is modelled from the
 * brief: 64 mm body, ~205 mm tall with cap, 500 ml nominal fill.
 *
 * Every visual constant lives here on purpose. The geometry modules only read
 * from this object, so tuning the bottle never means hunting through shaders.
 */

export const CONFIG = {
  bottle: {
    // ── axial layout (local Y, 0 = glass / ground contact plane) ─────────
    bodyRadius: 32, // 64 mm diameter
    wallThickness: 0.35, // PET wall
    baseTop: 12, // top of the moulded base transition
    bodyTop: 132, // 120 mm cylindrical body
    shoulderTop: 170, // 38 mm S-curve shoulder (32 → 14 mm)
    neckRadius: 14, // 28 mm neck
    neckTop: 188, // 18 mm neck
    beadTop: 191, // tamper-evident bead
    threadTop: 203, // 12 mm thread band
    lipTop: 205, // rounded mouth lip
    beadRadius: 15.5,
    mouthOuterRadius: 14,
    initialWaterTop: 182, // full at the neck root: surface visible just above the shoulder

    // ── tessellation ────────────────────────────────────────────────────
    radialSegments: 128,
    profileStep: 0.35, // mm between shoulder samples

    // ── waist grip: two symmetric thumb dishes on the lower body ────────
    grip: {
      depth: 2.6,
      centerY: 34,
      halfHeight: 12.5,
      angularWidth: 0.52, // radians, half-width of each dish
    },

    // ── moulding imperfection ───────────────────────────────────────────
    noise: 0.15, // ±0.15 mm on the cylindrical body only

    // ── real, swept thread (not a normal map) ───────────────────────────
    thread: {
      radius: 13.85,
      tubeRadius: 0.68,
      turns: 3.5,
      startY: 191.6,
      endY: 202.6,
      tubularSegments: 440,
      radialSegments: 8,
    },

    // ── bottom: five petal-shaped support feet + punt ───────────────────
    feet: {
      count: 5,
      radius: 24.5,
      length: 10.5,
      width: 5.4,
      height: 2.4,
      y: 0.25,
    },

    // ── blue HDPE cap, sealed, with intact tamper-evident ring ──────────
    cap: {
      radius: 16,
      height: 16,
      bottomY: 190.3,
      color: 0x1a6fd4,
      roughness: 0.35,
      clearcoat: 0.5,
      ribCount: 64,
      ribWidth: 0.46,
      ribDepth: 0.3,
      ribHeight: 12.6,
      topRecessRadius: 4.6,
      topRecessDepth: 0.3,
      ring: {
        radius: 16,
        height: 4,
        bottomY: 185.4,
        teeth: 20,
        color: 0x1560b8,
      },
      bridges: {
        count: 8,
        width: 0.8,
        height: 1.6,
        depth: 0.5,
        radius: 16.04,
        y: 189.9,
      },
    },

    // ── full-wrap label, 70 mm tall, sits above the grip ────────────────
    label: {
      bottomY: 58,
      height: 70,
      radiusOffset: 0.16,
      segments: 128,
      textureWidth: 2048,
      textureHeight: 716,
    },
  },

  water: {
    color: 0xeaf6ff,
    ior: 1.333,
    roughness: 0.024,
    initialFraction: 1,
    residualFraction: 0.006,
    drainPerSecond: 0.09, // fraction of 500 ml per second while pouring
    pourTiltDeg: 68,
    tiltSpeedDegPerSecond: 38,
    returnSpeedDegPerSecond: 52,
    meniscusRise: 0.5, // centre of the free surface sits 0.5 mm high
    surfaceSegments: 96,
    streamRadius: 4.4,
    splashCount: 260,
  },

  environment: {
    skyTop: '#1d6fd6',
    skyHorizon: '#c9e6ff',
    skyZenithGlow: '#6fb6f5',
    sunColor: '#fff4d8',
    sunDirection: [0.44, 0.78, 0.34],
    groundColor: '#5f8b43',
    grassDark: '#3f6329',
    grassLight: '#86ad58',
    fogColor: '#dcecf6',
    fogNear: 2600,
    fogFar: 19000,
    grassSize: 26000,
    grassRepeat: 72,
    grassBlades: 2200,
    grassBladeRadius: 520,
    clouds: 15,
    cloudMinRadius: 7000,
    cloudMaxRadius: 16000,
    cloudMinY: 1400,
    cloudMaxY: 4200,
    contactShadowSize: 190,
    sunIntensity: 2.6,
    hemiIntensity: 0.9,
    rimIntensity: 0.7,
    environmentIntensity: 1.2,
  },

  camera: {
    fov: 35,
    start: [318, 208, 362],
    target: [0, 100, 0],
    minDistance: 250,
    maxDistance: 920,
    minPolarAngle: 0.22,
    maxPolarAngle: 1.55,
    autoRotateSpeed: 0.42,
    idleResumeMs: 4200,
  },

  render: {
    exposure: 1.02,
    maxPixelRatio: 2,
    shadowMapSize: 2048,
  },

  timing: {
    capLift: 0.9,
    capFlight: 1.35,
    capSpinTurns: 4,
    pourStartDelay: 0.15,
    emptyHold: 0.9,
    resetFade: 0.9,
  },
};
