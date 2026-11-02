/**
 * OWNER: three
 * THE MONOLITH — 全站唯一的几何母题。
 *
 * 一套固定的 W×H 网格拓扑（含水平 / 垂直边）贯穿全部章节，
 * 每个章节只给它一组“目标位置”，运行时在两组目标之间做逐顶点阻尼插值。
 * 因此所有形态共享同一套顶点、同一条索引、同一个 draw call。
 *
 *   ch0 line     一条极细的横线（从光标长出的那根线）
 *   ch1 plane    由线向上展开的窄幅细线平面（落在章版面的中央栏）
 *   ch2 network  平面收拢成球面网络
 *   ch3 attention 压成注意力矩阵 + 注意力弧线
 *   ch4 semantic 散成 9 个语义簇的三维空间
 *   ch5 map      退远成一张低伏的地图网格（内嵌星图接管画面）
 *   ch6 tree     收成地平线，推理树从线上生长（辅助层）
 *   ch7 action   收成地平线，Agent 模块在白色空间展开（独立场景）
 *   ch8 mirror   收回成镜面下方的一条线，黑色镜面本身上台
 *
 * 注意：任何几何调整都必须保持顶点拓扑不变（W×H 网格），否则跨章节插值会错位。
 */
import * as THREE from 'three';
import { mulberry32 } from '../lib/math';

export const SHAPE_ORDER = [
  'line',
  'plane',
  'network',
  'attention',
  'semantic',
  'map',
  'tree',
  'action',
  'mirror',
] as const;

export type MonolithShape = (typeof SHAPE_ORDER)[number];

export interface MonolithData {
  width: number;
  height: number;
  pointCount: number;
  /** 当前顶点位置（每帧写入） */
  positions: Float32Array;
  /** 每个形态的顶点位置，顺序同 SHAPE_ORDER */
  shapes: Float32Array[];
  index: Uint16Array;
  geometry: THREE.BufferGeometry;
  weaveGeometry: THREE.BufferGeometry;
  treeGeometry: THREE.BufferGeometry;
  prunedGeometry: THREE.BufferGeometry;
  shapeOpacity: Float32Array;
  cameraZ: Float32Array;
  cameraY: Float32Array;
  lookY: Float32Array;
  /** ch4 语义空间的 token 点（少量独立点，不属于网格拓扑） */
  semanticGeometry: THREE.BufferGeometry;
  dispose(): void;
}

/**
 * 形态透明度。纸白章节只在留白处保留极淡的线；
 * 第五、六章有章节自己的图，MONOLITH 主动退后。
 */
const SHAPE_OPACITY = [0.72, 0.09, 0.28, 0.42, 0.06, 0.07, 0.14, 0.06, 0.14];
const SHAPE_CAMERA_Z = [4.2, 4.2, 4.35, 4.5, 4.2, 4.35, 4.05, 4.25, 4.25];
const SHAPE_CAMERA_Y = [0, 0, 0, 0, 0, 0.03, 0.06, 0, 0];
const SHAPE_LOOK_Y = [0.02, -0.02, 0, 0, 0, -0.16, 0.06, 0, -0.02];

const LINE_Y = -0.58;
const MIRROR_BASELINE = -0.86;

/** ch4 语义空间：8 层同心矩形环向深处退去（“文字隧道”），环间以 1px 辐射线相连。 */
const SEMANTIC_RINGS = 8;
const SEMANTIC_PERIMETER = 16;
const SEMANTIC_W = 2.2;
const SEMANTIC_H = 1.42;
const SEMANTIC_Z0 = -1.15;
const SEMANTIC_Z_STEP = 0.21;

function semanticPerimeter(t: number): [number, number] {
  const perimeter = 2 * (SEMANTIC_W + SEMANTIC_H);
  let s = (((t % 1) + 1) % 1) * perimeter;
  if (s < SEMANTIC_W) return [-SEMANTIC_W / 2 + s, SEMANTIC_H / 2];
  s -= SEMANTIC_W;
  if (s < SEMANTIC_H) return [SEMANTIC_W / 2, SEMANTIC_H / 2 - s];
  s -= SEMANTIC_H;
  if (s < SEMANTIC_W) return [SEMANTIC_W / 2 - s, -SEMANTIC_H / 2];
  s -= SEMANTIC_W;
  return [-SEMANTIC_W / 2, -SEMANTIC_H / 2 + s];
}

