/**
 * AQUA PURE — procedural 500 ml PET bottle, cap and tamper-evident ring.
 *
 * Everything is generated from CONFIG / profile.js: one closed lathed PET
 * shell (0.35 mm wall), a real swept thread, five moulded base feet, a hollow
 * threaded HDPE cap with 64 instanced anti-slip ribs, a recessed top logo,
 * eight intact security bridges and a ratcheted 4 mm tamper ring.
 *
 * Units are millimetres (1 world unit = 1 mm). The bottle root sits at the
 * local origin, with +Y towards the mouth and y = 0 at the ground contact.
 */
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { buildBottleProfilePoints, clamp, gripDepth, microNoise } from './profile.js';
import { createLabelTexture } from './label.js';

const TAU = Math.PI * 2;
const RING_DROP_MAX = 0.8; // mm — setRingDropped(1) lowers the ring at most this much

/* ── PET shell ──────────────────────────────────────────────────────────── */

/**
 * The analytic profile from buildBottleProfilePoints() is deliberately dense
 * on the 38 mm shoulder (0.35 mm steps for both walls). Keep every point that
 * carries a distinct feature, but halve the shoulder sampling so the finished
 * watertight lathe stays comfortably below the 90 k triangle budget. Extra
 * rings are re-inserted through the waist grip so the pressed-in thumb
 * dishes keep a smooth vertical silhouette.
 */
function buildShellProfile(bottle) {
  const source = buildBottleProfilePoints();
  const points = [];
  let shoulderRun = 0;

  for (const [radius, y] of source) {
    const inShoulder = y > bottle.bodyTop + 0.6 && y < bottle.shoulderTop - 0.05;
    if (!inShoulder) {
      shoulderRun = 0;
      points.push(new THREE.Vector2(radius, y));
      continue;
    }
    shoulderRun += 1;
    if (shoulderRun === 1 || shoulderRun % 2 === 0) {
      points.push(new THREE.Vector2(radius, y));
    }
  }

  // Add intermediate rings across the grip band (y ≈ 21.5…46.5 mm).
  const gripLow = bottle.grip.centerY - bottle.grip.halfHeight - 2;
  const gripHigh = bottle.grip.centerY + bottle.grip.halfHeight + 2;
  const withGrip = [];
  for (let i = 0; i < points.length; i += 1) {
    withGrip.push(points[i]);
    const next = points[i + 1];
    if (!next) break;
    const dy = Math.abs(next.y - points[i].y);
    const dr = Math.abs(next.x - points[i].x);
    const midY = (points[i].y + next.y) / 2;
    if (
      dr < 0.02 &&
      dy > 2.5 &&
      dy < 5.5 &&
      midY > gripLow &&
      midY < gripHigh &&
      Math.min(points[i].y, next.y) >= bottle.baseTop &&
      Math.max(points[i].y, next.y) <= bottle.bodyTop
    ) {
      withGrip.push(new THREE.Vector2((points[i].x + next.x) / 2, midY));
    }
  }
  return withGrip;
}

/**
 * Closed PET wall: one LatheGeometry revolution of the full outer + inner
 * profile, then a per-vertex radial displacement that presses the two thumb
 * dishes and the ±0.15 mm moulding ripple into *both* walls together.
 */
function buildShellGeometry(bottle) {
  const profile = buildShellProfile(bottle);
  const geometry = new THREE.LatheGeometry(profile, bottle.radialSegments);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const radius = Math.hypot(vertex.x, vertex.z);
    if (radius < 1e-4) continue;

    if (vertex.y > bottle.baseTop && vertex.y < bottle.bodyTop) {
      // profile.js (and water.js) use the standard XZ-plane angle
      // theta = atan2(z, x): the two thumb dishes sit on +X and −X.
      const theta = Math.atan2(vertex.z, vertex.x);
      const pressed = gripDepth(vertex.y, theta) + microNoise(vertex.y, theta);
      const scale = (radius - pressed) / radius;
      position.setXYZ(i, vertex.x * scale, vertex.y, vertex.z * scale);
    }
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createShellMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xf6fbff, // colourless PET with the faintest cold blue
    metalness: 0,
    roughness: 0.03,
    transmission: 1,
    thickness: 1.2,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.7,
    specularIntensity: 1,
    attenuationColor: new THREE.Color(0xdcefff),
    attenuationDistance: 600,
    dispersion: 0.12,
    side: THREE.DoubleSide,
    // The wall must not occlude the liquid behind it: transmission supplies
    // the glassy background while water/cap/label keep their own depth.
    depthWrite: false,
  });
}

