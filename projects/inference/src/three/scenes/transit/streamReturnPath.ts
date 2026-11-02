/**
 * 返回链路的前半段：量规底板、返回轨道、Detokenizer、SSE 协议桅杆与事件标尺。
 *
 * 对比策略同第 02 章：暗石墨机体 + 青色协议线 + 橙色数据。
 * 事件标尺画出 55 个等距 Token 刻度与 9 个事件括号；Chunk 的字节标尺
 * 在 streamCargo.ts 里，两套边界一对照就露出错位。
 */
import {
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';
import { PALETTE } from '../../kit/palette';
import { glassMaterial, graphiteMaterial, steelMaterial } from '../../kit/materials';
import { roundedBox, tickStrip } from '../../kit/geometry';
import { makeCanvasTexture } from '../../kit/textures';
import {
  DETOK_X,
  EVENT_RAIL_Y,
  EVENT_SPANS,
  MAST_X,
  RAIL_X_CLIENT,
  RAIL_X_MODEL,
  RAIL_Y,
  TOKEN_TOTAL,
  TOKEN_X1,
  tokenX,
} from './streamLayout';
import type { StreamBuildContext } from './streamLayout';
import { paintEventPreview } from './streamPainters';
import {
  createEdgeOverlay,
  createLabel,
  createLineSegments,
  createNodeLabel,
  setInstanceMatrix,
  type Vec3Tuple,
} from './transitSupport';

const darkGraphite = (): ReturnType<typeof graphiteMaterial> =>
  graphiteMaterial({ color: '#191a18', roughness: 0.44, metalness: 0.52 });
const darkSteel = (): ReturnType<typeof steelMaterial> =>
  steelMaterial({ color: '#5d5f5a', roughness: 0.32 });

export function buildDatum(ctx: StreamBuildContext): void {
  const segments: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (let z = -5.2; z <= 5.2; z += 1.75) {
    segments.push([
      [-13.2, 0.004, z],
      [13.2, 0.004, z],
    ]);
  }
  for (let x = -12.8; x <= 13.2; x += 2.4) {
    segments.push([
      [x, 0.004, -5.6],
      [x, 0.004, 5.6],
    ]);
  }
  ctx.group.add(createLineSegments(segments, PALETTE.graphiteSoft, 0.2));

  ctx.group.add(
    tickStrip(24, 100, {
      axis: 'x',
      tickSize: 0.045,
      majorEvery: 10,
      opacity: 0.26,
      origin: new Vector3(0.4, 0.012, 1.5),
    }),
  );

  // 高空方向线：三根细弧 + 箭头短划，强调“往客户端去”。
  const direction: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (const z of [-0.4, 0, 0.4]) {
    const points: Vec3Tuple[] = [];
    for (let index = 0; index <= 12; index += 1) {
      const t = index / 12;
      points.push([12.6 - t * 22.6, 4.85 + Math.sin(t * Math.PI) * 0.28, z]);
    }
    for (let index = 0; index < points.length - 1; index += 1) {
      direction.push([points[index], points[index + 1]]);
    }
    for (let index = 2; index < points.length; index += 3) {
      const [x, y] = points[index];
      direction.push([
        [x + 0.26, y + 0.13, z],
        [x, y, z],
      ]);
      direction.push([
        [x + 0.26, y - 0.13, z],
        [x, y, z],
      ]);
    }
  }
  ctx.group.add(createLineSegments(direction, PALETTE.graphite, 0.18));
}

export function buildReturnRail(ctx: StreamBuildContext): void {
  const length = RAIL_X_MODEL - RAIL_X_CLIENT;
  const middle = (RAIL_X_MODEL + RAIL_X_CLIENT) / 2;
  const rail = new Mesh(
    new CylinderGeometry(0.03, 0.03, length, 8, 1),
    darkSteel(),
  );
  rail.rotation.z = Math.PI / 2;
  rail.position.set(middle, RAIL_Y, 0);
  ctx.group.add(rail);

  const tray = new Mesh(roundedBox(length, 0.06, 0.32, 0.02), darkGraphite());
  tray.position.set(middle, RAIL_Y - 0.32, 0);
  ctx.group.add(tray);

  for (let x = RAIL_X_CLIENT + 1.2; x <= RAIL_X_MODEL - 1; x += 3.4) {
    ctx.supports.push({ position: [x, RAIL_Y / 2 - 0.05, 0], scale: [0.055, RAIL_Y - 0.3, 0.055] });
    ctx.supports.push({ position: [x, 0.02, 0], scale: [0.26, 0.04, 0.26] });
  }
}

export function buildDetokenizer(ctx: StreamBuildContext): void {
  const node = new Group();
  node.position.set(DETOK_X, 0, 0);

  // 暗色机架框住薄玻璃罩，避免出现大块浅灰。
  const framePosts = new InstancedMesh(ctx.unitBox, darkGraphite(), 4);
  const posts: Vec3Tuple[] = [
    [-0.62, 1.45, -1.05],
    [0.62, 1.45, -1.05],
    [-0.62, 1.45, 1.05],
    [0.62, 1.45, 1.05],
  ];
  posts.forEach((position, index) => {
    setInstanceMatrix(framePosts, index, position, [0.09, 2.0, 0.09]);
  });
  framePosts.instanceMatrix.needsUpdate = true;
  node.add(framePosts);

  const housings = new InstancedMesh(
    roundedBox(1.4, 2.0, 0.5, 0.06),
    glassMaterial({ color: '#eef3f0', opacity: 0.1 }),
    2,
  );
  setInstanceMatrix(housings, 0, [0, 1.45, -1.05], [1, 1, 1]);
  setInstanceMatrix(housings, 1, [0, 1.45, 1.05], [1, 1, 1]);
  housings.instanceMatrix.needsUpdate = true;
  node.add(housings);
  node.add(createEdgeOverlay(roundedBox(1.4, 2.0, 0.5, 0.06), PALETTE.graphite, 0.45));

  const topPlate = new Mesh(roundedBox(1.6, 0.12, 2.4, 0.03), darkGraphite());
  topPlate.position.y = 2.5;
  topPlate.castShadow = true;
  node.add(topPlate);

  // 进入机箱的 Token ID 小牌。
  const idPlates = new InstancedMesh(
    roundedBox(0.3, 0.14, 0.02, 0.008),
    new MeshBasicMaterial({
      color: new Color(PALETTE.orange),
      transparent: true,
      opacity: 0.95,
      toneMapped: false,
    }),
    6,
  );
  for (let index = 0; index < 6; index += 1) {
    setInstanceMatrix(
      idPlates,
      index,
      [0.72 - (index % 2) * 0.16, 0.88 + index * 0.19, 1.12],
      [1, 1, 1],
    );
  }
  idPlates.instanceMatrix.needsUpdate = true;
  node.add(idPlates);

  // 梳齿滚筒：把 ID 重新排成字节。
  const drum = new Group();
  drum.position.set(-0.55, 1.42, 0);
  const drumShell = new Mesh(
    new CylinderGeometry(0.34, 0.34, 0.9, 18, 1),
    darkSteel(),
  );
  drumShell.rotation.x = Math.PI / 2;
  drumShell.castShadow = true;
  drum.add(drumShell);
  const teeth = new InstancedMesh(
    roundedBox(0.05, 0.18, 0.05, 0.01),
    new MeshBasicMaterial({ color: new Color(PALETTE.graphite), toneMapped: false }),
    12,
  );
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    setInstanceMatrix(
      teeth,
      index,
      [Math.cos(angle) * 0.36, Math.sin(angle) * 0.36, 0.47],
      [1, 1, 1],
      [0, 0, angle],
    );
  }
  teeth.instanceMatrix.needsUpdate = true;
  drum.add(teeth);
  node.add(drum);
  ctx.handles.detokDrum = drum;

  // 输出的文本带（继续沿 -X 流走）。
  const ribbonMaterial = new MeshBasicMaterial({
    color: new Color(PALETTE.orange),
    transparent: true,
    opacity: 0.85,
    toneMapped: false,
  });
  const ribbon = new Mesh(roundedBox(1.15, 0.02, 0.36, 0.01), ribbonMaterial);
  ribbon.position.set(-1.25, 1.16, 0);
  node.add(ribbon);
  ctx.handles.detokRibbonMaterial = ribbonMaterial;

  const label = createNodeLabel('detokenizer', 0.2).translateY(2.82);
  node.add(label);

  node.userData.infoId = 'detokenizer';
  ctx.pickables.push(node);
  ctx.group.add(node);

  ctx.supports.push({ position: [DETOK_X, 0.52, -1.05], scale: [0.1, 1.04, 0.1] });
  ctx.supports.push({ position: [DETOK_X, 0.52, 1.05], scale: [0.1, 1.04, 0.1] });
}

