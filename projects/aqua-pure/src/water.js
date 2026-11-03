/**
 * AQUA PURE — water volume, world-horizontal free surface and pour effects.
 *
 * The liquid is a closed solid of revolution that follows the bottle exactly,
 * trimmed every frame by a world-space clipping plane. The free surface is a
 * separate world-space mesh rebuilt from the analytic bottle profile so it is
 * always horizontal (perpendicular to gravity), no matter how the bottle is
 * tilted. That is the core physical cue the brief asks for.
 *
 * Units: millimetres.
 */
import * as THREE from 'three';
import { CONFIG } from './config.js';
import {
  buildWaterProfilePoints,
  circleAreaBelow,
  clamp,
  gripDepth,
  innerRadiusAt,
  lerp,
  MOUTH_INNER_RADIUS,
} from './profile.js';

const B = CONFIG.bottle;
const W = CONFIG.water;

const UP = new THREE.Vector3(0, 1, 0);

function makeCircleTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.45, 'rgba(230,248,255,0.9)');
  gradient.addColorStop(1, 'rgba(200,240,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A tube whose radius tapers from mouth to impact. */
function makeTaperedTube(curve, radius, tubularSegments = 44, radialSegments = 8, endScale = 0.55) {
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  const position = geometry.attributes.position;
  const center = new THREE.Vector3();
  const point = new THREE.Vector3();
  const ringCount = tubularSegments + 1;
  const radialCount = radialSegments + 1;
  for (let i = 0; i < ringCount; i += 1) {
    const t = i / tubularSegments;
    curve.getPointAt(t, center);
    const scale = lerp(1, endScale, Math.pow(t, 0.7));
    for (let j = 0; j < radialCount; j += 1) {
      const index = i * radialCount + j;
      point.fromBufferAttribute(position, index);
      point.sub(center).multiplyScalar(scale).add(center);
      position.setXYZ(index, point.x, point.y, point.z);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function createWaterSystem({ scene, bottleRoot, config = CONFIG } = {}) {
  const fullVolume = computeVolumeBelowLocalHeight(B.initialWaterTop);
  let volume = fullVolume * W.initialFraction;
  let poured = 0;
  let levelWorldY = B.initialWaterTop;
  let streamActive = false;
  let puddleTargetScale = 0;
  let surfaceRendered = false;

  // Plane equation: distance = (-1)·y + constant. Everything with y > constant
  // has negative signed distance and is cut away, leaving the water below H.
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), B.initialWaterTop);

  // ── water body: closed solid, clipped by the world-horizontal plane ─────
  const bodyPoints = buildWaterProfilePoints().map(([r, y]) => new THREE.Vector2(r, y));
  const bodyGeometry = new THREE.LatheGeometry(bodyPoints, B.radialSegments);
  displaceWaterBody(bodyGeometry);
  bodyGeometry.computeVertexNormals();

  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: W.color,
    roughness: W.roughness,
    metalness: 0,
    transmission: 1,
    thickness: 26,
    ior: W.ior,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    attenuationColor: new THREE.Color(0xb8e4ff),
    attenuationDistance: 240,
    envMapIntensity: 1.25,
    side: THREE.DoubleSide,
    depthWrite: false,
    clippingPlanes: [clipPlane],
    clipShadows: true,
  });

  const body = new THREE.Mesh(bodyGeometry, waterMaterial);
  body.name = 'water-body';
  body.renderOrder = 4;
  body.castShadow = false;
  body.receiveShadow = false;
  body.frustumCulled = false;
  bottleRoot.add(body);

  // A whisper of blue volume. The physical water surface stays pure
  // transmission; this translucent inner layer gives the liquid a readable
  // body against a bright meadow without turning the bottle milky.
  const tintMaterial = new THREE.MeshBasicMaterial({
    color: 0x9fd4ff,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
    clippingPlanes: [clipPlane],
  });
  const tint = new THREE.Mesh(bodyGeometry, tintMaterial);
  tint.name = 'water-tint';
  tint.renderOrder = 5;
  tint.frustumCulled = false;
  bottleRoot.add(tint);

  // ── world-space free surface + meniscus ────────────────────────────────
  const segments = W.surfaceSegments;
  const surfaceGeometry = new THREE.BufferGeometry();
  const surfacePositions = new Float32Array((segments * 2 + 1) * 3);
  surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(surfacePositions, 3));
  const surfaceIndices = [];
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    const b0 = i;
    const b1 = next;
    const i0 = segments + i;
    const i1 = segments + next;
    const c = segments * 2;
    surfaceIndices.push(b0, b1, i1, b0, i1, i0);
    surfaceIndices.push(i0, i1, c);
  }
  surfaceGeometry.setIndex(surfaceIndices);

  const surfaceMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xdff4ff,
    roughness: 0.02,
    metalness: 0,
    transmission: 0,
    opacity: 0.38,
    transparent: true,
    thickness: 1.8,
    ior: W.ior,
    clearcoat: 1,
    clearcoatRoughness: 0.015,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surface.name = 'water-surface';
  surface.renderOrder = 6;
  surface.frustumCulled = false;
  surface.visible = false;
  scene.add(surface);

  const meniscusPositions = new Float32Array((segments + 1) * 3);
  const meniscusGeometry = new THREE.BufferGeometry();
  meniscusGeometry.setAttribute('position', new THREE.BufferAttribute(meniscusPositions, 3));
  const meniscus = new THREE.LineLoop(
    meniscusGeometry,
    new THREE.LineBasicMaterial({
      color: 0xdff6ff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  meniscus.name = 'water-meniscus';
  meniscus.renderOrder = 7;
  meniscus.frustumCulled = false;
  meniscus.visible = false;
  scene.add(meniscus);

  // ── pouring stream ─────────────────────────────────────────────────────
  const streamGroup = new THREE.Group();
  streamGroup.name = 'water-stream';
  streamGroup.visible = false;
  scene.add(streamGroup);

  const streamMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xbfe9ff,
    roughness: 0.035,
    metalness: 0,
    transmission: 0.2,
    thickness: 4,
    ior: W.ior,
    transparent: true,
    opacity: 0.62,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const streamCoreMaterial = new THREE.MeshBasicMaterial({
    color: 0xd9f4ff,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  let streamMesh = null;
  let streamCore = null;
  let lastStreamGeometry = null;
  let lastStreamCoreGeometry = null;

  // ── splash particles ───────────────────────────────────────────────────
  const splashCount = W.splashCount;
  const splashPositions = new Float32Array(splashCount * 3);
  const splashVelocities = new Float32Array(splashCount * 3);
  const splashLife = new Float32Array(splashCount);
  for (let i = 0; i < splashCount; i += 1) splashPositions[i * 3 + 1] = -1000;
  const splashGeometry = new THREE.BufferGeometry();
  splashGeometry.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));
  const splashMaterial = new THREE.PointsMaterial({
    size: 4.2,
    map: makeCircleTexture(64),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const splash = new THREE.Points(splashGeometry, splashMaterial);
  splash.name = 'water-splash';
  splash.frustumCulled = false;
  scene.add(splash);
  let splashCursor = 0;

  // ── puddle + ripple rings ──────────────────────────────────────────────
  const puddleMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x9fd8ff,
    roughness: 0.025,
    metalness: 0,
    transmission: 0.72,
    thickness: 2,
    ior: W.ior,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 64), puddleMaterial);
  puddle.name = 'water-puddle';
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(160, 0.52, 45);
  puddle.scale.setScalar(0.001);
  puddle.visible = false;
  scene.add(puddle);

  const rippleMaterial = new THREE.MeshBasicMaterial({
    color: 0xdcf6ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ripples = [];
  for (let i = 0; i < 3; i += 1) {
    const ripple = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48), rippleMaterial.clone());
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(160, 0.56, 45);
    ripple.visible = false;
    scene.add(ripple);
    ripples.push({ mesh: ripple, phase: i / 3 });
  }

  // ── volume mathematics ─────────────────────────────────────────────────
  /**
   * Integrate the water volume below a horizontal world plane.
   * The plane is expressed in bottle-local space as n·p + d = 0.
   */
  function volumeBelowWorldPlane(worldY) {
    bottleRoot.updateWorldMatrix(true, false);
    const quaternion = new THREE.Quaternion();
    bottleRoot.getWorldQuaternion(quaternion);
    const n = UP.clone().applyQuaternion(quaternion.invert());
    const rootY = bottleRoot.getWorldPosition(new THREE.Vector3()).y;
    const d = rootY - worldY;
    let total = 0;
    const step = 1.25;
    for (let y = step / 2; y < B.lipTop; y += step) {
      const radius = Math.max(0.35, innerRadiusAt(y, 0));
      const signedDistance = n.y * y + d;
      total += circleAreaBelow(radius, signedDistance) * step;
    }
    return total;
  }

  function computeVolumeBelowLocalHeight(height) {
    let total = 0;
    const step = 1;
    for (let y = step / 2; y < B.lipTop; y += step) {
      const radius = Math.max(0.35, innerRadiusAt(y, 0));
      total += circleAreaBelow(radius, y - height) * step;
    }
    return total;
  }

  /** World height of the lowest point of the mouth rim. */
  function lowestMouthWorldY() {
    bottleRoot.updateWorldMatrix(true, false);
    const quaternion = new THREE.Quaternion();
    bottleRoot.getWorldQuaternion(quaternion);
    const n = UP.clone().applyQuaternion(quaternion.invert());
    const center = bottleRoot.localToWorld(new THREE.Vector3(0, B.lipTop, 0));
    return center.y - MOUTH_INNER_RADIUS * Math.hypot(n.x, n.z);
  }

  /** Invert the monotonic volume(H) curve for the current pose. */
  function heightForVolume(targetVolume) {
    if (targetVolume <= fullVolume * 1e-5) return null;
    bottleRoot.updateWorldMatrix(true, false);
    const rootY = bottleRoot.getWorldPosition(new THREE.Vector3()).y;
    let low = rootY - 180;
    let high = rootY + B.lipTop + 80;
    for (let i = 0; i < 24; i += 1) {
      const mid = (low + high) / 2;
      if (volumeBelowWorldPlane(mid) < targetVolume) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  }

  function capacityAtMouth() {
    const mouthY = lowestMouthWorldY();
    return Math.max(0, volumeBelowWorldPlane(mouthY - 0.12));
  }

  // ── dynamic free surface ───────────────────────────────────────────────
  const localPoint = new THREE.Vector3();
  const worldPoint = new THREE.Vector3();

  function updateSurface(worldY) {
    if (worldY === null || volume <= fullVolume * 2e-4) {
      surface.visible = false;
      meniscus.visible = false;
      surfaceRendered = false;
      return;
    }
    bottleRoot.updateWorldMatrix(true, false);
    const quaternion = new THREE.Quaternion();
    bottleRoot.getWorldQuaternion(quaternion);
    const n = UP.clone().applyQuaternion(quaternion.invert());
    const rootY = bottleRoot.getWorldPosition(new THREE.Vector3()).y;
    const d = rootY - worldY;

    const boundary = [];
    const cos = Math.cos;
    const sin = Math.sin;
    for (let i = 0; i < segments; i += 1) {
      const theta = (i / segments) * Math.PI * 2;
      const f = (y) => {
        const radius = Math.max(0.3, innerRadiusAt(y, theta));
        return n.x * radius * cos(theta) + n.y * y + n.z * radius * sin(theta) + d;
      };
      const fLow = f(0.05);
      const fHigh = f(B.lipTop - 0.4);
      if (fLow > 0 || fHigh < 0) {
        // The plane does not cut the side wall: clamp to the mouth rim.
        if (fHigh < 0) {
          const radius = Math.max(0.3, innerRadiusAt(B.lipTop - 0.4, theta) - 0.05);
          localPoint.set(radius * cos(theta), B.lipTop - 0.4, radius * sin(theta));
        } else {
          const radius = Math.max(0.3, innerRadiusAt(0.05, theta) - 0.05);
          localPoint.set(radius * cos(theta), 0.05, radius * sin(theta));
        }
        worldPoint.copy(localPoint);
        bottleRoot.localToWorld(worldPoint);
        boundary.push(worldPoint.clone());
        continue;
      }
      let lo = 0.05;
      let hi = B.lipTop - 0.4;
      for (let iteration = 0; iteration < 24; iteration += 1) {
        const midY = (lo + hi) / 2;
        if (f(midY) < 0) lo = midY;
        else hi = midY;
      }
      const y = (lo + hi) / 2;
      const radius = Math.max(0.3, innerRadiusAt(y, theta) - 0.05);
      localPoint.set(radius * cos(theta), y, radius * sin(theta));
      worldPoint.copy(localPoint);
      bottleRoot.localToWorld(worldPoint);
      boundary.push(worldPoint.clone());
    }

    const centroid = new THREE.Vector3();
    for (const point of boundary) centroid.add(point);
    centroid.multiplyScalar(1 / boundary.length);

    for (let i = 0; i < segments; i += 1) {
      const p = boundary[i];
      surfacePositions[i * 3] = p.x;
      surfacePositions[i * 3 + 1] = p.y;
      surfacePositions[i * 3 + 2] = p.z;

      const inner = centroid.clone().addScaledVector(p.clone().sub(centroid), 0.62);
      inner.y += W.meniscusRise * 0.32;
      surfacePositions[(segments + i) * 3] = inner.x;
      surfacePositions[(segments + i) * 3 + 1] = inner.y;
      surfacePositions[(segments + i) * 3 + 2] = inner.z;

      meniscusPositions[i * 3] = p.x;
      meniscusPositions[i * 3 + 1] = p.y + 0.03;
      meniscusPositions[i * 3 + 2] = p.z;
    }
    const centerIndex = segments * 2;
    const raisedCentre = centroid.clone();
    raisedCentre.y += W.meniscusRise;
    surfacePositions[centerIndex * 3] = raisedCentre.x;
    surfacePositions[centerIndex * 3 + 1] = raisedCentre.y;
    surfacePositions[centerIndex * 3 + 2] = raisedCentre.z;
    meniscusPositions[segments * 3] = meniscusPositions[0];
    meniscusPositions[segments * 3 + 1] = meniscusPositions[1];
    meniscusPositions[segments * 3 + 2] = meniscusPositions[2];

    surfaceGeometry.attributes.position.needsUpdate = true;
    surfaceGeometry.computeVertexNormals();
    surfaceGeometry.computeBoundingSphere();
    meniscusGeometry.attributes.position.needsUpdate = true;
    meniscusGeometry.computeBoundingSphere();

    surface.visible = true;
    meniscus.visible = true;
    surfaceRendered = true;
  }

  // ── stream + splash + puddle ───────────────────────────────────────────
  const mouthWorld = new THREE.Vector3();
  const spoutLocal = new THREE.Vector3(MOUTH_INNER_RADIUS * 0.86, B.lipTop - 1.2, 0);
  const landing = new THREE.Vector3();
  const control = new THREE.Vector3();

  function updateStream(dt, tiltAngle) {
    const active =
      streamActive &&
      volume > fullVolume * 0.0015 &&
      tiltAngle > THREE.MathUtils.degToRad(22);
    streamGroup.visible = active;
    if (!active) return;

    bottleRoot.updateWorldMatrix(true, false);
    mouthWorld.copy(spoutLocal);
    bottleRoot.localToWorld(mouthWorld);
    const spread = clamp(tiltAngle / THREE.MathUtils.degToRad(W.pourTiltDeg), 0, 1);
    landing.set(mouthWorld.x + 58 + 32 * spread, 0.7, mouthWorld.z + 45);
    control.set(
      (mouthWorld.x + landing.x) / 2 + 6,
      Math.max(30, mouthWorld.y * 0.62),
      (mouthWorld.z + landing.z) / 2 + 12,
    );

    const curve = new THREE.QuadraticBezierCurve3(mouthWorld.clone(), control.clone(), landing.clone());
    const geometry = makeTaperedTube(curve, W.streamRadius, 44, 8, 0.52);
    const coreGeometry = makeTaperedTube(curve, W.streamRadius * 0.34, 32, 6, 0.4);

    if (!streamMesh) {
      streamMesh = new THREE.Mesh(geometry, streamMaterial);
      streamMesh.name = 'water-stream-surface';
      streamMesh.frustumCulled = false;
      streamMesh.renderOrder = 8;
      streamGroup.add(streamMesh);
      streamCore = new THREE.Mesh(coreGeometry, streamCoreMaterial);
      streamCore.name = 'water-stream-core';
      streamCore.frustumCulled = false;
      streamCore.renderOrder = 9;
      streamGroup.add(streamCore);
    } else {
      streamMesh.geometry.dispose();
      streamMesh.geometry = geometry;
      streamCore.geometry.dispose();
      streamCore.geometry = coreGeometry;
    }
    lastStreamGeometry = geometry;
    lastStreamCoreGeometry = coreGeometry;

    spawnSplash(dt);
    updatePuddleTarget();
  }

  function spawnSplash(dt) {
    let budget = Math.max(1, Math.round(dt * 220));
    while (budget > 0) {
      const index = splashCursor % splashCount;
      splashCursor += 1;
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      splashPositions[index * 3] = landing.x + (Math.random() - 0.5) * 9;
      splashPositions[index * 3 + 1] = landing.y + 1;
      splashPositions[index * 3 + 2] = landing.z + (Math.random() - 0.5) * 9;
      splashVelocities[index * 3] = Math.cos(angle) * speed * 0.6;
      splashVelocities[index * 3 + 1] = 38 + Math.random() * 130;
      splashVelocities[index * 3 + 2] = Math.sin(angle) * speed * 0.6;
      splashLife[index] = 0.4 + Math.random() * 0.55;
      budget -= 1;
    }
  }

  function updateSplash(dt) {
    for (let i = 0; i < splashCount; i += 1) {
      if (splashLife[i] <= 0) continue;
      splashLife[i] -= dt;
      splashVelocities[i * 3 + 1] -= 620 * dt;
      splashPositions[i * 3] += splashVelocities[i * 3] * dt;
      splashPositions[i * 3 + 1] += splashVelocities[i * 3 + 1] * dt;
      splashPositions[i * 3 + 2] += splashVelocities[i * 3 + 2] * dt;
      if (splashPositions[i * 3 + 1] < 0.4 || splashLife[i] <= 0) {
        splashPositions[i * 3 + 1] = -1000;
        splashLife[i] = 0;
      }
    }
    splashGeometry.attributes.position.needsUpdate = true;
  }

  function updatePuddleTarget() {
    const fraction = clamp(poured / fullVolume, 0, 1);
    puddleTargetScale = 34 + 132 * Math.sqrt(fraction);
    puddle.position.set(landing.x, 0.52, landing.z);
    for (const ripple of ripples) ripple.mesh.position.set(landing.x, 0.56, landing.z);
  }

  function updatePuddle(dt) {
    if (streamGroup.visible) {
      puddle.visible = puddleTargetScale > 1;
      const scale = Math.max(0.001, lerp(puddle.scale.x, puddleTargetScale, Math.min(1, dt * 2.2)));
      puddle.scale.set(scale, scale * 0.72, 1);
      puddle.material.opacity = lerp(puddle.material.opacity, 0.48, Math.min(1, dt * 2));
    } else {
      if (puddleTargetScale > 1) {
        puddle.visible = true;
        const scale = Math.max(
          0.001,
          lerp(puddle.scale.x, puddleTargetScale, Math.min(1, dt * 1.4)),
        );
        puddle.scale.set(scale, scale * 0.72, 1);
      }
      puddle.material.opacity = lerp(puddle.material.opacity, 0.38, Math.min(1, dt * 0.9));
    }
    for (const ripple of ripples) {
      if (!streamGroup.visible) {
        ripple.mesh.visible = false;
        continue;
      }
      ripple.phase = (ripple.phase + dt * 0.85) % 1;
      const scale = 4 + ripple.phase * puddleTargetScale * 1.35;
      ripple.mesh.visible = true;
      ripple.mesh.scale.setScalar(scale);
      ripple.mesh.material.opacity = 0.22 * (1 - ripple.phase);
    }
  }

  function displaceWaterBody(geometry) {
    const position = geometry.attributes.position;
    const point = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 1) {
      point.fromBufferAttribute(position, i);
      const radius = Math.hypot(point.x, point.z);
      if (radius < 1e-3) continue;
      const theta = Math.atan2(point.z, point.x);
      const shrink = gripDepth(point.y, theta);
      point.x *= (radius - shrink) / radius;
      point.z *= (radius - shrink) / radius;
      position.setXYZ(i, point.x, point.y, point.z);
    }
    position.needsUpdate = true;
  }

  function setFillFraction(fraction) {
    const clamped = clamp(fraction, 0, 1);
    volume = fullVolume * clamped;
    poured = Math.max(0, fullVolume - volume);
    if (volume <= 0) {
      puddleTargetScale = 160;
      puddle.position.set(160, 0.52, 45);
      puddle.scale.set(160, 115, 1);
      puddle.material.opacity = 0.38;
      puddle.visible = true;
    }
  }

  function reset() {
    volume = fullVolume * W.initialFraction;
    poured = 0;
    streamActive = false;
    streamGroup.visible = false;
    puddle.visible = false;
    puddle.scale.setScalar(0.001);
    puddleTargetScale = 0;
    for (const ripple of ripples) {
      ripple.mesh.visible = false;
      ripple.phase = 0;
    }
    for (let i = 0; i < splashCount; i += 1) {
      splashLife[i] = 0;
      splashPositions[i * 3 + 1] = -1000;
    }
    splashGeometry.attributes.position.needsUpdate = true;
  }

  function update(dt, { tiltAngle = 0, pouring = false } = {}) {
    streamActive = Boolean(pouring);
    bottleRoot.updateWorldMatrix(true, false);

    if (tiltAngle > 0.02) {
      const capacity = capacityAtMouth();
      if (volume > capacity) {
        poured += volume - capacity;
        volume = capacity;
      }
    }

    if (pouring && tiltAngle > THREE.MathUtils.degToRad(12)) {
      const drain = fullVolume * W.drainPerSecond * dt;
      const actual = Math.min(drain, volume);
      volume -= actual;
      poured += actual;
      if (volume < fullVolume * W.residualFraction) {
        volume = 0;
      }
    }

    const height = heightForVolume(volume);
    levelWorldY = height;
    if (height !== null) clipPlane.constant = height;
    else clipPlane.constant = -1000;
    updateSurface(height);
    updateStream(dt, tiltAngle);
    updateSplash(dt);
    updatePuddle(dt);

    return {
      fill: fullVolume > 0 ? volume / fullVolume : 0,
      volumeMl: (fullVolume > 0 ? volume / fullVolume : 0) * 500,
      pouredMl: (fullVolume > 0 ? poured / fullVolume : 0) * 500,
      levelWorldY,
      streaming: streamGroup.visible,
      surfaceRendered,
    };
  }

  return {
    body,
    surface,
    meniscus,
    stream: streamGroup,
    puddle,
    update,
    reset,
    setFillFraction,
    getFillFraction: () => (fullVolume > 0 ? volume / fullVolume : 0),
    getVolumeMl: () => (fullVolume > 0 ? volume / fullVolume : 0) * 500,
    getPouredMl: () => (fullVolume > 0 ? poured / fullVolume : 0) * 500,
    getLevelWorldY: () => levelWorldY,
    getFullVolume: () => fullVolume,
    dispose() {
      bodyGeometry.dispose();
      waterMaterial.dispose();
      tintMaterial.dispose();
      surfaceGeometry.dispose();
      surfaceMaterial.dispose();
      meniscusGeometry.dispose();
      meniscus.material.dispose();
      if (streamMesh) {
        streamMesh.geometry.dispose();
        streamCore.geometry.dispose();
      }
      streamMaterial.dispose();
      streamCoreMaterial.dispose();
      splashGeometry.dispose();
      splashMaterial.dispose();
      puddle.geometry.dispose();
      puddleMaterial.dispose();
      for (const ripple of ripples) {
        ripple.mesh.geometry.dispose();
        ripple.mesh.material.dispose();
      }
    },
  };
}