/**
 * 顶点 → 矩形隧道上的位置。
 * 行（v）决定环的深度；列（u）决定环上的位置（16 个等分点）。
 * 同一个环内的多行会被压到同一位置——于是网格边在环内折叠为零长度，
 * 只有「列前进」时画出环线、「换环」时画出辐射线，线量约为原网格的 1/10。
 */
function semanticPosition(u: number, v: number): [number, number, number] {
  const ring = Math.min(SEMANTIC_RINGS - 1, Math.floor(v * (SEMANTIC_RINGS - 0.0001)));
  let point = Math.min(SEMANTIC_PERIMETER - 1, Math.floor(u * SEMANTIC_PERIMETER));
  // 最后一列回到第一列，闭合矩形环
  if (u > 0.999) point = 0;
  const [x, y] = semanticPerimeter((point + 0.5) / SEMANTIC_PERIMETER);
  return [x, y + 0.02, SEMANTIC_Z0 + ring * SEMANTIC_Z_STEP];
}

function buildGridIndex(width: number, height: number): Uint16Array {
  const edges: number[] = [];
  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      const a = j * width + i;
      if (i < width - 1) edges.push(a, a + 1);
      if (j < height - 1) edges.push(a, a + width);
    }
  }
  return new Uint16Array(edges);
}

function buildShapes(width: number, height: number): Float32Array[] {
  const pointCount = width * height;
  const random = new Float32Array(pointCount * 3);
  const rng = mulberry32(1950);
  for (let k = 0; k < random.length; k += 1) random[k] = rng();

  const create = (): Float32Array => new Float32Array(pointCount * 3);

  const line = create();
  const plane = create();
  const network = create();
  const attention = create();
  const semantic = create();
  const map = create();
  const tree = create();
  const action = create();
  const mirror = create();

  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      const u = i / (width - 1);
      const v = j / (height - 1);
      const index = j * width + i;
      const k = index * 3;
      const r0 = random[k];
      const r1 = random[k + 1];
      const r2 = random[k + 2];

      // ch0 —— 一条线
      line[k] = (u - 0.5) * 2.9 + (r0 - 0.5) * 0.008;
      line[k + 1] = LINE_Y + (v - 0.5) * 0.01 + (r1 - 0.5) * 0.004;
      line[k + 2] = 0.16 + (u - 0.5) * 0.02;

      // ch1 —— 由线展开的整幅平面（极淡，作为纸面底纹）
      const envelope = 0.94 + 0.06 * Math.sin(Math.PI * u * 1.6 + 0.5);
      plane[k] = (u - 0.5) * 2.86 + (r0 - 0.5) * 0.02;
      plane[k + 1] = LINE_Y + v * 1.62 * envelope + (r1 - 0.5) * 0.01;
      plane[k + 2] = -0.04 + v * 0.16 + (r2 - 0.5) * 0.02;

      // ch2 —— 球面网络
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI;
      const radius = 1.02 + (r0 - 0.5) * 0.1;
      network[k] = radius * Math.sin(phi) * Math.cos(theta);
      network[k + 1] = radius * Math.cos(phi) * 0.94 + 0.02;
      network[k + 2] = radius * Math.sin(phi) * Math.sin(theta) + (r2 - 0.5) * 0.02;

      // ch3 —— 注意力矩阵
      attention[k] = (u - 0.5) * 2.0 + (r0 - 0.5) * 0.004;
      attention[k + 1] = (v - 0.5) * 1.94 + (r1 - 0.5) * 0.004;
      attention[k + 2] = 0.14 + (r2 - 0.5) * 0.01;

      // ch4 —— 语义空间：4 层有序网格隧道（线量约为原来的 1/6）
      const semanticPoint = semanticPosition(u, v);
      semantic[k] = semanticPoint[0] + (r0 - 0.5) * 0.006;
      semantic[k + 1] = semanticPoint[1] + (r1 - 0.5) * 0.006;
      semantic[k + 2] = semanticPoint[2] + (r2 - 0.5) * 0.006;

      // ch5 —— 只留一条极淡轴线，把画面让给章节星图
      map[k] = (u - 0.5) * 2.6 + (r0 - 0.5) * 0.006;
      map[k + 1] = -0.74 + (v - 0.5) * 0.008;
      map[k + 2] = 0.12;

      // ch6 —— 地平线
      tree[k] = (u - 0.5) * 2.5 + (r0 - 0.5) * 0.01;
      tree[k + 1] = -0.92 + (v - 0.5) * 0.006;
      tree[k + 2] = 0.06 + (r1 - 0.5) * 0.01;

      // ch7 —— 地平线（更低、更静）
      action[k] = (u - 0.5) * 2.7;
      action[k + 1] = -1.03 + (v - 0.5) * 0.005;
      action[k + 2] = 0.1;

      // ch8 —— 收回成镜面下方的一条线
      mirror[k] = (u - 0.5) * 2.72 + (r0 - 0.5) * 0.004;
      mirror[k + 1] = MIRROR_BASELINE + (v - 0.5) * 0.006;
      mirror[k + 2] = 0.12;
    }
  }

  return [line, plane, network, attention, semantic, map, tree, action, mirror];
}

