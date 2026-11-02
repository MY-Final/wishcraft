/**
 * 返回链路的后半段：5 个网络 Chunk（含 55 个 Token 微粒）、字节标尺、
 * TTFT 仪表、客户端窗口与环境微粒，最后装配整个第 08 章场景。
 *
 * Chunk 舱是暗色机架 + 薄玻璃侧板 + 青绿描边；Token 微粒是暖橙色块。
 * 容器尺寸按字节划分，与上方按 Token 划分的事件边界刻意错开。
 */
import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { PALETTE } from '../../kit/palette';
import { glassMaterial, graphiteMaterial, steelMaterial } from '../../kit/materials';
import { curveFromPoints, roundedBox } from '../../kit/geometry';
import { createDustField, createFlowParticles } from '../../kit/particles';
import { makeCanvasTexture } from '../../kit/textures';
import { NODE_INFO } from '../../../data/nodes';
import { SIMULATED } from '../../../data/metrics';
import type { QualityInfo } from '../../types';
import {
  CHUNK_CENTRE_Y,
  CHUNK_DEPTH,
  CHUNK_HEIGHT,
  CHUNK_SPANS,
  CHUNK_START_Y,
  CLIENT_X,
  EVENT_RAIL_Y,
  EVENT_SPANS,
  MAST_X,
  RAIL_X_CLIENT,
  RAIL_X_MODEL,
  RAIL_Y,
  TOKEN_TOTAL,
  TOKEN_X1,
  TTFT_X,
} from './streamLayout';
import type { BuiltStream, StreamBuildContext, StreamHandles } from './streamLayout';
import { paintClientScreen } from './streamPainters';
import {
  buildDatum,
  buildDetokenizer,
  buildEventRuler,
  buildReturnRail,
  buildSseMast,
} from './streamReturnPath';
import {
  createEdgeOverlay,
  createLabel,
  createLineSegments,
  mulberry32,
  setInstanceMatrix,
  type Vec3Tuple,
} from './transitSupport';

const darkGraphite = (): ReturnType<typeof graphiteMaterial> =>
  graphiteMaterial({ color: '#191a18', roughness: 0.44, metalness: 0.52 });
const darkSteel = (): ReturnType<typeof steelMaterial> =>
  steelMaterial({ color: '#5d5f5a', roughness: 0.32 });

