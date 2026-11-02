/**
 * Local helpers shared by the two language scenes (tokenizer / embedding).
 * Nothing here is shared with other chapters: camera interpolation, tiny maths,
 * micro-label factories and a texture-aware disposal walk.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  LinearFilter,
  LinearMipmapLinearFilter,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  Object3D,
  Texture,
  Vector3,
} from 'three';
import { PALETTE } from '../../kit/palette';
import { makePlaneLabel, makeSpriteLabel } from '../../kit/textures';
import type { CameraPose } from '../../types';

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Normalised position of `value` inside [start, end], clamped to 0..1. */
export function span(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return clamp01((value - start) / (end - start));
}

/** Smoothstep of `value` inside [start, end]. Requires start < end. */
export function smooth(value: number, start: number, end: number): number {
  const t = span(value, start, end);
  return t * t * (3 - 2 * t);
}

/** Inverse of smoothstep for s in 0..1 (used to time a feed from a distance). */
export function inverseSmooth(s: number): number {
  const clamped = clamp01(s);
  return 0.5 - Math.sin(Math.asin(1 - 2 * clamped) / 3);
}

/** Deterministic little PRNG so scene dressing is stable across reloads. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export interface CameraKeyframe {
  /** Normalised chapter progress at which this pose is exact. */
  readonly at: number;
  readonly position: readonly [number, number, number];
  /** World point that must stay readable inside the UI-safe part of the frame. */
  readonly subject: readonly [number, number, number];
  /** Desired screen position of `subject`, in 0..1 frame fractions. */
  readonly screen: readonly [number, number];
  readonly fov: number;
}

function anchorTarget(
  position: Vector3,
  subject: Vector3,
  fov: number,
  aspect: number,
  screenX: number,
  screenY: number,
): Vector3 {
  const view = subject.clone().sub(position);
  const distance = Math.max(0.001, view.length());
  const forward = view.divideScalar(distance);
  const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0));
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();
  const halfHeight = Math.tan((fov * Math.PI) / 360) * distance;
  const halfWidth = halfHeight * aspect;
  const fx = screenX - 0.5;
  const fy = 0.5 - screenY;
  return subject
    .clone()
    .addScaledVector(right, -fx * 2 * halfWidth)
    .addScaledVector(up, -fy * 2 * halfHeight);
}

/**
 * 3–5 authored poses joined by a Catmull-Rom curve. Each key names the world
 * point that must stay visible and where it should sit on screen, so the shot
 * respects the app's UI-safe area instead of guessing at a look-at target.
 */
export class CameraTrack {
  private readonly keys: readonly CameraKeyframe[];
  private readonly positions: CatmullRomCurve3;
  private readonly subjects: CatmullRomCurve3;

  constructor(keys: readonly CameraKeyframe[]) {
    if (keys.length < 2) throw new Error('CameraTrack requires at least two keyframes');
    this.keys = keys;
    this.positions = new CatmullRomCurve3(
      keys.map((key) => new Vector3(key.position[0], key.position[1], key.position[2])),
      false,
      'catmullrom',
      0.5,
    );
    this.subjects = new CatmullRomCurve3(
      keys.map((key) => new Vector3(key.subject[0], key.subject[1], key.subject[2])),
      false,
      'catmullrom',
      0.5,
    );
  }

  sample(progress: number, aspect: number): CameraPose {
    const p = clamp01(progress);
    const last = this.keys.length - 1;
    let index = 0;
    while (index < last - 1 && p > this.keys[index + 1].at) index += 1;
    const from = this.keys[index];
    const to = this.keys[index + 1];
    const local = span(p, from.at, to.at);
    const eased = local * local * (3 - 2 * local);
    const u = clamp01((index + local) / last);

    const position = this.positions.getPoint(u);
    const subject = this.subjects.getPoint(u);
    const fov = lerp(from.fov, to.fov, eased);
    const screenX = lerp(from.screen[0], to.screen[0], eased);
    const screenY = lerp(from.screen[1], to.screen[1], eased);

    // Portrait screens: dolly straight back so the subject keeps its screen
    // position but gains margin around it.
    const narrow = clamp01((0.96 - aspect) / 0.6);
    if (narrow > 0) {
      const back = position.clone().sub(subject);
      position.addScaledVector(back, narrow * 0.85);
    }

    const target = anchorTarget(position, subject, fov, aspect, screenX, screenY);
    return { position, target, fov };
  }
}

export interface MicroLabelOptions {
  color?: string;
  subColor?: string;
  height?: number;
  opacity?: number;
}

/** Small camera-facing instrument tag (mono, wide tracking, no card chrome). */
export function microLabel(main: string, sub: string | undefined, options: MicroLabelOptions = {}) {
  const sprite = makeSpriteLabel(main, sub, {
    color: options.color ?? PALETTE.graphite,
    subColor: options.subColor ?? PALETTE.muted,
    fontSize: 46,
    subFontSize: 24,
    paddingX: 18,
    paddingY: 14,
    tracking: 2,
    height: options.height ?? 0.24,
    opacity: options.opacity ?? 1,
  });
  if (sprite.material.map) crisp(sprite.material.map);
  return sprite;
}

/** Flat engraved plate for structures that should keep their own orientation. */
export function plateLabel(
  main: string,
  sub: string | undefined,
  options: MicroLabelOptions & { background?: string; border?: string } = {},
) {
  return makePlaneLabel(main, sub, {
    color: options.color ?? PALETTE.ink,
    subColor: options.subColor ?? PALETTE.muted,
    fontSize: 42,
    subFontSize: 19,
    paddingX: 16,
    paddingY: 12,
    tracking: 1.6,
    height: options.height ?? 0.2,
    background: options.background,
    border: options.border,
  });
}

/** Hairline segment soup from a flat [x,y,z, x,y,z, ...] array. */
export function hairlineSegments(positions: number[], colorHex: string = PALETTE.graphite, opacity = 0.28) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  const material = new LineBasicMaterial({
    color: new Color(colorHex),
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const lines = new LineSegments(geometry, material);
  lines.renderOrder = 1;
  return lines;
}

/**
 * Kit particle fields reuse a cached dot texture. Flag it so `disposeTree`
 * leaves the GPU resource alone when one scene unmounts.
 */
export function markShared(texture: Texture): void {
  texture.userData.shared = true;
}

/**
 * The kit's canvas textures ship with mipmaps off; at the distance these
 * scenes are framed from, that makes small text shimmer and wash out. Give the
 * label textures a mip chain so glyphs stay crisp when minified.
 */
export function crisp<T extends Texture>(texture: T): T {
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Dispose geometry / materials / own textures, keeping globally cached ones. */
export function disposeTree(root: Object3D): void {
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (child as Mesh).material as Material | Material[] | undefined;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else if (material) disposeMaterial(material);
  });
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && typeof value === 'object' && 'isTexture' in value) {
      const texture = value as Texture;
      if (texture.userData.shared === true) continue;
      texture.dispose();
    }
  }
  material.dispose();
}