/**
 * 注意力弧线：从矩阵中的 query 单元升起、落到 key 单元。
 * 二次贝塞尔采样 4 段，全部是 1px 直线段，不画发光曲线。
 */
function buildAttentionWeave(positions: Float32Array, width: number, height: number): Float32Array {
  const rng = mulberry32(2017);
  const out: number[] = [];
  const at = (index: number): [number, number, number] => [
    positions[index * 3],
    positions[index * 3 + 1],
    positions[index * 3 + 2],
  ];

  const lift = 0.16;
  const arc = (fromIndex: number, toIndex: number, height0: number): void => {
    const a = at(fromIndex);
    const b = at(toIndex);
    const cx = (a[0] + b[0]) * 0.5;
    const cy = (a[1] + b[1]) * 0.5;
    const cz = a[2] + height0 + lift;
    const steps = 4;
    let prev = a;
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      const inv = 1 - t;
      const px = inv * inv * a[0] + 2 * inv * t * cx + t * t * b[0];
      const py = inv * inv * a[1] + 2 * inv * t * cy + t * t * b[1];
      const pz = inv * inv * a[2] + 2 * inv * t * cz + t * t * b[2];
      out.push(prev[0], prev[1], prev[2], px, py, pz);
      prev = [px, py, pz];
    }
  };

  for (let n = 0; n < 22; n += 1) {
    const queryRow = Math.floor(rng() * height);
    const queryCol = Math.floor((queryRow / Math.max(height - 1, 1)) * (width - 1));
    const keyRow = Math.floor(rng() * height);
    const keyCol = Math.floor(rng() * width);
    const from = queryRow * width + queryCol;
    const to = keyRow * width + keyCol;
    if (from !== to) arc(from, to, 0.02 + rng() * 0.05);
  }

  // 少量邻域短弧：局部注意力
  for (let n = 0; n < 34; n += 1) {
    const row = Math.floor(rng() * height);
    const col = Math.floor(rng() * width);
    const toRow = Math.max(0, Math.min(height - 1, row + Math.floor(rng() * 5) - 2));
    const toCol = Math.max(0, Math.min(width - 1, col + Math.floor(rng() * 9) - 4));
    const from = row * width + col;
    const to = toRow * width + toCol;
    if (from !== to) arc(from, to, 0.01 + rng() * 0.04);
  }

  void width;
  return new Float32Array(out);
}

