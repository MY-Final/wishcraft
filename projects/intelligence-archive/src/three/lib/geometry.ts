/**
 * OWNER: three
 * 共享几何工厂：所有 1px 矩形 / 圆环 / 点阵都用同一批单位几何，
 * 通过 scale 复用，避免每个节点新建 geometry。
 */
import * as THREE from 'three';

/** 1×1 单位矩形线框（4 段，8 顶点），可通过 scale 复用。 */
export function createUnitRectGeometry(z = 0): THREE.BufferGeometry {
  const positions = new Float32Array([
    -0.5, -0.5, z, 0.5, -0.5, z,
    0.5, -0.5, z, 0.5, 0.5, z,
    0.5, 0.5, z, -0.5, 0.5, z,
    -0.5, 0.5, z, -0.5, -0.5, z,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export function createRectGeometry(width: number, height: number, z = 0): THREE.BufferGeometry {
  const geometry = createUnitRectGeometry(z);
  geometry.scale(width, height, 1);
  return geometry;
}

/** 单位圆（LineSegments 表示，1px 线宽可控，不用 linewidth 幌子）。 */
export function createCircleGeometry(radius: number, segments: number, z = 0): THREE.BufferGeometry {
  const positions = new Float32Array(segments * 6);
  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const k = i * 6;
    positions[k] = Math.cos(a0) * radius;
    positions[k + 1] = Math.sin(a0) * radius;
    positions[k + 2] = z;
    positions[k + 3] = Math.cos(a1) * radius;
    positions[k + 4] = Math.sin(a1) * radius;
    positions[k + 5] = z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

/** 四角括号：节点 hover / 选中的精密标记（中心留空）。 */
export function createBracketGeometry(size = 0.11, gap = 0.035, z = 0): THREE.BufferGeometry {
  const half = size / 2;
  const inner = half - gap;
  const positions = new Float32Array([
    // 左上
    -half, -half, z, -half, -inner, z,
    -half, -half, z, -inner, -half, z,
    // 右上
    half, -half, z, half, -inner, z,
    half, -half, z, inner, -half, z,
    // 左下
    -half, half, z, -half, inner, z,
    -half, half, z, -inner, half, z,
    // 右下
    half, half, z, half, inner, z,
    half, half, z, inner, half, z,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

/** 为 LineSegments 写入 lineDistance（LineDashedMaterial 需要，1px 虚线不依赖 linewidth）。 */
export function computeSegmentLineDistances(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const count = position.count;
  const distances = new Float32Array(count);
  for (let i = 0; i + 1 < count; i += 2) {
    const dx = position.getX(i + 1) - position.getX(i);
    const dy = position.getY(i + 1) - position.getY(i);
    const dz = position.getZ(i + 1) - position.getZ(i);
    distances[i] = 0;
    distances[i + 1] = Math.hypot(dx, dy, dz);
  }
  geometry.setAttribute('lineDistance', new THREE.BufferAttribute(distances, 1));
}

/** 把线段数组（[x0,y0,z0, x1,y1,z1, ...]）包装成 BufferGeometry。 */
export function createSegmentGeometry(segments: Float32Array | number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(segments instanceof Float32Array ? segments : new Float32Array(segments), 3),
  );
  return geometry;
}