export function buildSseMast(ctx: StreamBuildContext): void {
  const node = new Group();
  node.position.set(MAST_X, 0, -1.75);

  const mast = new Mesh(roundedBox(0.16, 3.3, 0.16, 0.02), darkGraphite());
  mast.position.y = 1.65;
  mast.castShadow = true;
  node.add(mast);

  const arm = new Mesh(roundedBox(0.11, 0.11, 1.85, 0.02), darkSteel());
  arm.position.set(0, 2.95, 0.92);
  node.add(arm);

  const protocolPlate = new Mesh(
    roundedBox(0.9, 0.36, 0.04, 0.02),
    darkGraphite(),
  );
  protocolPlate.position.set(0, 2.42, 1.12);
  node.add(protocolPlate);
  node.add(createEdgeOverlay(roundedBox(0.9, 0.36, 0.04, 0.02), PALETTE.teal, 0.6).translateY(2.42).translateZ(1.12));

  const label = createNodeLabel('sse-stream', 0.2).translateY(3.72);
  node.add(label);
  const protocolLabel = createLabel('text/event-stream', {
    height: 0.15,
    mono: true,
    color: PALETTE.teal,
    opacity: 1,
  });
  protocolLabel.position.set(0, 2.16, 1.12);
  node.add(protocolLabel);

  node.userData.infoId = 'sse-stream';
  ctx.pickables.push(node);
  ctx.group.add(node);

  ctx.supports.push({ position: [MAST_X, 0.055, -1.75], scale: [0.66, 0.11, 0.66] });

  // 事件预览面板：9 个事件里当前经过的那一个。
  const previewGroup = new Group();
  previewGroup.position.set(MAST_X - 0.45, 2.16, -0.95);
  previewGroup.rotation.y = 0.5;
  previewGroup.add(new Mesh(roundedBox(1.02, 0.48, 0.04, 0.02), darkGraphite()));

  const previewTexture = makeCanvasTexture(512, 224, () => {
    /* 首帧 update 会填入当前事件。 */
  });
  const previewCanvas = previewTexture.image as HTMLCanvasElement;
  paintEventPreview(previewCanvas, null);
  previewTexture.needsUpdate = true;
  const preview = new Mesh(
    new PlaneGeometry(0.94, 0.41),
    new MeshBasicMaterial({
      map: previewTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  preview.position.z = 0.026;
  preview.renderOrder = 4;
  previewGroup.add(preview);
  ctx.group.add(previewGroup);

  ctx.handles.previewCanvas = previewCanvas;
  ctx.handles.previewTexture = previewTexture;
}

export function buildEventRuler(ctx: StreamBuildContext): void {
  // 事件总线：从桅杆横臂伸向客户端方向。
  ctx.group.add(
    createLineSegments(
      [
        [
          [MAST_X - 0.4, EVENT_RAIL_Y, 0],
          [TOKEN_X1, EVENT_RAIL_Y, 0],
        ],
      ],
      PALETTE.teal,
      0.7,
    ),
  );

  // 55 个 Token 边界刻度：等距，代表模型侧语义。
  const ticks: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (let token = 0; token <= TOKEN_TOTAL; token += 1) {
    const x = tokenX(token);
    const major = token % 5 === 0;
    ticks.push([
      [x, EVENT_RAIL_Y, 0],
      [x, EVENT_RAIL_Y - (major ? 0.16 : 0.1), 0],
    ]);
  }
  ctx.group.add(createLineSegments(ticks, PALETTE.graphite, 0.42));

  // 9 个事件括号：事件跨度落在 Token 标尺上。
  const brackets: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (const span of EVENT_SPANS) {
    brackets.push([
      [span.start, EVENT_RAIL_Y, 0],
      [span.start, EVENT_RAIL_Y + 0.3, 0],
    ]);
    brackets.push([
      [span.end, EVENT_RAIL_Y, 0],
      [span.end, EVENT_RAIL_Y + 0.3, 0],
    ]);
    brackets.push([
      [span.start, EVENT_RAIL_Y + 0.3, 0],
      [span.end, EVENT_RAIL_Y + 0.3, 0],
    ]);
  }
  ctx.group.add(createLineSegments(brackets, PALETTE.teal, 0.65));

  // 每个事件一条可点亮的协议飘带 + 编号标签；标签只在镜头靠近时出现。
  EVENT_SPANS.forEach((span, index) => {
    const width = Math.max(0.08, span.end - span.start);
    const center = (span.start + span.end) / 2;
    const material = new MeshBasicMaterial({
      color: new Color(PALETTE.teal),
      transparent: true,
      opacity: 0.25,
      toneMapped: false,
    });
    const ribbon = new Mesh(ctx.unitBox, material);
    ribbon.scale.set(width * 0.92, 0.16, 0.06);
    ribbon.position.set(center, EVENT_RAIL_Y + 0.16, 0);
    ctx.group.add(ribbon);

    const label = createLabel(`EVENT ${String(span.data.id).padStart(2, '0')}`, {
      sub: `TOK ${span.data.tokenStart}–${span.data.tokenEnd}`,
      height: 0.17,
      mono: true,
      subColor: PALETTE.teal,
    });
    label.position.set(center, EVENT_RAIL_Y + 0.46, 0);
    label.renderOrder = 22;
    ctx.group.add(label);
    ctx.handles.eventMarkers.push({ material, label, center, index });
  });


}