/* ── real helical thread ────────────────────────────────────────────────── */

class HelixCurve extends THREE.Curve {
  constructor(radius, startY, endY, turns) {
    super();
    this.radius = radius;
    this.startY = startY;
    this.endY = endY;
    this.turns = turns;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * this.turns * TAU;
    return target.set(
      this.radius * Math.sin(angle),
      this.startY + (this.endY - this.startY) * t,
      this.radius * Math.cos(angle),
    );
  }
}

function createThread(bottle, material) {
  const thread = bottle.thread;
  const group = new THREE.Group();
  group.name = 'thread';

  const curve = new HelixCurve(thread.radius, thread.startY, thread.endY, thread.turns);
  const geometry = new THREE.TubeGeometry(
    curve,
    thread.tubularSegments,
    thread.tubeRadius,
    thread.radialSegments,
    false,
  );
  const swept = new THREE.Mesh(geometry, material);
  swept.name = 'threadSweep';
  swept.castShadow = false;
  swept.receiveShadow = true;
  group.add(swept);

  // Round off the two open tube ends so the thread reads as moulded, not cut.
  const endGeometry = new THREE.SphereGeometry(thread.tubeRadius, 10, 8);
  for (const t of [0, 1]) {
    const end = new THREE.Mesh(endGeometry, material);
    curve.getPoint(t, end.position);
    end.castShadow = false;
    group.add(end);
  }
  return group;
}

/* ── moulded base feet ──────────────────────────────────────────────────── */