const buildChunkField = (ctx: StreamBuildContext): void => {
  const pickable = new Group();

  // 薄玻璃侧板 + 暗色机架：舱体读成仪器，而不是白色盒子。
  const shells = new InstancedMesh(
    roundedBox(1, 1, 1, 0.05),
    glassMaterial({ color: '#e9f2ee', opacity: 0.08 }),
    CHUNK_SPANS.length,
  );
  CHUNK_SPANS.forEach((span, index) => {
    const width = Math.max(0.2, (span.end - span.start) * 0.9);
    setInstanceMatrix(
      shells,
      index,
      [(span.start + span.end) / 2, CHUNK_CENTRE_Y, 0],
      [width, CHUNK_HEIGHT, CHUNK_DEPTH],
    );
  });
  shells.instanceMatrix.needsUpdate = true;
  pickable.add(shells);

  const posts = new InstancedMesh(ctx.unitBox, darkGraphite(), CHUNK_SPANS.length * 4);
  const rails = new InstancedMesh(ctx.unitBox, darkSteel(), CHUNK_SPANS.length * 2);
  const strips = new InstancedMesh(
    ctx.unitBox,
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
    CHUNK_SPANS.length,
  );
  CHUNK_SPANS.forEach((span, index) => {
    const width = Math.max(0.2, (span.end - span.start) * 0.9);
    const center = (span.start + span.end) / 2;
    const bottom = CHUNK_CENTRE_Y - CHUNK_HEIGHT / 2;
    const top = CHUNK_CENTRE_Y + CHUNK_HEIGHT / 2;
    for (let corner = 0; corner < 4; corner += 1) {
      const x = center + (corner % 2 === 0 ? -width / 2 + 0.06 : width / 2 - 0.06);
      const z = corner < 2 ? -CHUNK_DEPTH / 2 + 0.05 : CHUNK_DEPTH / 2 - 0.05;
      setInstanceMatrix(posts, index * 4 + corner, [x, CHUNK_CENTRE_Y, z], [0.07, CHUNK_HEIGHT, 0.07]);
    }
    for (let edge = 0; edge < 2; edge += 1) {
      const y = edge === 0 ? bottom : top;
      setInstanceMatrix(
        rails,
        index * 2 + edge,
        [center, y, CHUNK_DEPTH / 2 - 0.05],
        [width, 0.06, 0.06],
      );
    }
    setInstanceMatrix(strips, index, [center, bottom + 0.07, CHUNK_DEPTH / 2 - 0.02], [width * 0.92, 0.04, 0.02]);
  });
  posts.instanceMatrix.needsUpdate = true;
  rails.instanceMatrix.needsUpdate = true;
  strips.instanceMatrix.needsUpdate = true;
  pickable.add(posts, rails, strips);

  // 舱体的青绿描边（12 条棱合成一次绘制）。
  const edges: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (const span of CHUNK_SPANS) {
    const width = Math.max(0.2, (span.end - span.start) * 0.9);
    const center = (span.start + span.end) / 2;
    const x0 = center - width / 2;
    const x1 = center + width / 2;
    const y0 = CHUNK_CENTRE_Y - CHUNK_HEIGHT / 2;
    const y1 = CHUNK_CENTRE_Y + CHUNK_HEIGHT / 2;
    const z0 = -CHUNK_DEPTH / 2;
    const z1 = CHUNK_DEPTH / 2;
    for (const y of [y0, y1]) {
      for (const z of [z0, z1]) edges.push([[x0, y, z], [x1, y, z]]);
    }
    for (const x of [x0, x1]) {
      for (const z of [z0, z1]) edges.push([[x, y0, z], [x, y1, z]]);
    }
    for (const x of [x0, x1]) {
      for (const y of [y0, y1]) edges.push([[x, y, z0], [x, y, z1]]);
    }
  }
  ctx.group.add(createLineSegments(edges, PALETTE.teal, 0.42));

  // Chunk 状态灯：当前经过的舱亮起来。
  const lamps = new InstancedMesh(
    new SphereGeometry(0.05, 12, 10),
    new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    CHUNK_SPANS.length,
  );
  const dimOrange = new Color(PALETTE.orange).multiplyScalar(0.35);
  CHUNK_SPANS.forEach((span, index) => {
    lamps.setColorAt(index, dimOrange);
    setInstanceMatrix(lamps, index, [
      (span.start + span.end) / 2,
      CHUNK_CENTRE_Y + CHUNK_HEIGHT / 2 + 0.06,
      CHUNK_DEPTH / 2 - 0.2,
    ]);
  });
  lamps.instanceMatrix.needsUpdate = true;
  if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
  pickable.add(lamps);
  ctx.handles.chunkLamps = lamps;

  // Token 微粒按 Chunk 分组塞进各自的容器里，排得紧一点，读作“装满”。
  const random = mulberry32(0x1f3a5c);
  const motes = new InstancedMesh(
    roundedBox(0.1, 0.1, 0.1, 0.024),
    new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    TOKEN_TOTAL,
  );
  motes.instanceMatrix.setUsage(DynamicDrawUsage);
  const moteBase = new Float32Array(TOKEN_TOTAL * 3);
  const moteChunk = new Uint8Array(TOKEN_TOTAL);
  const motePhase = new Float32Array(TOKEN_TOTAL);
  let tokenIndex = 0;
  CHUNK_SPANS.forEach((span, chunkIndex) => {
    const width = Math.max(0.2, (span.end - span.start) * 0.9);
    const innerWidth = width * 0.64;
    const innerHeight = CHUNK_HEIGHT * 0.56;
    const count = span.data.tokenCount;
    const columns = Math.max(
      2,
      Math.min(6, Math.round(Math.sqrt(count * (innerWidth / innerHeight)))),
    );
    const rows = Math.max(1, Math.ceil(count / columns));
    const gapX = innerWidth / columns;
    const gapY = innerHeight / rows;
    for (let slot = 0; slot < count; slot += 1) {
      if (tokenIndex >= TOKEN_TOTAL) break;
      const column = slot % columns;
      const row = Math.floor(slot / columns);
      const x =
        span.start +
        (span.end - span.start) / 2 -
        innerWidth / 2 +
        gapX * (column + 0.5) +
        (random() - 0.5) * 0.04;
      const y =
        CHUNK_CENTRE_Y - innerHeight / 2 + gapY * (row + 0.5) + (random() - 0.5) * 0.04;
      const z = (random() - 0.5) * 0.36;
      moteBase[tokenIndex * 3] = x;
      moteBase[tokenIndex * 3 + 1] = y;
      moteBase[tokenIndex * 3 + 2] = z;
      moteChunk[tokenIndex] = chunkIndex;
      motePhase[tokenIndex] = random() * Math.PI * 2;
      setInstanceMatrix(motes, tokenIndex, [x, y, z], [1, 1, 1]);
      motes.setColorAt(tokenIndex, new Color(PALETTE.orange));
      tokenIndex += 1;
    }
  });
  motes.instanceMatrix.needsUpdate = true;
  if (motes.instanceColor) motes.instanceColor.needsUpdate = true;
  pickable.add(motes);
  ctx.handles.chunkMotes = motes;
  ctx.handles.moteBase = moteBase;
  ctx.handles.moteChunk = moteChunk;
  ctx.handles.motePhase = motePhase;
  ctx.handles.chunkLabels = [];

  CHUNK_SPANS.forEach((span) => {
    const center = (span.start + span.end) / 2;
    const label = createLabel(`CHUNK ${String(span.data.id).padStart(2, '0')}`, {
      sub: `${span.data.tokenCount} TOK · ${span.data.byteLabel}`,
      height: 0.19,
      mono: true,
      subColor: PALETTE.teal,
    });
    label.position.set(center, CHUNK_CENTRE_Y + CHUNK_HEIGHT / 2 + 0.18, CHUNK_DEPTH / 2 - 0.32);
    label.renderOrder = 22;
    pickable.add(label);
    ctx.handles.chunkLabels.push(label);
  });

  pickable.userData.infoId = 'response-chunks';
  ctx.pickables.push(pickable);
  ctx.group.add(pickable);

  buildTransportRuler(ctx);
};

