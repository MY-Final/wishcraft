/**
 * GARGANTUA — camera rig.
 *
 * The rig owns exactly three behaviours, all of which keep the camera aimed at
 * the black hole (the origin, where the geodesic pass expects it):
 *
 *   1. DIRECT OBSERVATION — an OrbitControls rig with damping: drag/touch to
 *      orbit, wheel/pinch to dolly. The wheel path is eased in the rig so the
 *      dolly is damped as well; the radius is clamped to 2.4…140 r_s and the
 *      inclination to 2°…178°.
 *
 *   2. CINEMATIC LOOP — the default attract loop. The pose is a pure function
 *      of the shared shader clock (`time`), never of wall time, so it is
 *      deterministic and freezes exactly when Space pauses the simulation.
 *      Radius breathes between ~14 and ~21 r_s, inclination between 72° and
 *      93°, and the azimuth drifts continuously.
 *
 *   3. VIEW PRESETS — the four authored shots from state.js, reached with a
 *      ~1.3 s eased transition in spherical space (so the camera never cuts
 *      through the origin), starting from wherever the camera happens to be.
 *
 * Entering the cinematic loop (boot, C, or the API) never teleports: the
 * camera eases from its current pose onto the moving cinematic rail. Any
 * OrbitControls interaction ("start") reclaims manual control immediately,
 * from the current pose, with no jump.
 *
 * `prefers-reduced-motion` is honoured with a still, authored oblique shot and
 * no automatic motion at all.
 */
import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/addons/OrbitControls.js';
import { VIEW_BY_ID, VIEW_PRESETS } from './state.js';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

const MIN_RADIUS = 2.4;
const MAX_RADIUS = 140;
const MIN_POLAR = 2;
const MAX_POLAR = 178;

/** Seconds for a preset -> preset eased move. */
const PRESET_EASE_SECONDS = 1.3;
/** Seconds to ease from a free pose onto the cinematic rail. */
const CINEMATIC_ENTRY_SECONDS = 2.8;
/** Dolly easing time constant (95 % of a wheel step lands in ~0.27 s). */
const ZOOM_TAU_SECONDS = 0.09;
/** Fraction of a wheel step applied on the event itself (responsiveness). */
const ZOOM_IMMEDIATE_FRACTION = 0.35;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const normalizeAzimuth = (degrees) => ((degrees % 360) + 360) % 360;
const round = (value, digits) => Number(value.toFixed(digits));

/** Signed shortest angular difference from `from` to `to`, in degrees. */
function shortestAzimuthDelta(from, to) {
  let delta = normalizeAzimuth(to - from);
  if (delta > 180) delta -= 360;
  return delta;
}

const EDGE = VIEW_BY_ID.edge ?? VIEW_PRESETS[0];
const OBLIQUE = VIEW_BY_ID.oblique ?? { radius: 13.5, polar: 58, azimuth: 42 };

/** Convert spherical camera coordinates (degrees) to a world position. */
function sphericalToPosition(radius, polarDeg, azimuthDeg, target, out = new THREE.Vector3()) {
  const polar = polarDeg * DEG;
  const azimuth = azimuthDeg * DEG;
  const sinPolar = Math.sin(polar);
  out.set(
    radius * sinPolar * Math.cos(azimuth),
    radius * Math.cos(polar),
    radius * sinPolar * Math.sin(azimuth),
  );
  return out.add(target);
}

/** Read the camera position back as spherical coordinates (degrees). */
function readSpherical(position) {
  const radius = position.length();
  const safeRadius = Math.max(radius, 1e-6);
  return {
    radius,
    polar: Math.acos(clamp(position.y / safeRadius, -1, 1)) * RAD,
    azimuth: normalizeAzimuth(Math.atan2(position.z, position.x) * RAD),
  };
}

/**
 * The cinematic rail. Every term is a smooth sinusoid of the shader clock, so
 * the shot is continuous, deterministic and has no loop seam.
 */
function cinematicPose(time) {
  const t = Number.isFinite(time) ? time : 0;
  return {
    radius: clamp(17.4 + 2.5 * Math.sin(t * 0.052 + 0.6) + 1.0 * Math.sin(t * 0.019 + 2.2), 14, 21),
    polar: clamp(82.5 + 9.0 * Math.sin(t * 0.041 + 1.2) + 1.5 * Math.sin(t * 0.017 + 0.4), 72, 93),
    azimuth: EDGE.azimuth + t * 2.1 + 7.0 * Math.sin(t * 0.026 + 0.5) + 2.0 * Math.sin(t * 0.011 + 1.9),
  };
}

