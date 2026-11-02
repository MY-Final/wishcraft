/**
 * GARGANTUA — shared state, parameter schema and URL / persistence plumbing.
 *
 * Everything that the HUD, the renderer and the camera rig need to agree on
 * lives here: the 21 live parameters, the three quality tiers, the ten debug
 * views, the four camera presets and the serialisable user state.
 *
 * The module is deliberately dependency-free so it can be unit-checked with
 * plain node (`node tools/check-state.mjs`).
 */

/** Schwarzschild geometry in units of the event horizon radius r_s = 1. */
export const RS = 1.0;
export const MASS = 0.5; // M = r_s / 2
export const PHOTON_SPHERE = 1.5; // 3M
export const ISCO = 3.0; // 6M
export const CRITICAL_B = (3 * Math.sqrt(3)) / 2; // 3√3 M ≈ 2.598

/**
 * The 21 live parameters, in HUD order. `group` is used by the control panel.
 * `def` is the shipping default; every value is restored from localStorage.
 */
export const PARAM_DEFS = [
  // ── image / grade ────────────────────────────────────────────────────────
  {
    id: 'exposure',
    label: 'Exposure',
    group: 'IMAGE',
    min: 0.2,
    max: 3.0,
    step: 0.01,
    def: 0.95,
    digits: 2,
  },
  {
    id: 'bloomStrength',
    label: 'Bloom strength',
    group: 'IMAGE',
    min: 0.0,
    max: 2.5,
    step: 0.01,
    def: 0.55,
    digits: 2,
  },
  {
    id: 'bloomRadius',
    label: 'Bloom radius',
    group: 'IMAGE',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    def: 0.35,
    digits: 2,
  },
  {
    id: 'bloomThreshold',
    label: 'Bloom threshold',
    group: 'IMAGE',
    min: 0.0,
    max: 3.0,
    step: 0.01,
    def: 0.9,
    digits: 2,
  },
  {
    id: 'vignette',
    label: 'Vignette',
    group: 'IMAGE',
    min: 0.0,
    max: 1.5,
    step: 0.01,
    def: 0.55,
    digits: 2,
  },
  {
    id: 'grain',
    label: 'Film grain',
    group: 'IMAGE',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    def: 0.32,
    digits: 2,
  },
  {
    id: 'chromaticAberration',
    label: 'Chromatic aberration',
    group: 'IMAGE',
    min: 0.0,
    max: 3.0,
    step: 0.01,
    def: 0.4,
    digits: 2,
  },

  // ── accretion disk ───────────────────────────────────────────────────────
  {
    id: 'diskBrightness',
    label: 'Disk brightness',
    group: 'DISK',
    min: 0.0,
    max: 3.0,
    step: 0.01,
    def: 1.0,
    digits: 2,
  },
  {
    id: 'diskTemperature',
    label: 'Peak temperature',
    group: 'DISK',
    min: 2200,
    max: 16000,
    step: 50,
    def: 5800,
    unit: 'K',
    digits: 0,
  },
  {
    id: 'diskInnerRadius',
    label: 'Inner radius',
    group: 'DISK',
    min: 1.8,
    max: 8.0,
    step: 0.01,
    def: ISCO,
    unit: 'rₛ',
    digits: 2,
  },
  {
    id: 'diskOuterRadius',
    label: 'Outer radius',
    group: 'DISK',
    min: 5.0,
    max: 26.0,
    step: 0.05,
    def: 10.5,
    unit: 'rₛ',
    digits: 2,
  },
  {
    id: 'diskThickness',
    label: 'Thickness',
    group: 'DISK',
    min: 0.01,
    max: 1.6,
    step: 0.005,
    def: 0.16,
    digits: 3,
  },
  {
    id: 'diskOpacity',
    label: 'Opacity',
    group: 'DISK',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    def: 0.86,
    digits: 2,
  },
  {
    id: 'diskTurbulence',
    label: 'Turbulence',
    group: 'DISK',
    min: 0.0,
    max: 1.5,
    step: 0.01,
    def: 0.95,
    digits: 2,
  },
  {
    id: 'diskSpinSpeed',
    label: 'Orbital speed',
    group: 'DISK',
    min: 0.0,
    max: 3.0,
    step: 0.01,
    def: 1.0,
    digits: 2,
  },
  {
    id: 'beaming',
    label: 'Doppler beaming',
    group: 'DISK',
    min: 0.0,
    max: 1.5,
    step: 0.01,
    def: 0.9,
    digits: 2,
  },
  {
    id: 'redshift',
    label: 'Gravitational redshift',
    group: 'DISK',
    min: 0.0,
    max: 1.5,
    step: 0.01,
    def: 1.0,
    digits: 2,
  },

  // ── sky / optics ─────────────────────────────────────────────────────────
  {
    id: 'photonRingBoost',
    label: 'Photon ring gain',
    group: 'OPTICS',
    min: 0.0,
    max: 3.0,
    step: 0.01,
    def: 1.0,
    digits: 2,
  },
  {
    id: 'starBrightness',
    label: 'Star brightness',
    group: 'OPTICS',
    min: 0.0,
    max: 3.0,
    step: 0.01,
    def: 1.0,
    digits: 2,
  },
  {
    id: 'galaxyBrightness',
    label: 'Galaxy brightness',
    group: 'OPTICS',
    min: 0.0,
    max: 2.0,
    step: 0.01,
    def: 0.9,
    digits: 2,
  },
  {
    id: 'fieldOfView',
    label: 'Field of view',
    group: 'CAMERA',
    min: 24,
    max: 78,
    step: 0.5,
    def: 45,
    unit: '°',
    digits: 1,
  },
];