const buildTransportRuler = (ctx: StreamBuildContext): void => {
  // 传输层标尺：按字节切分的 5 段。
  const segments = new InstancedMesh(
    ctx.unitBox,
    darkSteel(),
    CHUNK_SPANS.length,
  );
  CHUNK_SPANS.forEach((span, index) => {
    const width = Math.max(0.1, (span.end - span.start) * 0.94);
    setInstanceMatrix(
      segments,
      index,
      [(span.start + span.end) / 2, CHUNK_START_Y, 0],
      [width, 0.06, 0.18],
    );
  });
  segments.instanceMatrix.needsUpdate = true;
  ctx.group.add(segments);

  const chunkTicks: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (const x of [...CHUNK_SPANS.map((span) => span.start), CHUNK_SPANS[CHUNK_SPANS.length - 1].end]) {
    chunkTicks.push([
      [x, CHUNK_START_Y - 0.12, 0],
      [x, CHUNK_CENTRE_Y - CHUNK_HEIGHT / 2 - 0.08, 0],
    ]);
  }
  ctx.group.add(createLineSegments(chunkTicks, PALETTE.orange, 0.6));

  // 事件边界竖直落在传输标尺上；与 Chunk 边界的错位一目了然。
  const eventTicks: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (const span of EVENT_SPANS) {
    eventTicks.push([
      [span.start, CHUNK_START_Y + 0.06, 0],
      [span.start, EVENT_RAIL_Y - 0.02, 0],
    ]);
  }
  eventTicks.push([
    [EVENT_SPANS[EVENT_SPANS.length - 1].end, CHUNK_START_Y + 0.06, 0],
    [EVENT_SPANS[EVENT_SPANS.length - 1].end, EVENT_RAIL_Y - 0.02, 0],
  ]);
  ctx.group.add(createLineSegments(eventTicks, PALETTE.teal, 0.3));

  // 误差线：每个事件边界连到最近的 Chunk 边界。
  const chunkBoundaries = [CHUNK_SPANS[0].start, ...CHUNK_SPANS.map((span) => span.end)];
  const ties: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (const x of [EVENT_SPANS[0].start, ...EVENT_SPANS.map((span) => span.end)]) {
    let nearest = chunkBoundaries[0];
    for (const candidate of chunkBoundaries) {
      if (Math.abs(candidate - x) < Math.abs(nearest - x)) nearest = candidate;
    }
    if (Math.abs(nearest - x) > 0.03) {
      ties.push([
        [x, CHUNK_START_Y + 0.18, 0],
        [nearest, CHUNK_START_Y + 0.18, 0],
      ]);
    }
  }
  ctx.group.add(createLineSegments(ties, PALETTE.orange, 0.5));

  // 每个 Chunk 悬挂在返回总线上。
  for (const span of CHUNK_SPANS) {
    const center = (span.start + span.end) / 2;
    for (const z of [-0.42, 0.42]) {
      ctx.supports.push({
        position: [center, (EVENT_RAIL_Y + CHUNK_CENTRE_Y + CHUNK_HEIGHT / 2) / 2, z],
        scale: [0.03, EVENT_RAIL_Y - (CHUNK_CENTRE_Y + CHUNK_HEIGHT / 2), 0.03],
      });
    }
  }
};