/** 推理树：主枝 + 被剪枝的残枝。原点在地平线中央，向上生长。 */
function buildReasoningTree(): { main: Float32Array; pruned: Float32Array } {
  const rng = mulberry32(2025);
  const main: number[] = [];
  const pruned: number[] = [];
  const baseline = -0.92;
  const maxDepth = 5;

  interface Branch {
    x: number;
    y: number;
    z: number;
    angle: number;
    length: number;
    depth: number;
  }

  const stack: Branch[] = [
    { x: 0, y: baseline, z: 0.06, angle: Math.PI / 2, length: 0.36, depth: 0 },
  ];

  while (stack.length > 0) {
    const branch = stack.pop() as Branch;
    const endX = branch.x + Math.cos(branch.angle) * branch.length;
    const endY = branch.y + Math.sin(branch.angle) * branch.length;
    const endZ = branch.z + (rng() - 0.5) * 0.07;

    const isPruned = branch.depth >= 2 && rng() < 0.24;
    if (isPruned) {
      const stop = 0.34 + rng() * 0.26;
      pruned.push(
        branch.x, branch.y, branch.z,
        branch.x + (endX - branch.x) * stop,
        branch.y + (endY - branch.y) * stop,
        branch.z,
      );
      continue;
    }

    main.push(branch.x, branch.y, branch.z, endX, endY, endZ);
    if (branch.depth >= maxDepth) continue;

    const spread = 0.34 + rng() * 0.2;
    const directions = rng() < 0.16 ? [-1, 0, 1] : [-1, 1];
    for (const direction of directions) {
      const angle = Math.min(
        Math.PI * 0.86,
        Math.max(Math.PI * 0.14, branch.angle + direction * spread),
      );
      stack.push({
        x: endX,
        y: endY,
        z: endZ,
        angle,
        length: branch.length * (0.7 + rng() * 0.1),
        depth: branch.depth + 1,
      });
    }
  }

  return { main: new Float32Array(main), pruned: new Float32Array(pruned) };
}

export function createMonolithData(isMobile: boolean): MonolithData {
  const width = isMobile ? 30 : 46;
  const height = isMobile ? 18 : 28;
  const pointCount = width * height;

  const shapes = buildShapes(width, height);
  const positions = new Float32Array(shapes[0]);
  const index = buildGridIndex(width, height);

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttribute);
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 8);

  const weavePositions = buildAttentionWeave(shapes[3], width, height);
  const weaveGeometry = new THREE.BufferGeometry();
  weaveGeometry.setAttribute('position', new THREE.BufferAttribute(weavePositions, 3));
  weaveGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);

  const tree = buildReasoningTree();
  const treeGeometry = new THREE.BufferGeometry();
  treeGeometry.setAttribute('position', new THREE.BufferAttribute(tree.main, 3));
  treeGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);

  const prunedGeometry = new THREE.BufferGeometry();
  prunedGeometry.setAttribute('position', new THREE.BufferAttribute(tree.pruned, 3));
  prunedGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);

  // ch4 的少量 token 点：沿隧道分布 6 个，落在环线上。
  const tokenRng = mulberry32(2018);
  const semanticTokens: number[] = [];
  for (let token = 0; token < 6; token += 1) {
    const ring = 1 + Math.floor(tokenRng() * (SEMANTIC_RINGS - 2));
    const point = Math.floor(tokenRng() * SEMANTIC_PERIMETER);
    const position = semanticPosition(
      (point + 0.5) / SEMANTIC_PERIMETER,
      (ring + 0.5) / SEMANTIC_RINGS,
    );
    semanticTokens.push(position[0], position[1], position[2]);
  }
  const semanticGeometry = new THREE.BufferGeometry();
  semanticGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(semanticTokens), 3),
  );
  semanticGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);

  return {
    width,
    height,
    pointCount,
    positions,
    shapes,
    index,
    geometry,
    weaveGeometry,
    treeGeometry,
    prunedGeometry,
    semanticGeometry,
    shapeOpacity: new Float32Array(SHAPE_OPACITY),
    cameraZ: new Float32Array(SHAPE_CAMERA_Z),
    cameraY: new Float32Array(SHAPE_CAMERA_Y),
    lookY: new Float32Array(SHAPE_LOOK_Y),
    dispose(): void {
      geometry.dispose();
      weaveGeometry.dispose();
      treeGeometry.dispose();
      prunedGeometry.dispose();
      semanticGeometry.dispose();
    },
  };
}

/** 在 shape[lo] 与 shape[hi] 之间写入当前顶点。 */
export function lerpShapes(
  data: MonolithData,
  lo: number,
  hi: number,
  t: number,
): void {
  const a = data.shapes[lo];
  const b = data.shapes[hi];
  const out = data.positions;
  if (t <= 0.0001) {
    out.set(a);
  } else if (t >= 0.9999) {
    out.set(b);
  } else {
    for (let k = 0; k < out.length; k += 1) {
      out[k] = a[k] + (b[k] - a[k]) * t;
    }
  }
  (data.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
}