export const PARAM_IDS = PARAM_DEFS.map((param) => param.id);
export const PARAM_COUNT = PARAM_DEFS.length;

/** Deterministic default parameters. */
export const DEFAULT_PARAMS = Object.freeze(
  Object.fromEntries(PARAM_DEFS.map((param) => [param.id, param.def])),
);

/**
 * Three quality tiers. `dpr` caps devicePixelRatio, `renderScale` scales the
 * ray-traced buffer independently of the presentation canvas, `maxSteps` and
 * `stepAngle` bound the RK4 geodesic integration.
 */
export const QUALITY_LEVELS = [
  {
    id: 'standard',
    label: 'STANDARD',
    note: '1.0× DPR · 0.72 render · 150 steps',
    dpr: 1.0,
    renderScale: 0.72,
    maxSteps: 150,
    stepAngle: 0.085,
    bloomLevels: 4,
    maxPixels: 1_400_000,
  },
  {
    id: 'high',
    label: 'HIGH',
    note: '1.5× DPR · 0.9 render · 280 steps',
    dpr: 1.5,
    renderScale: 0.9,
    maxSteps: 280,
    stepAngle: 0.052,
    bloomLevels: 5,
    maxPixels: 3_400_000,
  },
  {
    id: 'cinematic',
    label: 'CINEMATIC',
    note: '2× DPR · 1.0 render · 420 steps',
    dpr: 2.0,
    renderScale: 1.0,
    maxSteps: 420,
    stepAngle: 0.038,
    bloomLevels: 6,
    maxPixels: 6_200_000,
  },
];

export const QUALITY_BY_ID = Object.fromEntries(QUALITY_LEVELS.map((level) => [level.id, level]));

/** The ten debug views bound to keys 0–9. */
export const DEBUG_VIEWS = [
  { id: 0, key: '0', label: 'FINAL', hint: 'Beauty composite' },
  { id: 1, key: '1', label: 'RAW HDR', hint: 'Untonemapped HDR buffer' },
  { id: 2, key: '2', label: 'STEP HEAT', hint: 'Geodesic integration cost' },
  { id: 3, key: '3', label: 'CAPTURE MASK', hint: 'Rays absorbed by the horizon' },
  { id: 4, key: '4', label: 'DEFLECTION', hint: 'Total light bending angle' },
  { id: 5, key: '5', label: 'DISK PASSES', hint: 'Equatorial plane crossings' },
  { id: 6, key: '6', label: 'REDSHIFT g', hint: 'Observed / emitted frequency' },
  { id: 7, key: '7', label: 'DISK TEMP', hint: 'Observed disk temperature' },
  { id: 8, key: '8', label: 'SKY ONLY', hint: 'Lensed procedural sky' },
  { id: 9, key: '9', label: 'BLOOM', hint: 'High-pass bloom source' },
];

