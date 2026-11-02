/**
 * 传输章节（02 网络 / 08 返回流）的本地工具。
 *
 * 只服务于 scenes/transit，不进入共享 kit：相机关键帧插值、贴纸标签、
 * 合并的细线几何和小型实例化写入。共享 kit 仍然负责材质与贴图。
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  EdgesGeometry,
  Euler,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Quaternion,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import type { InstancedMesh } from 'three';
import type { Group, Object3D } from 'three';
import { PALETTE } from '../../kit/palette';
import { FONT_MONO, FONT_SANS, makeGlowTexture, makeSpriteLabel } from '../../kit/textures';
import { NODE_INFO } from '../../../data/nodes';
import type { CameraPose, QualityInfo } from '../../types';

export type Vec3Tuple = [number, number, number];

export const clamp01 = (value: number): number => (value <= 0 ? 0 : value >= 1 ? 1 : value);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export const smootherstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** 高斯脉冲：probe 经过 center 时给出一次有节奏的响应。 */
export const gaussianPulse = (probe: number, center: number, width: number): number => {
  const distance = (probe - center) / Math.max(0.0001, width);
  return Math.exp(-distance * distance);
};

/** 在 inner 范围内为 1，到 outer 处平滑衰减为 0。 */
export const proximity = (probe: number, center: number, inner: number, outer: number): number =>
  1 - smoothstep((Math.abs(probe - center) - inner) / Math.max(0.0001, outer - inner));

/** 确定性随机源：布局在每次构建、每次拖动时间轴时都一致。 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * 相机关键帧
 * ------------------------------------------------------------------ */

export interface CameraKey {
  /** 本章进度 0..1 */
  at: number;
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov: number;
}

export interface CameraTrack {
  sample(progress: number, aspect: number): CameraPose;
}

/**
 * 非均匀时间的 Hermite 插值：关键帧时刻可自由分配，速度连续，
 * 不会在关键帧处停顿。竖屏时把相机沿视线方向后撤。
 */
export function createCameraTrack(keys: readonly CameraKey[]): CameraTrack {
  if (keys.length < 2) throw new Error('createCameraTrack needs at least two keyframes');

  const times = keys.map((key) => clamp01(key.at));
  const channels: number[][] = [
    keys.map((key) => key.position[0]),
    keys.map((key) => key.position[1]),
    keys.map((key) => key.position[2]),
    keys.map((key) => key.target[0]),
    keys.map((key) => key.target[1]),
    keys.map((key) => key.target[2]),
    keys.map((key) => key.fov),
  ];
  const tangents = channels.map((values) => tangentSeries(values, times));

  return {
    sample(progress: number, aspect: number): CameraPose {
      const p = clamp01(progress);
      let index = 0;
      while (index < times.length - 2 && p > times[index + 1]) index += 1;
      const span = Math.max(0.0001, times[index + 1] - times[index]);
      const local = clamp01((p - times[index]) / span);
      const value = (channel: number): number =>
        hermite(
          channels[channel][index],
          channels[channel][index + 1],
          tangents[channel][index],
          tangents[channel][index + 1],
          span,
          local,
        );

      const position = new Vector3(value(0), value(1), value(2));
      const target = new Vector3(value(3), value(4), value(5));
      let fov = value(6);

      if (aspect < 0.9) {
        const pull = Math.min(0.62, (0.9 - aspect) * 0.85);
        position.sub(target).multiplyScalar(1 + pull).add(target);
        fov = Math.min(64, fov + pull * 8);
      }

      return { position, target, fov };
    },
  };
}

function tangentSeries(values: number[], times: number[]): number[] {
  const last = values.length - 1;
  const tangents = new Array<number>(values.length);
  for (let index = 0; index <= last; index += 1) {
    if (index === 0) {
      tangents[index] = (values[1] - values[0]) / Math.max(0.0001, times[1] - times[0]);
    } else if (index === last) {
      tangents[index] = (values[last] - values[last - 1]) / Math.max(0.0001, times[last] - times[last - 1]);
    } else {
      tangents[index] =
        (values[index + 1] - values[index - 1]) / Math.max(0.0001, times[index + 1] - times[index - 1]);
    }
  }
  return tangents;
}

function hermite(p0: number, p1: number, m0: number, m1: number, span: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * p0 +
    (t3 - 2 * t2 + t) * span * m0 +
    (-2 * t3 + 3 * t2) * p1 +
    (t3 - t2) * span * m1
  );
}

/* ------------------------------------------------------------------ *
 * 贴纸标签
 * ------------------------------------------------------------------ */

export interface TransitLabelOptions {
  sub?: string;
  height?: number;
  color?: string;
  subColor?: string;
  background?: string;
  border?: string;
  fontSize?: number;
  mono?: boolean;
  tracking?: number;
  opacity?: number;
}

export function createLabel(main: string, options: TransitLabelOptions = {}): Sprite {
  const fontSize = options.fontSize ?? 46;
  const subFontSize = Math.round(fontSize * 0.52);
  const sprite = makeSpriteLabel(main, options.sub, {
    height: options.height ?? 0.22,
    opacity: options.opacity ?? 1,
    color: options.color ?? PALETTE.ink,
    subColor: options.subColor ?? PALETTE.muted,
    background: options.background,
    border: options.border,
    font: `500 ${fontSize}px ${options.mono ? FONT_MONO : FONT_SANS}`,
    subFont: `400 ${subFontSize}px ${FONT_MONO}`,
    fontSize,
    subFontSize,
    paddingX: Math.round(fontSize * 0.42),
    paddingY: Math.round(fontSize * 0.3),
    tracking: options.tracking ?? 0,
  });
  // 供 QA 用：把标签正文挂到对象名上，方便投影脚本对齐截图位置。
  sprite.name = main;
  return sprite;
}