const buildTtftGauge = (ctx: StreamBuildContext): void => {
  const node = new Group();
  node.position.set(TTFT_X, 0, -2.28);

  const back = new Mesh(roundedBox(1.05, 2.25, 0.08, 0.03), darkGraphite());
  back.position.y = 1.55;
  back.castShadow = true;
  node.add(back);

  const face = new Mesh(
    roundedBox(0.96, 2.08, 0.03, 0.02),
    glassMaterial({ color: '#f1f4f0', opacity: 0.12 }),
  );
  face.position.set(0, 1.55, 0.055);
  node.add(face);
  node.add(createEdgeOverlay(roundedBox(0.96, 2.08, 0.03, 0.02), PALETTE.graphite, 0.5).translateY(1.55).translateZ(0.055));

  // 竖向细刻度：概念上的延迟标尺。
  const ticks: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (let step = 0; step <= 22; step += 1) {
    const y = 0.56 + step * 0.09;
    const major = step % 5 === 0;
    ticks.push([
      [-0.42, y, 0.086],
      [-0.42 + (major ? 0.15 : 0.08), y, 0.086],
    ]);
  }
  ticks.push([
    [-0.42, 0.56, 0.086],
    [-0.42, 2.54, 0.086],
  ]);
  node.add(createLineSegments(ticks, PALETTE.graphite, 0.55));

  const needle = new Group();
  needle.position.set(-0.26, 0.66, 0.1);
  const needleBlade = new Mesh(
    roundedBox(0.52, 0.03, 0.02, 0.008),
    new MeshBasicMaterial({ color: new Color(PALETTE.graphite), toneMapped: false }),
  );
  needleBlade.position.x = 0.26;
  needle.add(needleBlade);
  needle.add(new Mesh(new SphereGeometry(0.05, 12, 10), darkSteel()));
  node.add(needle);
  ctx.handles.ttftNeedle = needle;

  // tokens-per-second 柱状读数。
  const bar = new Mesh(
    roundedBox(0.1, 1, 0.02, 0.01),
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
  );
  bar.position.set(0.33, 0.62 + 0.6, 0.1);
  bar.scale.y = 1.2;
  node.add(bar);
  ctx.handles.ttftBar = bar;

  const ttftLabel = createLabel('TTFT', {
    sub: `${SIMULATED.ttftMs} ms · SIMULATED`,
    height: 0.18,
    mono: true,
  });
  ttftLabel.position.set(0, 2.95, 0.09);
  node.add(ttftLabel);

  const speedLabel = createLabel('TOKENS / S', {
    sub: `${SIMULATED.decodeTokPerSec} · SIMULATED`,
    height: 0.15,
    mono: true,
    subColor: PALETTE.muted,
  });
  speedLabel.position.set(0.05, 2.62, 0.09);
  node.add(speedLabel);

  node.userData.infoId = 'ttft';
  ctx.pickables.push(node);
  ctx.group.add(node);

  ctx.supports.push({ position: [TTFT_X, 0.55, -2.28], scale: [0.1, 1.1, 0.1] });
};

