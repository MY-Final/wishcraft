/**
 * AQUA PURE — renderer, camera and the sealed → open → pour → empty story.
 *
 * Rendering choices, briefly:
 * • ACES + sRGB + PMREM scene.environment give the PET its outdoor reflections.
 * • The bottle and water are analytic surfaces of revolution; the water is
 *   trimmed by a world-space clipping plane, so its free surface is always
 *   level with gravity even while the bottle turns.
 * • The cap, tamper ring and thread are real geometry, not textures, because
 *   they are the visual proof that the bottle is unopened.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CONFIG } from './config.js';
import { createEnvironment } from './environment.js';
import { createBottle } from './bottle.js';
import { createWaterSystem } from './water.js';
import { createUI } from './ui.js';

const canvas = document.querySelector('#gl');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const urlParams = new URLSearchParams(window.location.search);
const shotMode = urlParams.get('shot') === '1';
const hideUI = urlParams.get('ui') === '0';

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 required');
} catch (error) {
  document.querySelector('#error').hidden = false;
  document.querySelector('#loader').hidden = true;
  document.documentElement.dataset.ready = 'true';
  console.error('[aqua-pure] WebGL init failed:', error);
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.render.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CONFIG.render.exposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.localClippingEnabled = true;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.environment.skyHorizon);

const camera = new THREE.PerspectiveCamera(
  CONFIG.camera.fov,
  window.innerWidth / window.innerHeight,
  1,
  60000,
);
camera.position.fromArray(CONFIG.camera.start);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.fromArray(CONFIG.camera.target);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = CONFIG.camera.minDistance;
controls.maxDistance = CONFIG.camera.maxDistance;
controls.minPolarAngle = CONFIG.camera.minPolarAngle;
controls.maxPolarAngle = CONFIG.camera.maxPolarAngle;
controls.autoRotate = !reducedMotion && !shotMode;
controls.autoRotateSpeed = CONFIG.camera.autoRotateSpeed;
controls.update();

const ui = createUI({
  openCap: () => openCap(),
  togglePour: () => togglePour(),
  reset: () => resetAll(),
  exposure: (value) => {
    renderer.toneMappingExposure = value;
  },
  environment: (value) => {
    environment?.setEnvironmentIntensity(value);
  },
  fill: (fraction) => {
    if (phase === 'pouring' || phase === 'returning') return;
    water.setFillFraction(fraction);
    syncWaterUI();
  },
  autoRotate: (value) => {
    autoRotateEnabled = value;
    updateAutoRotate();
  },
});

if (hideUI) document.body.classList.add('ui-hidden');

let environment = null;
let bottle = null;
let water = null;

ui.setLoading(0.16);
try {
  environment = createEnvironment({ scene, renderer, config: CONFIG });
  ui.setLoading(0.56);
  bottle = createBottle({ config: CONFIG });
  scene.add(bottle.root);
  ui.setLoading(0.8);
  water = createWaterSystem({ scene, bottleRoot: bottle.root, config: CONFIG });
  ui.setLoading(0.92);
} catch (error) {
  ui.showError();
  console.error('[aqua-pure] scene construction failed:', error);
  throw error;
}

// ── state ────────────────────────────────────────────────────────────────
let phase = 'sealed';
let tilt = 0; // magnitude, radians
let targetTilt = 0;
let pouring = false;
let capAnim = null;
let emptyHold = 0;
let autoRotateEnabled = !reducedMotion && !shotMode;
let idleTimer = 0;
const maxTilt = THREE.MathUtils.degToRad(CONFIG.water.pourTiltDeg);
const timer = new THREE.Timer();
timer.connect(document);

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function moveTowards(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function setPhase(next, options) {
  phase = next;
  const fill = options?.fill ?? water.getFillFraction();
  ui.setPhase(next, { fill });
  syncWaterUI();
  updateAutoRotate();
}

function syncWaterUI() {
  if (!water) return;
  ui.setWater(water.getFillFraction(), water.getVolumeMl());
}

function updateAutoRotate() {
  const allowedPhase = phase === 'sealed' || phase === 'open' || phase === 'empty';
  controls.autoRotate = autoRotateEnabled && allowedPhase && !reducedMotion && !shotMode;
}

function scheduleIdleResume() {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (autoRotateEnabled && !shotMode && (phase === 'sealed' || phase === 'open' || phase === 'empty')) {
      controls.autoRotate = true;
    }
  }, CONFIG.camera.idleResumeMs);
}

controls.addEventListener('start', () => {
  controls.autoRotate = false;
  window.clearTimeout(idleTimer);
});
controls.addEventListener('end', scheduleIdleResume);

// ── cap opening ──────────────────────────────────────────────────────────
function placeCapAway(instant = true) {
  if (!bottle) return;
  if (bottle.cap.parent !== scene) scene.attach(bottle.cap);
  const landing = new THREE.Vector3(95, 16.4, -25);
  const landingQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2, THREE.MathUtils.degToRad(114), 0),
  );
  bottle.cap.position.copy(landing);
  bottle.cap.quaternion.copy(landingQuat);
  bottle.setBridgesIntact(false);
  bottle.setRingDropped(0.65);
  if (instant) {
    bottle.cap.updateMatrixWorld(true);
  }
}

function openCap() {
  if (phase !== 'sealed') return;
  phase = 'opening';
  ui.setPhase('opening', { fill: 1 });
  ui.toast('正在拧开瓶盖…', 1800);
  controls.autoRotate = false;

  scene.attach(bottle.cap);
  const startPos = bottle.cap.position.clone();
  const startQuat = bottle.cap.quaternion.clone();
  const landingPos = new THREE.Vector3(95, 16.4, -25);
  const landingQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2, THREE.MathUtils.degToRad(114), 0),
  );
  capAnim = {
    time: 0,
    lift: CONFIG.timing.capLift,
    flight: CONFIG.timing.capFlight,
    startPos,
    startQuat,
    flightStartPos: null,
    flightStartQuat: null,
    landingPos,
    landingQuat,
    bridgeBroken: false,
    liftEnded: false,
  };
}

function updateCap(dt) {
  if (!capAnim) return;
  capAnim.time += dt;
  const { time, lift, flight } = capAnim;

  if (time < lift) {
    const e = easeInOutCubic(time / lift);
    bottle.cap.position.copy(capAnim.startPos);
    bottle.cap.position.y += 72 * e;
    const spin = CONFIG.timing.capSpinTurns * Math.PI * 2 * e;
    bottle.cap.quaternion.copy(capAnim.startQuat);
    bottle.cap.rotateY(spin);

    if (!capAnim.bridgeBroken && time > 0.16) {
      capAnim.bridgeBroken = true;
      bottle.setBridgesIntact(false);
      bottle.setRingDropped(0.35);
      ui.toast('防盗环连接桥已断裂 · 防盗环留在瓶颈', 2400);
    }
    return;
  }

  if (!capAnim.liftEnded) {
    capAnim.liftEnded = true;
    capAnim.flightStartPos = bottle.cap.position.clone();
    capAnim.flightStartQuat = bottle.cap.quaternion.clone();
  }

  if (time < lift + flight) {
    const e = easeInOutCubic((time - lift) / flight);
    const position = capAnim.flightStartPos.clone().lerp(capAnim.landingPos, e);
    position.y += Math.sin(Math.PI * e) * 30;
    bottle.cap.position.copy(position);
    bottle.cap.quaternion.copy(capAnim.flightStartQuat).slerp(capAnim.landingQuat, e);
    bottle.cap.rotateY(e * Math.PI * 2);
    return;
  }

  bottle.cap.position.copy(capAnim.landingPos);
  bottle.cap.quaternion.copy(capAnim.landingQuat);
  capAnim = null;
  bottle.setRingDropped(0.65);
  setPhase('open', { fill: 1 });
  ui.toast('瓶盖已落在草地上 · 可以倒水了', 2600);
}

// ── pouring ──────────────────────────────────────────────────────────────
function togglePour() {
  if (phase === 'open') {
    pouring = true;
    targetTilt = maxTilt;
    emptyHold = 0;
    setPhase('pouring');
    ui.toast('瓶身倾斜 · 水面始终保持水平', 2400);
    controls.autoRotate = false;
    return;
  }
  if (phase === 'pouring') {
    pouring = false;
    targetTilt = 0;
    emptyHold = 0;
    setPhase('returning');
    ui.toast('停止倒水', 1600);
  }
}

function updatePourState(dt) {
  const fill = water.getFillFraction();
  if (phase === 'pouring') {
    if (fill < 0.003 && tilt > maxTilt * 0.94) {
      emptyHold += dt;
      if (emptyHold > CONFIG.timing.emptyHold) {
        pouring = false;
        targetTilt = 0;
        setPhase('returning');
      }
    } else {
      emptyHold = 0;
    }
  }

  if (phase === 'returning' && tilt < 0.004) {
    if (water.getFillFraction() < 0.01) {
      setPhase('empty');
      ui.toast('瓶已倒空 · 草地上留下一小片水洼', 2800);
    } else {
      setPhase('open');
      ui.toast('瓶身已扶正', 1600);
    }
  }
}

function updateBottlePose(dt) {
  const speed =
    targetTilt > tilt
      ? THREE.MathUtils.degToRad(CONFIG.water.tiltSpeedDegPerSecond)
      : THREE.MathUtils.degToRad(CONFIG.water.returnSpeedDegPerSecond);
  tilt = moveTowards(tilt, targetTilt, speed * dt);
  const t = THREE.MathUtils.clamp(tilt / maxTilt, 0, 1);
  const eased = t * t * (3 - 2 * t);
  bottle.root.rotation.z = -tilt;
  bottle.root.position.y = 48 * eased;
  bottle.root.position.x = -120 * eased;
}

// ── reset ────────────────────────────────────────────────────────────────
function resetAll() {
  capAnim = null;
  pouring = false;
  emptyHold = 0;
  tilt = 0;
  targetTilt = 0;
  bottle.root.rotation.set(0, 0, 0);
  bottle.root.position.set(0, 0, 0);

  if (bottle.cap.parent !== bottle.root) bottle.root.attach(bottle.cap);
  bottle.cap.position.set(0, CONFIG.bottle.cap.bottomY, 0);
  bottle.cap.quaternion.identity();
  bottle.cap.scale.set(1, 1, 1);
  bottle.setBridgesIntact(true);
  bottle.setRingDropped(0);
  water.reset();
  setPhase('sealed', { fill: 1 });
  autoRotateEnabled = !reducedMotion && !shotMode;
  ui.setAutoRotate(autoRotateEnabled);
  updateAutoRotate();
  ui.toast('已重置 · 满瓶未开封', 2200);
}

// ── click the cap in 3D ──────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pointerDown) return;
  const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (distance > 6 || phase !== 'sealed') return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(bottle.cap, true);
  if (hits.length) openCap();
});

// ── animation loop ───────────────────────────────────────────────────────
let frame = 0;
let readySent = false;

function animate() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  if (document.hidden) return;

  updateCap(dt);
  updateBottlePose(dt);
  const waterState = water.update(dt, { tiltAngle: tilt, pouring });
  updatePourState(dt);
  if (environment) environment.update(dt, timer.getElapsed());
  controls.update();

  renderer.info.reset();
  renderer.render(scene, camera);
  frame += 1;

  if (phase === 'pouring' || phase === 'returning') syncWaterUI();
  else if (frame % 6 === 0) syncWaterUI();

  if (!readySent && frame >= 4) {
    readySent = true;
    ui.setLoading(1);
    ui.ready();
    window.__AQUA__.ready = true;
    if (shotMode) {
      const loader = document.querySelector('#loader');
      if (loader) loader.style.display = 'none';
      document.documentElement.dataset.ready = 'true';
    }
  }

  window.__AQUA__.lastWater = waterState;
}

// ── resize ───────────────────────────────────────────────────────────────
function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.render.maxPixelRatio));
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

// ── public automation API ────────────────────────────────────────────────
window.__AQUA__ = {
  ready: false,
  getState: () => ({
    phase,
    tiltDeg: THREE.MathUtils.radToDeg(tilt),
    fill: water.getFillFraction(),
    volumeMl: water.getVolumeMl(),
    pouredMl: water.getPouredMl(),
    waterLevelY: water.getLevelWorldY(),
    streaming: window.__AQUA__.lastWater?.streaming ?? false,
    capOnBottle: bottle.cap.parent === bottle.root,
  }),
  openCap,
  togglePour,
  reset: resetAll,
  setFillFraction: (fraction) => {
    water.setFillFraction(fraction);
    syncWaterUI();
  },
  setExposure: (value) => {
    renderer.toneMappingExposure = THREE.MathUtils.clamp(Number(value), 0.2, 3);
    ui.setExposureDisplay(renderer.toneMappingExposure);
  },
  setEnvironmentIntensity: (value) => {
    environment.setEnvironmentIntensity(THREE.MathUtils.clamp(Number(value), 0, 3));
    ui.setEnvironmentDisplay(Number(value));
  },
  setCameraPreset: (preset = 'hero') => {
    const presets = {
      hero: { position: CONFIG.camera.start, target: CONFIG.camera.target },
      cap: { position: [62, 208, 148], target: [0, 192, 0] },
      capmacro: { position: [34, 200, 96], target: [0, 189, 0] },
      label: { position: [238, 118, 292], target: [0, 96, 0] },
      top: { position: [95, 380, 165], target: [0, 80, 0] },
      pour: { position: [500, 190, 470], target: [80, 70, 0] },
      low: { position: [190, 28, 300], target: [0, 82, 0] },
    };
    const chosen = presets[preset] ?? presets.hero;
    camera.position.fromArray(chosen.position);
    controls.target.fromArray(chosen.target);
    controls.update();
  },
  setPose: ({ fill = water.getFillFraction(), tiltDeg = 0, capOpen = true, pour = false } = {}) => {
    capAnim = null;
    pouring = Boolean(pour);
    if (capOpen) placeCapAway(true);
    else {
      if (bottle.cap.parent !== bottle.root) bottle.root.attach(bottle.cap);
      bottle.cap.position.set(0, CONFIG.bottle.cap.bottomY, 0);
      bottle.cap.quaternion.identity();
      bottle.setBridgesIntact(true);
      bottle.setRingDropped(0);
    }
    water.setFillFraction(fill);
    targetTilt = THREE.MathUtils.degToRad(tiltDeg);
    tilt = targetTilt;
    bottle.root.rotation.z = -tilt;
    const eased = THREE.MathUtils.clamp(tilt / maxTilt, 0, 1);
    bottle.root.position.y = 48 * eased;
    bottle.root.position.x = -120 * eased;
    bottle.root.updateWorldMatrix(true, false);
    water.update(0.016, { tiltAngle: tilt, pouring });
    const empty = capOpen && fill <= 0.001 && !pour;
    setPhase(pour ? 'pouring' : empty ? 'empty' : capOpen ? 'open' : 'sealed', { fill });
    return window.__AQUA__.getState();
  },
  screenshot: () => renderer.domElement.toDataURL('image/png'),
  getRenderInfo: () => ({ ...renderer.info.render, memory: { ...renderer.info.memory } }),
  scene,
  camera,
  renderer,
};

// ── first frame ──────────────────────────────────────────────────────────
ui.setExposureDisplay(CONFIG.render.exposure);
ui.setEnvironmentDisplay(CONFIG.environment.environmentIntensity);
ui.setAutoRotate(autoRotateEnabled);
ui.setPhase('sealed', { fill: 1 });
ui.setWater(1, 500);

if (shotMode) {
  const pose = urlParams.get('pose');
  if (pose === 'open') window.__AQUA__.setPose({ fill: 1, tiltDeg: 0, capOpen: true });
  if (pose === 'pour') {
    window.__AQUA__.setPose({
      fill: Number(urlParams.get('fill') ?? 0.55),
      tiltDeg: Number(urlParams.get('tilt') ?? CONFIG.water.pourTiltDeg),
      capOpen: true,
      pour: true,
    });
  }
  if (pose === 'empty') window.__AQUA__.setPose({ fill: 0, tiltDeg: 0, capOpen: true, pour: false });
}

renderer.setAnimationLoop(animate);