/**
 * Four camera presets. Angles are in degrees: polar from +Y, azimuth from +X.
 * Distances are in r_s (the disk outer radius is ~13.5 r_s).
 */
export const VIEW_PRESETS = [
  { id: 'edge', label: 'EDGE-ON', radius: 22, polar: 84.5, azimuth: 24, note: 'The signature Gargantua silhouette' },
  { id: 'polar', label: 'POLAR', radius: 24, polar: 16, azimuth: 12, note: 'Look down the rotation axis' },
  { id: 'oblique', label: 'OBLIQUE', radius: 21, polar: 62, azimuth: 42, note: 'Three-quarter staging shot' },
  { id: 'close', label: 'CLOSE', radius: 9.5, polar: 78, azimuth: -28, note: 'Inside the photon ring’s reach' },
];

export const VIEW_BY_ID = Object.fromEntries(VIEW_PRESETS.map((preset) => [preset.id, preset]));

/** Shortcuts shown in the HUD. */
export const SHORTCUTS = [
  ['0 – 9', 'Debug views'],
  ['Drag / Scroll', 'Orbit / zoom'],
  ['Shift + 1 – 4', 'View presets'],
  ['C', 'Cinematic loop'],
  ['Space', 'Pause time'],
  ['H', 'Hide / show HUD'],
  ['M', 'Ambient music'],
  ['P', 'Save PNG'],
  ['R', 'Reset parameters'],
  ['?', 'This panel'],
];

export const STORAGE_KEY = 'gargantua.state.v1';
export const STATE_VERSION = 1;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/** The complete default state, before localStorage / URL overrides. */
export function createDefaultState() {
  return {
    version: STATE_VERSION,
    quality: 'high',
    params: { ...DEFAULT_PARAMS },
    debug: 0,
    hud: true,
    panel: true,
    audio: false,
    motion: true,
    camera: {
      mode: 'cinematic',
      preset: 'edge',
      radius: 22,
      polar: 84.5,
      azimuth: 24,
    },
  };
}

/** Validate one parameter value against its definition. */
export function normalizeParam(id, value) {
  const def = PARAM_DEFS.find((param) => param.id === id);
  if (!def) return undefined;
  const number = typeof value === 'string' ? Number(value) : value;
  if (!isFiniteNumber(number)) return def.def;
  return clamp(number, def.min, def.max);
}

