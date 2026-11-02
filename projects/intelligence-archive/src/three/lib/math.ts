/**
 * OWNER: three
 * 纯函数数学工具：阻尼、插值、确定性随机。
 * 3D 层所有运动都走这里的指数阻尼，禁止线性 lerp 叠加（会抖）。
 */

export function clamp(value: number, min = 0, max = 1): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 帧率无关的指数阻尼。lambda 越大收敛越快（2 ≈ 0.5s，4 ≈ 0.25s）。
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** 0→1 的平滑平台窗：进入 / 停留 / 退出。 */
export function window01(value: number, start: number, settle: number, leave: number, end: number): number {
  return smoothstep(start, settle, value) * (1 - smoothstep(leave, end, value));
}

/** 确定性 PRNG（mulberry32），保证每次构建的几何完全一致。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 稳定的 0..1 哈希，用于给索引加“随机感”但不依赖遍历顺序。 */
export function hash01(value: number): number {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
