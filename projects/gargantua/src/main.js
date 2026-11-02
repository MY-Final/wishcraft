/**
 * GARGANTUA — application shell.
 *
 * Owns the WebGL renderer, the full-screen geodesic pass, the HDR post stack,
 * the frame loop, URL screenshot automation, persistence wiring, and the
 * WebGL context-loss recovery path. UI, camera and audio live in their own
 * modules so they can be developed and tested independently.
 */
import * as THREE from 'three';
import {
  createStore,
  PARAM_DEFS,
  PARAM_COUNT,
  PARAM_IDS,
  QUALITY_BY_ID,
  DEBUG_VIEWS,
  VIEW_PRESETS,
  SHORTCUTS,
  RS,
  MASS,
  PHOTON_SPHERE,
  ISCO,
  CRITICAL_B,
} from './state.js';
import { createCameraRig } from './camera.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';
import { createPostPipeline } from './post.js';
import { BLACKHOLE_VERT, BLACKHOLE_FRAG } from './shaders/blackhole.js';

const VERSION = '1.0.0';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function isWebGLAvailable() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

function buildFullscreenGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  return geometry;
}

const reducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function boot() {
  const canvas = document.querySelector('#gl');
  const store = createStore();
  const shot = store.shot;
  const state = store.state;

  const ui = createUI({ store, canvas });
  const audio = createAudio({ store });

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
  } catch (error) {
    ui.showError?.({
      title: 'WEBGL UNAVAILABLE',
      message: 'This browser or GPU cannot create a WebGL2 context. GARGANTUA needs real-time fragment shader support.',
      detail: error?.message ?? '',
    });
    document.documentElement.dataset.error = 'webgl';
    return;
  }

  if (!isWebGLAvailable()) {
    ui.showError?.({
      title: 'WEBGL DISABLED',
      message: 'WebGL is disabled in this browser. Enable hardware acceleration and reload.',
    });
    document.documentElement.dataset.error = 'webgl';
    return;
  }

  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 1);

  // ── full-screen geodesic pass ──────────────────────────────────────────
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(Number(store.getParam('fieldOfView')), 1, 0.1, 4000);
  const quad = new THREE.Mesh(
    buildFullscreenGeometry(),
    new THREE.RawShaderMaterial({
      vertexShader: BLACKHOLE_VERT,
      fragmentShader: BLACKHOLE_FRAG,
      glslVersion: THREE.GLSL3,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uCamPos: { value: new THREE.Vector3() },
        uCamRight: { value: new THREE.Vector3() },
        uCamUp: { value: new THREE.Vector3() },
        uCamForward: { value: new THREE.Vector3() },
        uTanHalfFov: { value: 1 },
        uAspect: { value: 1 },
        uPixelAngle: { value: 0.001 },
        uStepAngle: { value: 0.052 },
        uMaxSteps: { value: 280 },
        uDebug: { value: 0 },
        uDiskBrightness: { value: 1 },
        uDiskTemperature: { value: 7200 },
        uDiskInner: { value: ISCO },
        uDiskOuter: { value: 13.5 },
        uDiskThickness: { value: 0.22 },
        uDiskOpacity: { value: 0.92 },
        uDiskTurbulence: { value: 0.75 },
        uDiskSpinSpeed: { value: 1 },
        uBeaming: { value: 1 },
        uRedshift: { value: 1 },
        uPhotonRingBoost: { value: 1 },
        uStarBrightness: { value: 1 },
        uGalaxyBrightness: { value: 0.7 },
        uExposure: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    }),
  );
  quad.frustumCulled = false;
  scene.add(quad);
  const rayMaterial = quad.material;

  const rig = createCameraRig({ camera, domElement: canvas, store, reducedMotion });
  rig.applyState?.(store.state);

  const quality = store.quality;
  let post = createPostPipeline({
    renderer,
    width: 2,
    height: 2,
    levels: quality.bloomLevels,
  });

  // ── sizing ────────────────────────────────────────────────────────────
  const sizing = {
    dpr: 1,
    renderWidth: 2,
    renderHeight: 2,
    canvasWidth: 2,
    canvasHeight: 2,
  };

  function computeSize() {
    const qualityLevel = store.quality;
    const cssWidth = Math.max(2, window.innerWidth || 2);
    const cssHeight = Math.max(2, window.innerHeight || 2);
    const deviceDpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const forcedDpr = shot.dpr ?? null;
    const dpr = clamp(forcedDpr ?? Math.min(deviceDpr, qualityLevel.dpr), 0.5, 3);

    let width = cssWidth * dpr * qualityLevel.renderScale;
    let height = cssHeight * dpr * qualityLevel.renderScale;
    const pixels = width * height;
    if (pixels > qualityLevel.maxPixels) {
      const factor = Math.sqrt(qualityLevel.maxPixels / pixels);
      width *= factor;
      height *= factor;
    }

    sizing.dpr = dpr;
    sizing.canvasWidth = Math.max(2, Math.round(cssWidth * dpr));
    sizing.canvasHeight = Math.max(2, Math.round(cssHeight * dpr));
    sizing.renderWidth = Math.max(2, Math.round(width));
    sizing.renderHeight = Math.max(2, Math.round(height));

    renderer.setPixelRatio(1);
    renderer.setSize(sizing.canvasWidth, sizing.canvasHeight, false);
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    rayMaterial.uniforms.uResolution.value.set(sizing.renderWidth, sizing.renderHeight);
    rayMaterial.uniforms.uAspect.value = sizing.renderWidth / sizing.renderHeight;
    rayMaterial.uniforms.uStepAngle.value = qualityLevel.stepAngle;
    rayMaterial.uniforms.uMaxSteps.value = qualityLevel.maxSteps;

    post.resize(sizing.renderWidth, sizing.renderHeight, qualityLevel.bloomLevels);
    post.setOutputSize(sizing.canvasWidth, sizing.canvasHeight);
  }

  function resize() {
    computeSize();
  }

  // ── frame loop ────────────────────────────────────────────────────────
  const clock = { last: performance.now(), elapsed: 0 };
  const stats = {
    fps: 0,
    frameMs: 0,
    frames: 0,
    width: 0,
    height: 0,
    dpr: 1,
    quality: store.state.quality,
    maxSteps: 0,
    stepAngle: 0,
    crossingsBudget: 0,
  };
  let fpsAccumulator = 0;
  let fpsFrames = 0;
  let uiAccumulator = 0;
  let running = true;
  let ready = false;
  let renderedFrames = 0;
  const shotFrames = shot.enabled ? shot.frames : 0;
  let disposed = false;

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);

  rig.update(0, 0);

  function pushUniforms(time) {
    const params = store.state.params;
    const uniforms = rayMaterial.uniforms;
    const qualityLevel = store.quality;

    rayMaterial.uniforms.uPixelAngle.value = (2.0 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(sizing.renderHeight, 1);
    camera.getWorldDirection(forward);
    right.crossVectors(forward, worldUp).normalize();
    if (!Number.isFinite(right.x)) right.set(1, 0, 0);
    up.crossVectors(right, forward).normalize();

    uniforms.uTime.value = time;
    uniforms.uCamPos.value.copy(camera.position);
    uniforms.uCamForward.value.copy(forward);
    uniforms.uCamRight.value.copy(right);
    uniforms.uCamUp.value.copy(up);
    uniforms.uTanHalfFov.value = Math.tan((camera.fov * Math.PI) / 360);
    uniforms.uAspect.value = sizing.canvasWidth / sizing.canvasHeight;

    uniforms.uStepAngle.value = qualityLevel.stepAngle;
    uniforms.uMaxSteps.value = qualityLevel.maxSteps;
    uniforms.uDebug.value = store.state.debug;

    uniforms.uDiskBrightness.value = params.diskBrightness;
    uniforms.uDiskTemperature.value = params.diskTemperature;
    uniforms.uDiskInner.value = Math.min(params.diskInnerRadius, params.diskOuterRadius - 0.5);
    uniforms.uDiskOuter.value = Math.max(params.diskOuterRadius, params.diskInnerRadius + 0.5);
    uniforms.uDiskThickness.value = params.diskThickness;
    uniforms.uDiskOpacity.value = params.diskOpacity;
    uniforms.uDiskTurbulence.value = params.diskTurbulence;
    uniforms.uDiskSpinSpeed.value = params.diskSpinSpeed;
    uniforms.uBeaming.value = params.beaming;
    uniforms.uRedshift.value = params.redshift;
    uniforms.uPhotonRingBoost.value = params.photonRingBoost;
    uniforms.uStarBrightness.value = params.starBrightness;
    uniforms.uGalaxyBrightness.value = params.galaxyBrightness;
    uniforms.uExposure.value = params.exposure;
  }

  function renderFrame(time) {
    pushUniforms(time);
    renderer.setRenderTarget(post.hdr);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    const params = store.state.params;
    post.render(post.hdr.texture, {
      time,
      exposure: params.exposure,
      bloomStrength: params.bloomStrength,
      bloomRadius: params.bloomRadius,
      bloomThreshold: params.bloomThreshold,
      vignette: params.vignette,
      grain: params.grain,
      chroma: params.chromaticAberration,
      debug: store.state.debug,
    });
  }

  function updateStats(now, elapsed, dt) {
    stats.frames += 1;
    stats.width = sizing.renderWidth;
    stats.height = sizing.renderHeight;
    stats.dpr = Number(sizing.dpr.toFixed(2));
    stats.quality = store.state.quality;
    stats.maxSteps = store.quality.maxSteps;
    stats.stepAngle = store.quality.stepAngle;
    stats.crossingsBudget = Number(
      ((store.quality.maxSteps * store.quality.stepAngle) / Math.PI).toFixed(1),
    );
    stats.lastFrameAt = now;
    fpsAccumulator += Math.min(dt, 2.0);
    fpsFrames += 1;
    if (fpsAccumulator >= 0.4) {
      stats.fps = Math.round(fpsFrames / fpsAccumulator);
      stats.frameMs = Number(((fpsAccumulator / fpsFrames) * 1000).toFixed(1));
      fpsAccumulator = 0;
      fpsFrames = 0;
    }
    stats.elapsed = elapsed;
  }

  function loop(now) {
    if (disposed) return;
    if (!running) {
      clock.last = now;
      requestAnimationFrame(loop);
      return;
    }
    const rawDt = Math.max(0, (now - clock.last) / 1000);
    clock.last = now;
    const dt = Math.min(rawDt, 0.1);

    const motion = store.state.motion && !shot.enabled;
    if (motion) clock.elapsed += dt;
    const shaderTime = shot.enabled ? shot.time : clock.elapsed;

    rig.update(dt, shaderTime);
    renderFrame(shaderTime);
    updateStats(now, shaderTime, rawDt);

    renderedFrames += 1;
    if (!ready) {
      if (shot.enabled) {
        if (renderedFrames >= shotFrames) markReady();
      } else if (renderedFrames >= 2) {
        markReady();
      }
    }

    uiAccumulator += dt;
    if (uiAccumulator > 0.2) {
      uiAccumulator = 0;
      ui.updateStats?.(stats);
      ui.updateCamera?.(rig.getSnapshot?.());
    }
    requestAnimationFrame(loop);
  }

  function markReady() {
    if (ready) return;
    ready = true;
    document.documentElement.dataset.ready = 'true';
    window.__GARGANTUA__.ready = true;
    // Screenshot automation contract: a stable global boolean plus the
    // namespaced shot handle for Playwright/Puppeteer capture scripts.
    if (shot.enabled) {
      window.__SHOT_READY = true;
      if (window.__GARGANTUA__.shot) window.__GARGANTUA__.shot.ready = true;
    }
    ui.setReady?.(true);
  }

  // ── public automation / debug API ─────────────────────────────────────
  const api = {
    version: VERSION,
    ready: false,
    constants: { RS, MASS, PHOTON_SPHERE, ISCO, CRITICAL_B },
    params: PARAM_DEFS,
    paramCount: PARAM_COUNT,
    qualityLevels: Object.values(QUALITY_BY_ID),
    debugViews: DEBUG_VIEWS,
    viewPresets: VIEW_PRESETS,
    shortcuts: SHORTCUTS,
    getState: () => store.snapshot(),
    getStats: () => ({ ...stats }),
    setParam: (id, value) => store.setParam(id, value),
    setParams: (values) => store.setParams(values),
    resetParams: () => store.resetParams(),
    setQuality: (id) => store.setQuality(id),
    setDebug: (index) => store.setDebug(index),
    setView: (id) => {
      ui.setView?.(id);
      rig.setPreset?.(id);
      store.setCameraPreset(id);
    },
    setCameraMode: (mode) => {
      rig.setMode?.(mode);
      store.setCameraMode(mode);
    },
    setMotion: (value) => store.setMotion(value),
    setAudio: (value) => {
      store.setAudio(value);
      audio.setEnabled?.(value);
    },
    setTime: (seconds) => {
      clock.elapsed = Number(seconds) || 0;
      return clock.elapsed;
    },
    freeze: (value = true) => store.setMotion(!value),
    screenshot: () => {
      renderFrame(shot.enabled ? shot.time : clock.elapsed);
      return canvas.toDataURL('image/png');
    },
    stats: () => ({ ...stats }),
    rig: () => rig.getSnapshot?.(),
    getShaderDiagnostics: () => ({
      renderer: renderer.info.render,
      programs: renderer.info.programs?.length ?? 0,
      renderTargets: post.debugTargets.length,
      renderWidth: sizing.renderWidth,
      renderHeight: sizing.renderHeight,
      canvasWidth: sizing.canvasWidth,
      canvasHeight: sizing.canvasHeight,
      dpr: sizing.dpr,
      quality: store.state.quality,
      debug: store.state.debug,
    }),
  };
  window.__GARGANTUA__ = api;
  if (shot.enabled) {
    api.shot = { enabled: true, time: shot.time, frames: shot.frames, ready: false };
    api.shot.capture = api.screenshot;
  }

  // ── persistence / clock / motion ──────────────────────────────────────
  if (reducedMotion && !shot.enabled) {
    store.setCameraMode('manual');
    if (!store.state.camera.preset) store.setCameraPreset('oblique');
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
    } else {
      clock.last = performance.now();
      running = true;
    }
  });

  // ── WebGL context loss / restore ─────────────────────────────────────
  let contextLost = false;
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      contextLost = true;
      running = false;
      ui.showError?.({
        title: 'RENDER CONTEXT LOST',
        message: 'The GPU context was lost. GARGANTUA is holding the simulation until it can rebuild.',
        actionLabel: 'ATTEMPT RESTORE',
        onAction: () => {
          const extension = renderer.getContext()?.getExtension('WEBGL_lose_context');
          extension?.restoreContext?.();
        },
      });
      document.documentElement.dataset.context = 'lost';
    },
    false,
  );

  canvas.addEventListener(
    'webglcontextrestored',
    () => {
      contextLost = false;
      try {
        // Do NOT dispose the previous pipeline here: its GL handles belong to
        // the lost context and deleting them after restore makes the driver
        // emit INVALID_OPERATION warnings. Replacing the reference is enough;
        // the old JS objects are collected and the fresh context owns the new
        // render targets.
        post = createPostPipeline({
          renderer,
          width: sizing.renderWidth,
          height: sizing.renderHeight,
          levels: store.quality.bloomLevels,
        });
        computeSize();
        ui.hideError?.();
        document.documentElement.dataset.context = 'restored';
        clock.last = performance.now();
        running = true;
      } catch (error) {
        ui.showError?.({
          title: 'RESTORE FAILED',
          message: 'WebGL could not be reinitialised. Reload to continue.',
          detail: error?.message ?? '',
        });
      }
    },
    false,
  );

  // ── audio needs a gesture from some browsers ─────────────────────────
  const unlockAudio = () => {
    if (store.state.audio) audio.setEnabled?.(true);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  // ── go ────────────────────────────────────────────────────────────────
  computeSize();
  resize();
  store.subscribe((change) => {
    if (change.type === 'quality') {
      resize();
      ui.updateQuality?.(change.id);
    }
    if (change.type === 'debug') {
      ui.updateDebug?.(change.id);
    }
    if (change.type === 'camera') {
      ui.updateCamera?.(rig.getSnapshot?.());
    }
    if (change.type === 'audio') {
      audio.setEnabled?.(change.enabled);
    }
    if (change.type === 'reset' || change.type === 'reset-all') {
      ui.syncFromState?.(store.state);
    }
  });

  ui.updateStats?.(stats);
  ui.syncFromState?.(store.state);
  requestAnimationFrame(loop);

  window.addEventListener('pagehide', () => {
    disposed = true;
    audio.dispose?.();
    rig.dispose?.();
    post.dispose();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