/** Deep-ish validation of a candidate state object. */
export function normalizeState(candidate) {
  const base = createDefaultState();
  if (!candidate || typeof candidate !== 'object') return base;

  if (QUALITY_BY_ID[candidate.quality]) base.quality = candidate.quality;
  if (typeof candidate.debug === 'number' && DEBUG_VIEWS.some((view) => view.id === candidate.debug)) {
    base.debug = Math.round(candidate.debug);
  }
  for (const key of ['hud', 'panel', 'audio', 'motion']) {
    if (typeof candidate[key] === 'boolean') base[key] = candidate[key];
  }
  if (candidate.params && typeof candidate.params === 'object') {
    for (const def of PARAM_DEFS) {
      if (def.id in candidate.params) {
        base.params[def.id] = normalizeParam(def.id, candidate.params[def.id]);
      }
    }
  }
  if (candidate.camera && typeof candidate.camera === 'object') {
    const camera = candidate.camera;
    if (camera.mode === 'manual' || camera.mode === 'cinematic') base.camera.mode = camera.mode;
    if (VIEW_BY_ID[camera.preset]) base.camera.preset = camera.preset;
    if (isFiniteNumber(camera.radius)) base.camera.radius = clamp(camera.radius, 2.4, 120);
    if (isFiniteNumber(camera.polar)) base.camera.polar = clamp(camera.polar, 2, 178);
    if (isFiniteNumber(camera.azimuth)) base.camera.azimuth = ((camera.azimuth % 360) + 360) % 360;
  }
  return base;
}

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadPersistedState(storage = safeStorage()) {
  if (!storage) return createDefaultState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

export function savePersistedState(state, storage = safeStorage()) {
  if (!storage) return false;
  try {
    // Only the durable part; driven by the store.
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the screenshot-automation / deep-link contract from a URL.
 *
 *   ?shot=1&view=edge&quality=high&debug=0&time=8.5&ui=0&dpr=1&frames=3
 *   ?params=exposure:1.2,diskBrightness:1.4&cam=17.5,86.5,24
 */
export function parseUrlConfig(url) {
  const search = url.searchParams;
  const number = (keys) => {
    for (const key of keys) {
      const raw = search.get(key);
      if (raw === null || raw === '') continue;
      const value = Number(raw);
      if (Number.isFinite(value)) return value;
    }
    return undefined;
  };
  const flag = (keys) => {
    for (const key of keys) {
      const raw = search.get(key);
      if (raw === null) continue;
      return !/^(0|false|no|off)$/i.test(raw);
    }
    return undefined;
  };
  const config = {
    shot: flag(['shot', 'screenshot']) ?? false,
    quality: search.get('quality') ?? search.get('q') ?? undefined,
    debug: number(['debug']) ?? undefined,
    view: search.get('view') ?? search.get('preset') ?? undefined,
    time: number(['time', 't']),
    ui: flag(['ui']),
    hud: flag(['hud']),
    panel: flag(['panel']),
    audio: flag(['audio']),
    motion: flag(['motion']),
    dpr: number(['dpr', 'pixelRatio']),
    frames: number(['frames']),
    params: {},
    camera: undefined,
    rawSearch: url.search,
  };

  const params = search.get('params');
  if (params) {
    for (const pair of params.split(',')) {
      const [rawId, rawValue] = pair.split(/[:=]/);
      if (!rawId || rawValue === undefined) continue;
      const id = rawId.trim();
      const value = Number(rawValue);
      if (PARAM_IDS.includes(id) && Number.isFinite(value)) config.params[id] = value;
    }
  }

  const camera = search.get('cam');
  if (camera) {
    const parts = camera.split(',').map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      config.camera = { radius: parts[0], polar: parts[1], azimuth: parts[2] };
    }
  }

  if (config.quality && !QUALITY_BY_ID[config.quality]) config.quality = undefined;
  if (config.view && !VIEW_BY_ID[config.view]) config.view = undefined;
  if (config.debug !== undefined && (config.debug < 0 || config.debug > 9)) config.debug = undefined;
  return config;
}

function mergeState(base, config) {
  const state = normalizeState(base);
  if (config.quality) state.quality = config.quality;
  if (config.debug !== undefined) state.debug = Math.round(config.debug);
  if (config.motion !== undefined) state.motion = config.motion;
  if (config.audio !== undefined) state.audio = config.audio;
  if (config.hud !== undefined) state.hud = config.hud;
  if (config.ui !== undefined && !config.ui) {
    state.hud = false;
    state.panel = false;
  }
  if (config.panel !== undefined) state.panel = config.panel;
  for (const [id, value] of Object.entries(config.params)) state.params[id] = normalizeParam(id, value);
  if (config.view) {
    const preset = VIEW_BY_ID[config.view];
    state.camera.mode = 'manual';
    state.camera.preset = preset.id;
    state.camera.radius = preset.radius;
    state.camera.polar = preset.polar;
    state.camera.azimuth = preset.azimuth;
  }
  if (config.camera) {
    state.camera.mode = 'manual';
    state.camera.radius = clamp(config.camera.radius, 2.4, 120);
    state.camera.polar = clamp(config.camera.polar, 2, 178);
    state.camera.azimuth = ((config.camera.azimuth % 360) + 360) % 360;
  }
  if (config.shot) {
    state.motion = false;
    state.camera.mode = 'manual';
    if (config.ui === undefined) {
      state.hud = false;
      state.panel = false;
    }
  }
  return state;
}

/**
 * Create the single source of truth. `subscribe` listeners receive
 * `(change, state)` where change is a short descriptor such as
 * `{ type: 'param', id: 'exposure' }` or `{ type: 'quality' }`.
 */
export function createStore({ url, storage } = {}) {
  const href = url ?? (typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  const parsedUrl = href instanceof URL ? href : new URL(href);
  const config = parseUrlConfig(parsedUrl);

  // Screenshot automation is always deterministic and never inherits a
  // previous session; normal visits restore the persisted state and layer any
  // URL overrides on top of it.
  const base = config.shot ? createDefaultState() : loadPersistedState(storage);
  let state = mergeState(base, config);

  const listeners = new Set();
  const shot = {
    enabled: config.shot,
    time: config.time ?? 6.5,
    frames: Math.max(1, Math.round(config.frames ?? 3)),
    dpr: config.dpr,
    ui: config.ui ?? !config.shot,
    camera: config.camera ?? null,
  };

  let saveTimer = 0;
  const emit = (change) =>
    listeners.forEach((listener) => {
      try {
        listener(change, state);
      } catch (error) {
        console.error('[gargantua] state listener failed', error);
      }
    });

  const commit = (change, { persist = true } = {}) => {
    if (!persist || shot.enabled) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { version, quality, params, debug, hud, panel, audio, motion, camera } = state;
      savePersistedState(
        { version, quality, params, debug, hud, panel, audio, motion, camera },
        storage,
      );
    }, 300);
  };

  return {
    config,
    shot,
    get state() {
      return state;
    },
    getParam(id) {
      return state.params[id];
    },
    setParam(id, value, options = {}) {
      const normalized = normalizeParam(id, value);
      if (normalized === undefined || normalized === state.params[id]) return;
      state = { ...state, params: { ...state.params, [id]: normalized } };
      emit({ type: 'param', id, value: normalized });
      commit({}, options);
    },
    setParams(values, options = {}) {
      let changed = false;
      const params = { ...state.params };
      for (const [id, value] of Object.entries(values)) {
        const normalized = normalizeParam(id, value);
        if (normalized === undefined) continue;
        params[id] = normalized;
        changed = true;
      }
      if (!changed) return;
      state = { ...state, params };
      emit({ type: 'params', values });
      commit({}, options);
    },
    setQuality(id) {
      if (!QUALITY_BY_ID[id] || id === state.quality) return;
      state = { ...state, quality: id };
      emit({ type: 'quality', id });
      commit();
    },
    setDebug(debug) {
      const id = Math.max(0, Math.min(9, Math.round(debug)));
      if (id === state.debug) return;
      state = { ...state, debug: id };
      emit({ type: 'debug', id });
      commit();
    },
    setHud(visible) {
      if (visible === state.hud) return;
      state = { ...state, hud: visible };
      emit({ type: 'hud', visible });
      commit();
    },
    setPanel(open) {
      if (open === state.panel) return;
      state = { ...state, panel: open };
      emit({ type: 'panel', open });
      commit();
    },
    setAudio(enabled) {
      if (enabled === state.audio) return;
      state = { ...state, audio: enabled };
      emit({ type: 'audio', enabled });
      commit();
    },
    setMotion(running) {
      if (running === state.motion) return;
      state = { ...state, motion: running };
      emit({ type: 'motion', running });
      commit();
    },
    setCamera(camera, options = {}) {
      const next = { ...state.camera, ...camera };
      state = { ...state, camera: next };
      emit({ type: 'camera', camera: next });
      commit({}, options);
    },
    setCameraMode(mode) {
      if (state.camera.mode === mode) return;
      state = { ...state, camera: { ...state.camera, mode } };
      emit({ type: 'camera', camera: state.camera });
      commit();
    },
    setCameraPreset(preset) {
      if (!VIEW_BY_ID[preset]) return;
      state = {
        ...state,
        camera: { ...state.camera, preset, mode: 'manual' },
      };
      emit({ type: 'camera', camera: state.camera, preset });
      commit();
    },
    resetParams() {
      state = { ...state, params: { ...DEFAULT_PARAMS } };
      emit({ type: 'reset' });
      commit();
    },
    resetAll() {
      const defaults = createDefaultState();
      state = { ...defaults, camera: { ...defaults.camera } };
      emit({ type: 'reset-all' });
      commit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get quality() {
      return QUALITY_BY_ID[state.quality];
    },
    get debugView() {
      return DEBUG_VIEWS[state.debug] ?? DEBUG_VIEWS[0];
    },
    snapshot() {
      return {
        quality: state.quality,
        debug: state.debug,
        params: { ...state.params },
        camera: { ...state.camera },
        hud: state.hud,
        panel: state.panel,
        audio: state.audio,
        motion: state.motion,
        shot: { ...shot },
      };
    },
  };
}