const buildClientAperture = (ctx: StreamBuildContext): void => {
  const node = new Group();
  node.position.set(CLIENT_X, 0, 0);

  const frame = new InstancedMesh(
    ctx.unitBox,
    darkGraphite(),
    4,
  );
  setInstanceMatrix(frame, 0, [0, 2.75, -1.55], [0.12, 2.7, 0.12]);
  setInstanceMatrix(frame, 1, [0, 2.75, 1.55], [0.12, 2.7, 0.12]);
  setInstanceMatrix(frame, 2, [0, 4.1, 0], [0.12, 0.12, 3.2]);
  setInstanceMatrix(frame, 3, [0, 1.4, 0], [0.12, 0.12, 3.2]);
  frame.instanceMatrix.needsUpdate = true;
  frame.castShadow = true;
  node.add(frame);

  const screenTexture = makeCanvasTexture(640, 448, () => {
    /* 首帧 update 会按可见 Token 数重绘。 */
  });
  const screenCanvas = screenTexture.image as HTMLCanvasElement;
  paintClientScreen(screenCanvas, 0);
  screenTexture.needsUpdate = true;
  const screen = new Mesh(
    new PlaneGeometry(3.0, 2.1),
    new MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  );
  screen.rotation.y = Math.PI / 2;
  screen.position.set(0.07, 2.75, 0);
  node.add(screen);
  ctx.handles.screenCanvas = screenCanvas;
  ctx.handles.screenTexture = screenTexture;

  // 屏幕边框上的细密刻度。
  const bezel: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (let y = 1.5; y <= 4.0; y += 0.16) {
    bezel.push([
      [0.08, y, -1.46],
      [0.08, y, -1.34],
    ]);
    bezel.push([
      [0.08, y, 1.34],
      [0.08, y, 1.46],
    ]);
  }
  node.add(createLineSegments(bezel, PALETTE.graphite, 0.4));

  // 返回轨道的接收口。
  const port = new Mesh(roundedBox(0.7, 0.56, 0.7, 0.06), darkGraphite());
  port.position.set(-0.55, RAIL_Y, 0);
  port.castShadow = true;
  node.add(port);
  const portRingMaterial = new MeshBasicMaterial({
    color: new Color(PALETTE.teal),
    transparent: true,
    opacity: 0.55,
    toneMapped: false,
  });
  const portRing = new Mesh(new TorusGeometry(0.42, 0.024, 6, 40), portRingMaterial);
  portRing.rotation.y = Math.PI / 2;
  portRing.position.set(-0.24, RAIL_Y, 0);
  node.add(portRing);
  ctx.handles.portRingMaterial = portRingMaterial;

  const label = createLabel(NODE_INFO['client-screen']?.en ?? 'CLIENT', {
    sub: NODE_INFO['client-screen']?.name,
    height: 0.2,
    mono: true,
  });
  label.position.set(0, 4.34, 0);
  node.add(label);
  ctx.handles.clientLabel = label;

  ctx.group.add(node);

  ctx.supports.push({ position: [CLIENT_X, 0.7, -1.35], scale: [0.11, 1.4, 0.11] });
  ctx.supports.push({ position: [CLIENT_X, 0.7, 1.35], scale: [0.11, 1.4, 0.11] });

  // 文本从最后一个 Chunk 收束进窗口。
  const ribbons: Array<[Vec3Tuple, Vec3Tuple]> = [];
  const paths: Vec3Tuple[][] = [
    [
      [TOKEN_X1 - 0.1, 1.2, -0.12],
      [-5.0, 1.34, -0.1],
      [-8.4, 1.9, -0.06],
      [CLIENT_X + 0.12, 2.2, -0.02],
    ],
    [
      [TOKEN_X1 - 0.1, 1.12, 0.14],
      [-5.0, 1.22, 0.12],
      [-8.4, 1.72, 0.08],
      [CLIENT_X + 0.12, 2.0, 0.02],
    ],
  ];
  for (const path of paths) {
    for (let index = 0; index < path.length - 1; index += 1) {
      ribbons.push([path[index], path[index + 1]]);
    }
  }
  ctx.group.add(createLineSegments(ribbons, PALETTE.orange, 0.5));

  // 客户端方向上的延迟标尺：把最后一段回程也读成仪器。
  const latency: Array<[Vec3Tuple, Vec3Tuple]> = [
    [
      [-3.4, 2.3, 0.12],
      [-10.6, 2.3, 0.12],
    ],
  ];
  for (let index = 0; index <= 24; index += 1) {
    const x = -3.4 - (index / 24) * 7.2;
    const major = index % 4 === 0;
    latency.push([
      [x, 2.3, 0.12],
      [x, 2.3 - (major ? 0.16 : 0.09), 0.12],
    ]);
  }
  ctx.group.add(createLineSegments(latency, PALETTE.graphite, 0.4));

  const marker = new Mesh(
    roundedBox(0.1, 0.1, 0.1, 0.02),
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
  );
  marker.position.set(-3.4, 2.3, 0.12);
  ctx.group.add(marker);
  ctx.handles.latencyMarker = marker;
};

