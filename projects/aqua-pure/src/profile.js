/**
 * AQUA PURE — bottle cross-section mathematics.
 *
 * The bottle is a surface of revolution with a closed PET wall. Everything
 * downstream (shell mesh, water volume, label ring, clipping surface) reads
 * the same analytic profile so the parts can never drift apart.
 *
 * Coordinates are local to the bottle: Y is the bottle axis, 0 is the ground
 * contact plane, +Y points at the cap.
 */
import { CONFIG } from './config.js';

const B = CONFIG.bottle;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Signed shortest angle in [-π, π]. */
export function wrapAngle(theta) {
  return Math.atan2(Math.sin(theta), Math.cos(theta));
}

/**
 * Depth of the two symmetric thumb dishes at a point on the body.
 * A cosine window gives the smooth, pressed-in transition a real preform has.
 */
export function gripDepth(y, theta) {
  const { depth, centerY, halfHeight, angularWidth } = B.grip;
  const dy = (y - centerY) / halfHeight;
  if (Math.abs(dy) >= 1) return 0;

  const angle = Math.abs(wrapAngle(theta));
  let dish = 0;
  // Two dishes, one at θ = 0 and one at θ = π.
  for (const centre of [0, Math.PI]) {
    const da = Math.abs(wrapAngle(angle - centre)) / angularWidth;
    if (da < 1) dish = Math.max(dish, 0.5 + 0.5 * Math.cos(Math.PI * da));
  }
  const vertical = 0.5 + 0.5 * Math.cos(Math.PI * dy);
  return depth * dish * vertical;
}

/** Deterministic, sub-0.2 mm moulding ripple on the cylindrical body. */
export function microNoise(y, theta) {
  if (y <= B.baseTop + 1 || y >= B.bodyTop - 1) return 0;
  const a =
    0.62 * Math.sin(y * 0.83 + theta * 2.15) +
    0.38 * Math.sin(y * 2.71 - theta * 5.23 + 1.7);
  const window = 0.55 + 0.45 * Math.sin(theta * 3.7 + y * 0.11);
  return B.noise * a * window;
}

/**
 * Axisymmetric outer radius. The moulded waist grip is applied later as a
 * per-vertex radial displacement, because a lathe profile itself is 2D.
 */
export function outerRadiusAt(y) {
  if (y <= B.baseTop) return B.bodyRadius;
  if (y <= B.bodyTop) return B.bodyRadius;

  if (y <= B.shoulderTop) {
    const t = (y - B.bodyTop) / (B.shoulderTop - B.bodyTop);
    // S-curve: vertical tangents at both ends, like a blow-moulded shoulder.
    return lerp(B.bodyRadius, B.neckRadius, smoothstep(0, 1, t));
  }

  if (y <= B.neckTop) return B.neckRadius;

  if (y <= B.beadTop) {
    const t = (y - B.neckTop) / (B.beadTop - B.neckTop);
    return lerp(B.neckRadius, B.beadRadius, Math.pow(Math.sin(Math.PI * t), 0.72));
  }

  if (y <= B.threadTop) return B.neckRadius;

  if (y <= B.lipTop) {
    const t = (y - B.threadTop) / (B.lipTop - B.threadTop);
    return lerp(B.neckRadius, B.mouthOuterRadius - 0.25, smoothstep(0.45, 1, t));
  }

  return 0;
}

/** Inner radius of the water cavity at (y, θ), including the waist grip. */
export function innerRadiusAt(y, theta) {
  const wall = B.wallThickness;
  if (y < 0) return 0;
  if (y <= B.baseTop) return Math.max(0.35, B.bodyRadius - wall);
  if (y <= B.bodyTop) return Math.max(0.35, B.bodyRadius - gripDepth(y, theta) - wall);
  if (y >= B.lipTop) return 0;
  return Math.max(0.35, outerRadiusAt(y) - wall);
}

/** Radius at the mouth opening (inside the lip). */
export const MOUTH_INNER_RADIUS = B.mouthOuterRadius - B.wallThickness;

/** Outer moulded bottom, ordered from the punt centre out to the wall. */
export const BOTTOM_OUTER = [
  [0, 8.0],
  [3.0, 7.9],
  [7.0, 7.35],
  [11.0, 6.45],
  [15.5, 5.35],
  [20.0, 4.15],
  [24.5, 2.85],
  [28.0, 1.85],
  [30.2, 1.45],
  [31.3, 1.55],
  [32.0, 3.6],
  [32.0, 8.5],
];

function bottomInner() {
  return BOTTOM_OUTER.map(([r, y]) => [Math.max(0, r - B.wallThickness), y + B.wallThickness]);
}