export function createCameraRig({
  camera,
  domElement,
  store,
  reducedMotion = false,
  controlsTarget = new THREE.Vector3(),
}) {
  const target = controlsTarget.clone();
  const controls = new OrbitControls(camera, domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.7;
  controls.panSpeed = 0.5;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = MIN_RADIUS;
  controls.maxDistance = MAX_RADIUS;
  controls.minPolarAngle = MIN_POLAR * DEG;
  controls.maxPolarAngle = MAX_POLAR * DEG;
  controls.enabled = true;

  let mode = 'cinematic';
  let preset = 'edge';
  let transition = null; // { elapsed, from:{radius,polar,azimuth}, to:{...} }
  let entry = null; // { elapsed, from:{radius,polar,azimuth} }
  let zoomGoal = null; // eased dolly target radius, manual only
  let lastTime = 0;
  let disposed = false;

  function applyPose(pose) {
    const radius = clamp(pose.radius, MIN_RADIUS, MAX_RADIUS);
    const polar = clamp(pose.polar, MIN_POLAR, MAX_POLAR);
    sphericalToPosition(radius, polar, pose.azimuth, target, camera.position);
    camera.lookAt(target);
  }

  function applyRadius(radius) {
    const current = readSpherical(camera.position);
    applyPose({ radius: clamp(radius, MIN_RADIUS, MAX_RADIUS), polar: current.polar, azimuth: current.azimuth });
  }

  function snapshotPose() {
    return readSpherical(camera.position);
  }

  function syncFov() {
    const fov = Number(store?.getParam?.('fieldOfView'));
    if (!Number.isFinite(fov)) return;
    const next = clamp(fov, 10, 140);
    if (Math.abs(next - camera.fov) > 1e-4) {
      camera.fov = next;
      camera.updateProjectionMatrix();
    }
  }

  function syncAspect() {
    const width = typeof window !== 'undefined' ? window.innerWidth : 0;
    const height = typeof window !== 'undefined' ? window.innerHeight : 0;
    if (!(width > 0) || !(height > 0)) return;
    const aspect = width / height;
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    if (Math.abs(camera.aspect - aspect) > 1e-4) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
  }

  function persistCamera() {
    if (disposed || !store?.setCamera) return;
    const current = snapshotPose();
    store.setCamera({
      radius: round(clamp(current.radius, MIN_RADIUS, MAX_RADIUS), 3),
      polar: round(clamp(current.polar, MIN_POLAR, MAX_POLAR), 2),
      azimuth: round(current.azimuth, 2),
    });
  }

  function captureCinematicEntry(time) {
    const current = snapshotPose();
    entry = {
      elapsed: 0,
      from: {
        radius: clamp(current.radius, MIN_RADIUS, MAX_RADIUS),
        polar: clamp(current.polar, MIN_POLAR, MAX_POLAR),
        azimuth: current.azimuth,
      },
    };
    // Keep the clock warm so the very first cinematic frame already has a pose.
    if (Number.isFinite(time)) lastTime = time;
  }

  function updateCinematic(step, time) {
    // The entry blend is captured exactly once, when the rig enters cinematic
    // mode (boot, C, API or applyState). Once it has finished, the camera rides
    // the time-driven rail directly.
    if (!entry) {
      applyPose(cinematicPose(time));
      controls.target.copy(target);
      return;
    }
    entry.elapsed += step;
    const progress = clamp(entry.elapsed / CINEMATIC_ENTRY_SECONDS, 0, 1);
    const eased = easeInOutCubic(progress);
    const canonical = cinematicPose(time);
    const from = entry.from;
    // Pick the canonical azimuth representative closest to the entry azimuth so
    // the ease never spins the long way around.
    const targetAzimuth = canonical.azimuth + 360 * Math.round((from.azimuth - canonical.azimuth) / 360);
    applyPose({
      radius: lerp(from.radius, canonical.radius, eased),
      polar: lerp(from.polar, canonical.polar, eased),
      azimuth: lerp(from.azimuth, targetAzimuth, eased),
    });
    controls.target.copy(target);
    if (progress >= 1) entry = null;
  }

  function updateTransition(step) {
    transition.elapsed += step;
    const progress = clamp(transition.elapsed / PRESET_EASE_SECONDS, 0, 1);
    const eased = easeInOutCubic(progress);
    applyPose({
      radius: lerp(transition.from.radius, transition.to.radius, eased),
      polar: lerp(transition.from.polar, transition.to.polar, eased),
      azimuth: lerp(transition.from.azimuth, transition.to.azimuth, eased),
    });
    controls.target.copy(target);
    if (progress >= 1) {
      transition = null;
      controls.update();
    }
  }

  function updateManual(step) {
    controls.target.copy(target);
    controls.update();
    if (zoomGoal !== null) {
      const current = readSpherical(camera.position);
      const factor = 1 - Math.exp(-step / ZOOM_TAU_SECONDS);
      const nextRadius = current.radius + (zoomGoal - current.radius) * clamp(factor, 0, 1);
      applyRadius(nextRadius);
      camera.lookAt(target);
      if (Math.abs(zoomGoal - nextRadius) < 0.01) {
        zoomGoal = null;
        persistCamera();
      }
    }
  }

  function setMode(nextMode, { persist = true } = {}) {
    if (disposed) return;
    const normalized = nextMode === 'manual' ? 'manual' : 'cinematic';

    // Reduced motion never runs the attract loop.
    if (reducedMotion) {
      if (mode !== 'manual') {
        mode = 'manual';
        transition = null;
        entry = null;
        zoomGoal = null;
        controls.target.copy(target);
        controls.update();
      }
      if (persist && store?.state?.camera?.mode !== 'manual') store.setCameraMode?.('manual');
      return;
    }

    if (normalized === mode) {
      if (persist && store?.state?.camera?.mode !== mode) store.setCameraMode?.(mode);
      return;
    }

    transition = null;
    zoomGoal = null;
    mode = normalized;

    if (mode === 'cinematic') {
      // Ease from the current (manual) pose onto the moving rail; never cut.
      captureCinematicEntry(lastTime);
      controls.target.copy(target);
    } else {
      entry = null;
      controls.target.copy(target);
      controls.update();
      persistCamera();
    }
    if (persist) store?.setCameraMode?.(mode);
  }

  function setPreset(id, { persist = true } = {}) {
    if (disposed) return;
    const definition = VIEW_BY_ID[id];
    if (!definition) return;

    const from = snapshotPose();
    const to = {
      radius: clamp(definition.radius, MIN_RADIUS, MAX_RADIUS),
      polar: clamp(definition.polar, MIN_POLAR, MAX_POLAR),
      // Always travel the short way around; any multiple of 360° is the same pose.
      azimuth: from.azimuth + shortestAzimuthDelta(from.azimuth, definition.azimuth),
    };

    transition = { elapsed: 0, from, to };
    entry = null;
    zoomGoal = null;
    mode = 'manual';
    preset = id;

    controls.target.copy(target);
    // Keep OrbitControls live so a drag can interrupt the ease.
    if (persist) {
      store?.setCameraPreset?.(id);
      store?.setCamera?.({
        radius: round(to.radius, 3),
        polar: round(to.polar, 2),
        azimuth: round(normalizeAzimuth(to.azimuth), 2),
      });
    }
  }

  /**
   * Restore a serialised camera state. Called by main.js right after boot and
   * after a full reset. Never persists implicitly (except for the reduced
   * motion default, where the still oblique shot is written back so the HUD and
   * the rig agree).
   */
  function applyState(state) {
    if (disposed) return;
    const cameraState = state?.camera;
    transition = null;
    entry = null;
    zoomGoal = null;

    const storedPreset =
      cameraState && VIEW_BY_ID[cameraState.preset] ? cameraState.preset : 'edge';
    const explicitView = Boolean(store?.config?.camera || store?.config?.view);
    const useOblique = reducedMotion && !explicitView && cameraState?.mode !== 'manual';

    preset = useOblique ? 'oblique' : storedPreset;
    mode = reducedMotion ? 'manual' : cameraState?.mode === 'manual' ? 'manual' : 'cinematic';

    if (useOblique) {
      applyPose(OBLIQUE);
    } else {
      const hasPose =
        cameraState &&
        Number.isFinite(cameraState.radius) &&
        Number.isFinite(cameraState.polar) &&
        Number.isFinite(cameraState.azimuth);
      applyPose(
        hasPose
          ? {
              radius: cameraState.radius,
              polar: cameraState.polar,
              azimuth: cameraState.azimuth,
            }
          : EDGE,
      );
    }

    controls.target.copy(target);
    if (mode === 'manual') {
      controls.update();
    } else {
      captureCinematicEntry(lastTime);
    }

    if (useOblique && store) {
      store.setCameraPreset?.('oblique');
      store.setCamera?.({
        radius: round(OBLIQUE.radius, 3),
        polar: round(OBLIQUE.polar, 2),
        azimuth: round(OBLIQUE.azimuth, 2),
      });
    }
    if (reducedMotion && store?.state?.camera?.mode !== 'manual') {
      store.setCameraMode?.('manual');
    }
  }

  function update(dt, time) {
    if (disposed) return;
    const step = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.25);
    if (Number.isFinite(time)) lastTime = time;

    syncFov();

    // Reduced motion: a still, manual shot. No automatic motion, ever.
    if (reducedMotion) {
      if (mode !== 'manual') {
        mode = 'manual';
        transition = null;
        entry = null;
        zoomGoal = null;
      }
    }

    if (transition) {
      updateTransition(step);
      return;
    }
    if (mode === 'cinematic') {
      updateCinematic(step, lastTime);
      return;
    }
    updateManual(step);
  }

  function getSnapshot() {
    const current = snapshotPose();
    return {
      mode,
      preset,
      radius: round(current.radius, 3),
      polar: round(current.polar, 2),
      azimuth: round(current.azimuth, 2),
      fov: round(camera.fov, 2),
      aspect: round(camera.aspect, 4),
      transitioning: transition !== null,
      blending: entry !== null,
      zooming: zoomGoal !== null,
    };
  }

  // ── interpretation: interaction reclaims manual control instantly ────────
  function onControlsStart() {
    if (disposed) return;
    transition = null;
    zoomGoal = null;
    controls.target.copy(target);
    if (mode !== 'manual') {
      mode = 'manual';
      entry = null;
      store?.setCameraMode?.('manual');
    }
  }

  function onControlsEnd() {
    if (disposed || mode !== 'manual' || transition) return;
    zoomGoal = null;
    persistCamera();
  }

  function onWheelCapture(event) {
    if (disposed || !event || event.target !== domElement) return;
    if (!event.deltaY && !event.deltaX) return;

    // Own the wheel dolly so it can be eased; OrbitControls would apply it as
    // an instant step. Pinch/touch dolly still goes through OrbitControls.
    event.preventDefault();
    event.stopPropagation();

    transition = null;
    if (mode !== 'manual') {
      mode = 'manual';
      entry = null;
      store?.setCameraMode?.('manual');
    }

    const current = readSpherical(camera.position);
    const delta = clamp(event.deltaY, -480, 480);
    const factor = Math.exp(delta * 0.0012);
    const baseRadius = zoomGoal ?? current.radius;
    const goal = clamp(baseRadius * factor, MIN_RADIUS, MAX_RADIUS);
    zoomGoal = goal;

    // Apply the first slice immediately, then ease the rest frame by frame.
    applyRadius(current.radius + (goal - current.radius) * ZOOM_IMMEDIATE_FRACTION);
    controls.target.copy(target);
    camera.lookAt(target);
  }

  function onResize() {
    syncAspect();
  }

  controls.addEventListener('start', onControlsStart);
  controls.addEventListener('end', onControlsEnd);
  if (typeof window !== 'undefined') {
    // Capture phase on window so OrbitControls never sees the wheel first.
    window.addEventListener('wheel', onWheelCapture, { passive: false, capture: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
  }
  syncAspect();

  const unsubscribe = store?.subscribe?.((change, state) => {
    if (disposed || !change) return;
    if (change.type === 'camera') {
      if (reducedMotion && state?.camera?.mode === 'cinematic') {
        // The API always mirrors its request into the store; in reduced motion
        // the rig declines the attract loop, so keep the store truthful.
        store?.setCameraMode?.('manual');
        return;
      }
      const wanted = reducedMotion
        ? 'manual'
        : state?.camera?.mode === 'manual'
          ? 'manual'
          : 'cinematic';
      if (wanted !== mode) setMode(wanted, { persist: false });
      return;
    }
    if (change.type === 'reset-all') applyState(state);
  });

  // Initial pose; main.js calls applyState() immediately afterwards as well.
  applyState(store?.state ?? { camera: { mode: 'cinematic', preset: 'edge', ...EDGE } });

  return {
    controls,
    setMode,
    setPreset,
    applyState,
    update,
    getSnapshot,
    get mode() {
      return mode;
    },
    get preset() {
      return preset;
    },
    /** Restart the attract loop from the current pose. */
    beginCinematic() {
      if (reducedMotion) return;
      transition = null;
      zoomGoal = null;
      mode = 'cinematic';
      captureCinematicEntry(lastTime);
      controls.target.copy(target);
      store?.setCameraMode?.('cinematic');
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      transition = null;
      entry = null;
      zoomGoal = null;
      unsubscribe?.();
      if (typeof window !== 'undefined') {
        window.removeEventListener('wheel', onWheelCapture, true);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
      }
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('end', onControlsEnd);
      controls.dispose();
    },
    presets: VIEW_PRESETS,
  };
}