const buildFlow = (ctx: StreamBuildContext): void => {
  const contentCurve = curveFromPoints([
    new Vector3(RAIL_X_MODEL - 0.3, RAIL_Y + 0.03, 0.05),
    new Vector3(8.0, RAIL_Y - 0.02, -0.03),
    new Vector3(1.0, RAIL_Y + 0.02, 0.03),
    new Vector3(-6.0, RAIL_Y - 0.02, -0.03),
    new Vector3(RAIL_X_CLIENT + 0.6, RAIL_Y, 0.02),
  ]);
  const flow = createFlowParticles(contentCurve, {
    count: Math.round((ctx.quality.isMobile ? 48 : 104) * ctx.detail),
    color: PALETTE.orange,
    size: 0.075,
    speed: 0.1,
    opacity: 0.85,
    jitter: 0.1,
    additive: true,
    phase: 0.15,
  });
  ctx.group.add(flow.object);
  ctx.handles.flow = flow;

  const protocolCurve = curveFromPoints([
    new Vector3(MAST_X - 0.4, EVENT_RAIL_Y, 0.04),
    new Vector3(4.0, EVENT_RAIL_Y + 0.02, -0.03),
    new Vector3(TOKEN_X1, EVENT_RAIL_Y, 0.02),
  ]);
  const protocolFlow = createFlowParticles(protocolCurve, {
    count: Math.round((ctx.quality.isMobile ? 26 : 54) * ctx.detail),
    color: PALETTE.teal,
    size: 0.06,
    speed: 0.075,
    opacity: 0.8,
    jitter: 0.06,
    additive: true,
    phase: 0.4,
  });
  ctx.group.add(protocolFlow.object);
  ctx.handles.protocolFlow = protocolFlow;

  const dust = createDustField({
    count: Math.round((ctx.quality.isMobile ? 32 : 76) * ctx.detail),
    area: [27, 7.5, 11],
    center: new Vector3(0.6, 3.6, 2.0),
    color: PALETTE.graphiteSoft,
    size: 0.03,
    opacity: 0.22,
    drift: ctx.quality.reducedMotion ? 0.02 : 0.09,
  });
  ctx.group.add(dust.object);
  ctx.handles.dust = dust;
};

const buildSupports = (ctx: StreamBuildContext): void => {
  if (ctx.supports.length === 0) return;
  const supports = new InstancedMesh(
    ctx.unitBox,
    graphiteMaterial({ color: '#1c1d1b', roughness: 0.46, metalness: 0.45 }),
    ctx.supports.length,
  );
  ctx.supports.forEach((spec, index) => {
    setInstanceMatrix(supports, index, spec.position, spec.scale, spec.rotation);
  });
  supports.instanceMatrix.needsUpdate = true;
  supports.castShadow = true;
  ctx.group.add(supports);
};

/** 装配整个第 08 章场景，并把每帧需要改写的句柄交出去。 */
export function buildStream(quality: QualityInfo): BuiltStream {
  const ctx: StreamBuildContext = {
    group: new Group(),
    pickables: [],
    supports: [],
    quality,
    detail: quality.isMobile ? 0.55 : Math.max(0.6, Math.min(1, quality.nodeScale)),
    unitBox: new BoxGeometry(1, 1, 1),
    handles: {} as StreamHandles,
  };
  ctx.handles.eventMarkers = [];
  ctx.handles.chunkLabels = [];

  buildDatum(ctx);
  buildReturnRail(ctx);
  buildDetokenizer(ctx);
  buildSseMast(ctx);
  buildEventRuler(ctx);
  buildChunkField(ctx);
  buildTtftGauge(ctx);
  buildClientAperture(ctx);
  buildFlow(ctx);
  buildSupports(ctx);

  return {
    group: ctx.group,
    pickables: ctx.pickables,
    handles: ctx.handles,
    supports: ctx.supports,
  };
}