function createFeet(bottle, material) {
  const feet = bottle.feet;
  const geometry = new THREE.SphereGeometry(1, 24, 14);
  const mesh = new THREE.InstancedMesh(geometry, material, feet.count);
  mesh.name = 'feet';
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < feet.count; i += 1) {
    const angle = (i / feet.count) * TAU;
    dummy.position.set(
      Math.sin(angle) * feet.radius,
      feet.y + feet.height * 0.56,
      Math.cos(angle) * feet.radius,
    );
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(feet.width * 0.5, feet.height * 0.56, feet.length * 0.5);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/* ── cap, ribs and recessed logo ────────────────────────────────────────── */

function buildCapProfile(cap) {
  const R = cap.radius;
  const H = cap.height;
  const recessR = cap.topRecessRadius;
  const recessD = cap.topRecessDepth;
  const innerR = R - 0.45; // skirt wall thickness

  return [
    // Recessed top: start at the axis on the recess floor, work outward.
    [0, H - recessD],
    [recessR * 0.52, H - recessD - 0.01],
    [recessR * 0.86, H - recessD - 0.035],
    [recessR * 0.95, H - recessD - 0.075],
    [recessR, H - recessD - 0.15],
    [recessR, H - 0.08],
    [recessR + 0.16, H],
    [recessR + 0.55, H],
    [R - 1.45, H],
    [R - 0.45, H - 0.12],
    [R - 0.05, H - 0.75],
    [R, H - 1.55],
    // Skirt.
    [R, 0.9],
    [R - 0.06, 0.45],
    [R - 0.3, 0.0],
    [innerR, 0.0],
    // Hollow underside.
    [innerR, H - 1.4],
    [innerR - 0.22, H - 1.15],
    [0, H - 1.15],
  ];
}

function createCapLogoTexture() {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(size * 0.42, size * 0.36, 8, size * 0.5, size * 0.5, size * 0.54);
  gradient.addColorStop(0, '#2f83dd');
  gradient.addColorStop(0.55, '#1763bd');
  gradient.addColorStop(1, '#0b3f83');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, TAU);
  ctx.stroke();

  // Droplet mark.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.moveTo(size / 2, 44);
  ctx.bezierCurveTo(size / 2 - 22, 86, size / 2 - 38, 110, size / 2 - 38, 132);
  ctx.arc(size / 2, 132, 38, Math.PI, 0, true);
  ctx.bezierCurveTo(size / 2 + 38, 110, size / 2 + 22, 86, size / 2, 44);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.font = '600 27px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AQUA', size / 2, 198);
  ctx.font = '400 15px "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('PURE', size / 2, 222);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createCap(bottle) {
  const cap = bottle.cap;
  const group = new THREE.Group();
  group.name = 'cap';
  group.position.set(0, cap.bottomY, 0);

  const material = new THREE.MeshPhysicalMaterial({
    color: cap.color,
    roughness: cap.roughness,
    metalness: 0,
    clearcoat: cap.clearcoat,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.9,
  });

  const points = buildCapProfile(cap).map(([radius, y]) => new THREE.Vector2(radius, y));
  const hull = new THREE.Mesh(new THREE.LatheGeometry(points, 128), material);
  hull.name = 'capShell';
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 64 genuine raised anti-slip ribs (one instanced draw call).
  const ribGeometry = new THREE.BoxGeometry(cap.ribWidth, cap.ribHeight, cap.ribDepth);
  const ribs = new THREE.InstancedMesh(ribGeometry, material, cap.ribCount);
  ribs.name = 'capRibs';
  ribs.castShadow = true;
  const dummy = new THREE.Object3D();
  const ribCenterY = 0.9 + cap.ribHeight * 0.5;
  for (let i = 0; i < cap.ribCount; i += 1) {
    const angle = (i / cap.ribCount) * TAU;
    dummy.position.set(
      Math.sin(angle) * cap.radius,
      ribCenterY,
      Math.cos(angle) * cap.radius,
    );
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    ribs.setMatrixAt(i, dummy.matrix);
  }
  ribs.instanceMatrix.needsUpdate = true;
  group.add(ribs);

  // Recessed circular logo plate.
  const logoTexture = createCapLogoTexture();
  if (logoTexture) {
    const logoMaterial = new THREE.MeshStandardMaterial({
      map: logoTexture,
      roughness: 0.4,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const logo = new THREE.Mesh(
      new THREE.CircleGeometry(cap.topRecessRadius - 0.14, 48),
      logoMaterial,
    );
    logo.name = 'capLogo';
    logo.rotation.x = -Math.PI / 2;
    logo.position.y = cap.height - cap.topRecessDepth + 0.012;
    group.add(logo);
  }

  group.userData.material = material;
  return group;
}

/* ── tamper-evident ring and bridges ────────────────────────────────────── */

function createRatchetToothGeometry() {
  const depth = 0.55;
  const halfWidth = 0.56;
  const height = 1.55;
  const positions = new Float32Array([
    0, 0, -halfWidth,
    0, 0, halfWidth,
    -depth, 0, 0,
    0, height, -halfWidth,
    0, height, halfWidth,
    -depth, height, 0,
  ]);
  const indices = [
    0, 2, 1, // bottom
    3, 4, 5, // top
    0, 1, 4, 0, 4, 3, // flat back
    1, 2, 5, 1, 5, 4, // sloped face
    2, 0, 3, 2, 3, 5, // other sloped face
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createRing(bottle) {
  const ring = bottle.cap.ring;
  const group = new THREE.Group();
  group.name = 'ring';
  group.position.set(0, ring.bottomY, 0);

  const material = new THREE.MeshPhysicalMaterial({
    color: ring.color,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.85,
    side: THREE.DoubleSide,
  });

  const R = ring.radius;
  const inner = R - 0.45;
  const profile = [
    [R, 0],
    [R, 2.85],
    [R - 0.08, 3.18],
    [R - 0.34, 3.6],
    [inner, 4.0],
    [inner, 0.45],
    [R - 0.18, 0.0],
    [R, 0.0],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const band = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), material);
  band.name = 'ringBand';
  band.castShadow = true;
  band.receiveShadow = true;
  group.add(band);

  // Inner ratchet teeth — they catch under the neck bead and keep the ring on
  // the bottle after the cap has been broken away.
  const teethGeometry = createRatchetToothGeometry();
  const teeth = new THREE.InstancedMesh(teethGeometry, material, ring.teeth);
  teeth.name = 'ratchetTeeth';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < ring.teeth; i += 1) {
    const angle = (i / ring.teeth) * TAU;
    dummy.position.set(Math.sin(angle) * (inner - 0.01), 2.05, Math.cos(angle) * (inner - 0.01));
    dummy.rotation.set(0, angle - Math.PI / 2, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    teeth.setMatrixAt(i, dummy.matrix);
  }
  teeth.instanceMatrix.needsUpdate = true;
  group.add(teeth);

  group.userData.material = material;
  return group;
}

function createBridges(bottle) {
  const bridge = bottle.cap.bridges;
  const group = new THREE.Group();
  group.name = 'bridges';

  const material = new THREE.MeshStandardMaterial({
    color: 0x2d83e4,
    roughness: 0.4,
    metalness: 0,
    transparent: true,
    opacity: 1,
  });
  const geometry = new THREE.BoxGeometry(bridge.width, bridge.height, bridge.depth);
  const localY = bridge.y - bottle.cap.bottomY;

  for (let i = 0; i < bridge.count; i += 1) {
    const angle = (i / bridge.count) * TAU;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `bridge-${i}`;
    mesh.position.set(
      Math.sin(angle) * bridge.radius,
      localY,
      Math.cos(angle) * bridge.radius,
    );
    mesh.rotation.set(0, angle, 0);
    mesh.castShadow = true;
    mesh.userData.basePosition = mesh.position.clone();
    group.add(mesh);
  }
  group.userData.material = material;
  return group;
}

/* ── label ──────────────────────────────────────────────────────────────── */

function createLabelMesh(config) {
  const labelConfig = config.bottle.label;
  const texture = createLabelTexture(config);
  const material = new THREE.MeshPhysicalMaterial({
    map: texture,
    roughness: 0.52,
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.45,
    envMapIntensity: 0.55,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const radius = config.bottle.bodyRadius + labelConfig.radiusOffset;
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    labelConfig.height,
    labelConfig.segments,
    1,
    true,
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'label';
  mesh.position.y = labelConfig.bottomY + labelConfig.height / 2;
  // Put the primary front panel toward the default camera (+X/+Z quadrant).
  mesh.rotation.y = -Math.PI / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.isLabel = true;
  return mesh;
}

/* ── public API ─────────────────────────────────────────────────────────── */

/**
 * Create the complete AQUA PURE bottle assembly.
 *
 * @param {{ config?: typeof CONFIG }} [options]
 * @returns {{
 *   root: THREE.Group,
 *   shell: THREE.Mesh,
 *   cap: THREE.Group,
 *   ring: THREE.Group,
 *   bridges: THREE.Group,
 *   label: THREE.Mesh,
 *   mouthLocal: THREE.Vector3,
 *   setBridgesIntact: (value: boolean) => void,
 *   setRingDropped: (t: number) => void,
 *   dispose: () => void,
 * }}
 */
export function createBottle({ config = CONFIG } = {}) {
  const bottle = config.bottle;
  const root = new THREE.Group();
  root.name = 'aqua-pure-bottle';

  const shellMaterial = createShellMaterial();
  const shellGeometry = buildShellGeometry(bottle);
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  shell.name = 'shell';
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.renderOrder = 3;
  root.add(shell);

  root.add(createThread(bottle, shellMaterial));
  root.add(createFeet(bottle, shellMaterial));

  const label = createLabelMesh(config);
  root.add(label);

  const ring = createRing(bottle);
  root.add(ring);

  const cap = createCap(bottle);
  root.add(cap);

  const bridges = createBridges(bottle);
  cap.add(bridges);

  const bridgeMaterial = bridges.userData.material;

  /**
   * Break (or restore) the eight security bridges without disposing any
   * geometry: broken tabs shrink and fade, exactly like snapped HDPE.
   * Accepts booleans or any truthy/falsy value; geometry stays untouched so
   * the same meshes can be restored on reset.
   */
  function setBridgesIntact(value) {
    const intact = Boolean(value);
    for (const bridge of bridges.children) {
      if (!bridge.isMesh) continue;
      bridge.scale.set(intact ? 1 : 0.62, intact ? 1 : 0.14, intact ? 1 : 0.62);
      bridge.rotation.z = intact ? 0 : (bridge.position.x > 0 ? 1 : -1) * 0.08;
      bridge.position.copy(bridge.userData.basePosition);
    }
    bridgeMaterial.opacity = intact ? 1 : 0.12;
    bridgeMaterial.depthWrite = intact;
    bridgeMaterial.needsUpdate = true;
  }

  /** Lower the tamper ring by up to 0.8 mm after the bridges break. */
  function setRingDropped(t) {
    const amount = clamp(Number(t) || 0, 0, 1);
    ring.position.y = bottle.cap.ring.bottomY - amount * RING_DROP_MAX;
  }

  const mouthLocal = new THREE.Vector3(0, bottle.lipTop, 0);

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();

    const collect = (object) => {
      if (object.geometry) geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value && value.isTexture) textures.add(value);
        }
      }
    };
    root.traverse(collect);
    // The cap can legitimately be detached to the scene while the bottle is
    // open, so collect it explicitly as well.
    cap.traverse(collect);

    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
  }

  return {
    root,
    shell,
    cap,
    ring,
    bridges,
    label,
    mouthLocal,
    setBridgesIntact,
    setRingDropped,
    dispose,
  };
}