/**
 * Closed 2D profile for the PET shell: outer surface from the punt centre over
 * the lip, then the inner surface back down. LatheGeometry revolves it into a
 * watertight 0.35 mm shell — no back-face trickery required.
 */
export function buildBottleProfilePoints() {
  const points = [];
  const push = (r, y) => points.push([r, y]);

  // Outer bottom, punt centre → foot ring.
  for (const [r, y] of BOTTOM_OUTER) push(r, y);

  // Outer wall: body, shoulder, neck, bead, thread, lip.
  for (let y = B.baseTop + 2; y <= B.bodyTop; y += 4) push(outerRadiusAt(y), y);
  for (let y = B.bodyTop + B.profileStep; y <= B.shoulderTop; y += B.profileStep) {
    push(outerRadiusAt(y), y);
  }
  for (let y = B.shoulderTop + 1; y <= B.neckTop; y += 1) push(outerRadiusAt(y), y);
  for (let i = 1; i <= 12; i += 1) {
    const y = lerp(B.neckTop, B.beadTop, i / 12);
    push(outerRadiusAt(y), y);
  }
  for (let y = B.beadTop + 0.8; y <= B.threadTop; y += 0.8) push(outerRadiusAt(y), y);

  // Rounded mouth: outer edge curls over a 0.35 mm rim.
  const mouth = B.lipTop;
  push(B.mouthOuterRadius, mouth - 0.35);
  push(B.mouthOuterRadius - 0.03, mouth - 0.08);
  push(B.mouthOuterRadius - 0.16, mouth);
  push(MOUTH_INNER_RADIUS, mouth);

  // Inner wall, from the mouth downward.
  for (let y = B.threadTop; y >= B.beadTop; y -= 0.9) {
    push(Math.max(0.35, outerRadiusAt(y) - B.wallThickness), y);
  }
  for (let i = 11; i >= 0; i -= 1) {
    const y = lerp(B.neckTop, B.beadTop, i / 12);
    push(Math.max(0.35, outerRadiusAt(y) - B.wallThickness), y);
  }
  for (let y = B.neckTop - 1; y >= B.shoulderTop; y -= 1) {
    push(Math.max(0.35, outerRadiusAt(y) - B.wallThickness), y);
  }
  for (let y = B.shoulderTop - B.profileStep; y >= B.bodyTop; y -= B.profileStep) {
    push(Math.max(0.35, outerRadiusAt(y) - B.wallThickness), y);
  }
  for (let y = B.bodyTop - 4; y >= B.baseTop; y -= 4) {
    push(Math.max(0.35, outerRadiusAt(y) - B.wallThickness), y);
  }

  // Inner bottom, back to the punt centre.
  const innerBottom = bottomInner();
  for (let i = innerBottom.length - 1; i >= 0; i -= 1) push(...innerBottom[i]);

  return points;
}

/**
 * Profile of the water body. It is a closed solid of revolution extending to
 * the mouth; a world-space clipping plane trims it to the current waterline.
 */
export function buildWaterProfilePoints() {
  const points = [];
  const push = (r, y) => points.push([r, y]);
  const inner = (y) => Math.max(0.35, B.bodyRadius - B.wallThickness);

  push(0, 0);
  push(inner(0), 0);
  for (let y = 2; y <= B.baseTop; y += 2) push(inner(y), y);
  for (let y = B.baseTop + 2; y <= B.bodyTop; y += 4) push(inner(y), y);
  for (let y = B.bodyTop + B.profileStep; y <= B.shoulderTop; y += B.profileStep) {
    push(Math.max(0.35, outerRadiusAt(y) - B.wallThickness), y);
  }
  for (let y = B.shoulderTop + 1; y <= B.neckTop; y += 1) {
    push(Math.max(0.35, outerRadiusAt(y) - B.wallThickness), y);
  }
  for (let y = B.neckTop + 1; y <= B.lipTop; y += 1) {
    push(Math.max(0.35, outerRadiusAt(y) - B.wallThickness), y);
  }
  push(0, B.lipTop);
  return points;
}

/**
 * Area of the water cross-section at local height y when a horizontal plane
 * cuts the circular section at signed distance `s` from its centre.
 * s < -r → full circle, s > r → empty.
 */
export function circleAreaBelow(r, s) {
  if (r <= 0) return 0;
  const ratio = clamp(s / r, -1, 1);
  return r * r * Math.acos(ratio) - s * Math.sqrt(Math.max(0, r * r - s * s));
}

/** Interior volume (mm³) of the bottle below local height y, ignoring tilt. */
export function volumeBelowHeight(y) {
  let volume = 0;
  const step = 1;
  for (let h = step / 2; h < y; h += step) {
    const r = Math.max(0.35, outerRadiusAt(h) - B.wallThickness);
    volume += Math.PI * r * r * step;
  }
  return volume;
}