/** 节点标签统一取 nodes.ts 的 en / name，避免 3D 里另写解释。 */
export function createNodeLabel(infoId: string, height: number, extraSub?: string): Sprite {
  const info = NODE_INFO[infoId];
  return createLabel(info?.en ?? infoId, {
    sub: extraSub ?? info?.name,
    height,
    mono: true,
  });
}

/* ------------------------------------------------------------------ *
 * 结构与光：暗色描边让玻璃和金属在纸白背景上有轮廓
 * ------------------------------------------------------------------ */

/** 给任意几何加一圈石墨描边（玻璃 / 机架在纸白背景上靠它立住）。 */
export function createEdgeOverlay(
  geometry: BufferGeometry,
  colorHex: string = PALETTE.graphite,
  opacity = 0.5,
): LineSegments {
  const edges = new LineSegments(
    new EdgesGeometry(geometry, 24),
    new LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  edges.renderOrder = 2;
  return edges;
}

/** 小型柔光贴片：数据热点的光晕，不用大尺寸加法混合以免发白。 */
export function createGlowSprite(colorHex: string, scale: number, opacity = 0.26): Sprite {
  const sprite = new Sprite(
    new SpriteMaterial({
      map: makeGlowTexture(colorHex),
      color: colorHex,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    }),
  );
  sprite.scale.setScalar(scale);
  sprite.renderOrder = 6;
  return sprite;
}

/* ------------------------------------------------------------------ *
 * 构建上下文：场景文件只负责编排与每帧状态，具体几何放在各分区模块里
 * ------------------------------------------------------------------ */

export interface SupportSpec {
  position: Vec3Tuple;
  scale: Vec3Tuple;
  rotation?: Vec3Tuple;
}

export interface BuildContext<Handles> {
  group: Group;
  pickables: Object3D[];
  supports: SupportSpec[];
  quality: QualityInfo;
  detail: number;
  unitBox: BufferGeometry;
  handles: Handles;
}

/* ------------------------------------------------------------------ *
 * 合并的细线（刻度、标尺、错位连线、骨架）
 * ------------------------------------------------------------------ */

export function createLineSegments(
  segments: ReadonlyArray<readonly [Vec3Tuple, Vec3Tuple]>,
  colorHex: string = PALETTE.graphite,
  opacity = 0.3,
): LineSegments {
  const positions: number[] = [];
  for (const [start, end] of segments) {
    positions.push(start[0], start[1], start[2], end[0], end[1], end[2]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  const material = new LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const lines = new LineSegments(geometry, material);
  lines.renderOrder = 1;
  lines.frustumCulled = false;
  return lines;
}

export interface RadialTickOptions {
  center: Vec3Tuple;
  radius: number;
  count: number;
  length?: number;
  axis?: 'x' | 'y' | 'z';
  color?: string;
  opacity?: number;
  sweep?: number;
  offset?: number;
}

/** 圆环刻度：仪表边缘的细密测量线。 */
export function createRadialTicks(options: RadialTickOptions): LineSegments {
  const length = options.length ?? 0.1;
  const axis = options.axis ?? 'x';
  const sweep = options.sweep ?? Math.PI * 2;
  const offset = options.offset ?? 0;
  const segments: Array<[Vec3Tuple, Vec3Tuple]> = [];

  for (let index = 0; index < options.count; index += 1) {
    const angle = offset + (sweep * index) / options.count;
    const inner = options.radius;
    const outer = options.radius + length;
    const cosIn = Math.cos(angle);
    const sinIn = Math.sin(angle);
    if (axis === 'x') {
      segments.push([
        [options.center[0], options.center[1] + inner * cosIn, options.center[2] + inner * sinIn],
        [options.center[0], options.center[1] + outer * cosIn, options.center[2] + outer * sinIn],
      ]);
    } else if (axis === 'y') {
      segments.push([
        [options.center[0] + inner * cosIn, options.center[1], options.center[2] + inner * sinIn],
        [options.center[0] + outer * cosIn, options.center[1], options.center[2] + outer * sinIn],
      ]);
    } else {
      segments.push([
        [options.center[0] + inner * cosIn, options.center[1] + inner * sinIn, options.center[2]],
        [options.center[0] + outer * cosIn, options.center[1] + outer * sinIn, options.center[2]],
      ]);
    }
  }

  return createLineSegments(segments, options.color ?? PALETTE.graphite, options.opacity ?? 0.28);
}

/* ------------------------------------------------------------------ *
 * 实例化写入
 * ------------------------------------------------------------------ */

const _position = new Vector3();
const _scale = new Vector3();
const _quaternion = new Quaternion();
const _euler = new Euler();
const _matrix = new Matrix4();

/** 逐实例写入「位置 / 缩放 / 旋转」；调用方在批量写入后设置 needsUpdate。 */
export function setInstanceMatrix(
  mesh: InstancedMesh,
  index: number,
  position: Vec3Tuple,
  scale: Vec3Tuple = [1, 1, 1],
  rotation: Vec3Tuple = [0, 0, 0],
): void {
  _position.set(position[0], position[1], position[2]);
  _scale.set(scale[0], scale[1], scale[2]);
  _euler.set(rotation[0], rotation[1], rotation[2]);
  _quaternion.setFromEuler(_euler);
  _matrix.compose(_position, _quaternion, _scale);
  mesh.setMatrixAt(index, _matrix);
}
