/**
 * 网络场景的整体装配：量规底板、返回轨道、请求胶囊，以及计算侧结构
 * （模型路由、排队调度、GPU 集群）。网关类站点在 networkStations.ts。
 *
 * 对比策略：暗石墨结构 + 钢色关节 + 橙色数据 + 青色协议线；
 * 玻璃只做薄罩，主要靠描边和高光轮廓。
 */
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { PALETTE } from '../../kit/palette';
import { glassMaterial, graphiteMaterial, steelMaterial } from '../../kit/materials';
import { curveFromPoints, roundedBox, tickStrip } from '../../kit/geometry';
import { createDustField, createFlowParticles } from '../../kit/particles';
import { ENDPOINT } from '../../../data/request';
import type { QualityInfo } from '../../types';
import {
  CAPSULE_X0,
  ENTRY_X,
  NODE_X,
  RAIL_X0,
  RAIL_X1,
  RAIL_Y,
} from './networkLayout';
import type {
  BuiltNetwork,
  NetworkBuildContext,
  NetworkHandles,
  PortSpec,
} from './networkLayout';
import {
  buildAuthStation,
  buildDnsStation,
  buildGatewayStation,
  buildRateStation,
  buildTlsStation,
} from './networkStations';
import {
  createEdgeOverlay,
  createGlowSprite,
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

const buildDatum = (ctx: NetworkBuildContext): void => {
  const segments: Array<[Vec3Tuple, Vec3Tuple]> = [];

  // 地面量规网格：比结构更淡，但要在白纸上可见。
  for (let z = -5; z <= 5; z += 1.7) {
    segments.push([
      [-14.6, 0.004, z],
      [14.6, 0.004, z],
    ]);
  }
  for (let x = -14; x <= 14; x += 2.4) {
    segments.push([
      [x, 0.004, -5.6],
      [x, 0.004, 5.6],
    ]);
  }
  ctx.group.add(createLineSegments(segments, PALETTE.graphiteSoft, 0.22));

  // 轨道下方的刻度尺。
  ctx.group.add(
    tickStrip(RAIL_X1 - RAIL_X0, 96, {
      axis: 'x',
      tickSize: 0.05,
      majorEvery: 8,
      opacity: 0.3,
      origin: new Vector3(0, 0.012, 1.45),
    }),
  );

  // 高处测量梁：与吊线一起把链路框成一张仪器图。
  const beam: Array<[Vec3Tuple, Vec3Tuple]> = [
    [
      [-10.4, 4.35, 0],
      [13.4, 4.35, 0],
    ],
  ];
  for (const key of Object.keys(NODE_X) as Array<keyof typeof NODE_X>) {
    const x = NODE_X[key];
    beam.push([
      [x, 4.35, 0],
      [x, 3.3, 0],
    ]);
    beam.push([
      [x - 0.16, 3.3, 0],
      [x + 0.16, 3.3, 0],
    ]);
  }
  ctx.group.add(createLineSegments(beam, PALETTE.graphite, 0.3));

  // 后排细立柱：给上半画面一层仪器骨架（无横臂，避免读成路灯）。
  for (const x of [-11.4, -6.2, -2.4, 2.6, 6.0, 9.2, 13.2]) {
    ctx.supports.push({ position: [x, 2.1, -2.5], scale: [0.055, 4.2, 0.055] });
    ctx.supports.push({ position: [x, 0.02, -2.5], scale: [0.22, 0.04, 0.22] });
    ctx.supports.push({ position: [x, 3.32, -2.5], scale: [0.2, 0.035, 0.2] });
  }
};

const buildRail = (ctx: NetworkBuildContext): void => {
  const length = RAIL_X1 - RAIL_X0;
  const rail = new Mesh(
    new CylinderGeometry(0.03, 0.03, length, 8, 1),
    darkSteel(),
  );
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, RAIL_Y, 0);
  ctx.group.add(rail);

  const tray = new Mesh(roundedBox(length, 0.06, 0.36, 0.02), darkGraphite());
  tray.position.set(0, RAIL_Y - 0.34, 0);
  ctx.group.add(tray);

  for (let x = RAIL_X0 + 0.6; x <= RAIL_X1 - 0.4; x += 3.1) {
    ctx.supports.push({ position: [x, RAIL_Y / 2, 0], scale: [0.06, RAIL_Y - 0.32, 0.06] });
    ctx.supports.push({ position: [x, 0.02, 0], scale: [0.28, 0.04, 0.28] });
  }

  // 入口门框：方形量规 + 发车台。
  const frame = new InstancedMesh(ctx.unitBox, darkGraphite(), 4);
  setInstanceMatrix(frame, 0, [ENTRY_X, 1.12, -0.95], [0.1, 1.86, 0.1]);
  setInstanceMatrix(frame, 1, [ENTRY_X, 1.12, 0.95], [0.1, 1.86, 0.1]);
  setInstanceMatrix(frame, 2, [ENTRY_X, 2.05, 0], [0.1, 0.1, 1.9]);
  setInstanceMatrix(frame, 3, [ENTRY_X, 0.19, 0], [0.1, 0.1, 1.9]);
  frame.instanceMatrix.needsUpdate = true;
  frame.castShadow = true;
  ctx.group.add(frame);

  const pad = new Mesh(roundedBox(1.3, 0.12, 1.3, 0.03), darkGraphite());
  pad.position.set(ENTRY_X + 1.15, 0.06, 0);
  pad.castShadow = true;
  ctx.group.add(pad);

  // 入口端的高刻度柱：给开场一个明确的仪器起点。
  const mast = new Mesh(roundedBox(0.14, 3.4, 0.14, 0.02), darkGraphite());
  mast.position.set(ENTRY_X - 0.55, 1.7, -0.86);
  mast.castShadow = true;
  ctx.group.add(mast);
  ctx.group.add(
    createLineSegments(
      [
        [
          [ENTRY_X - 0.55, 3.38, -0.86],
          [ENTRY_X + 0.15, 3.38, -0.86],
        ],
        [
          [ENTRY_X - 0.55, 2.9, -0.86],
          [ENTRY_X - 0.2, 2.9, -0.86],
        ],
      ],
      PALETTE.teal,
      0.5,
    ),
  );
};

const buildCapsule = (ctx: NetworkBuildContext): void => {
  const capsule = new Group();
  const capsuleShell = roundedBox(1.9, 0.72, 0.72, 0.18);
  const shell = new Mesh(capsuleShell, glassMaterial({ color: '#f0f4f1', opacity: 0.12 }));
  capsule.add(shell);
  capsule.add(createEdgeOverlay(capsuleShell, PALETTE.graphite, 0.65));

  // 亮橙色芯：整章最显眼的数据体。
  const core = new Mesh(
    new CylinderGeometry(0.16, 0.16, 1.44, 14, 1),
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
  );
  core.rotation.z = Math.PI / 2;
  capsule.add(core);

  const rings = new InstancedMesh(
    new TorusGeometry(0.37, 0.035, 8, 32),
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
    3,
  );
  [-0.56, 0, 0.56].forEach((offset, index) => {
    setInstanceMatrix(rings, index, [offset, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0]);
  });
  rings.instanceMatrix.needsUpdate = true;
  capsule.add(rings);

  const collars = new InstancedMesh(
    new TorusGeometry(0.36, 0.055, 8, 24),
    darkGraphite(),
    2,
  );
  [-0.86, 0.86].forEach((offset, index) => {
    setInstanceMatrix(collars, index, [offset, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0]);
  });
  collars.instanceMatrix.needsUpdate = true;
  capsule.add(collars);

  capsule.add(createGlowSprite(PALETTE.orange, 1.7, 0.2));

  const label = createLabel(ENDPOINT, {
    sub: 'HTTPS · APPLICATION/JSON',
    height: 0.22,
    mono: true,
    // 浅纸色标签底：即使胶囊与门架刀片重叠，文字也保持可读。
    background: 'rgba(250, 249, 245, 0.9)',
    border: 'rgba(20, 20, 20, 0.18)',
  });
  label.position.set(0, 0.9, 0.16);
  capsule.add(label);

  // TLS 段才出现的加密套筒：胶囊穿过编织隧道时被「包」起来。
  const sleeveMaterial = glassMaterial({ color: '#d9f0ea', opacity: 0 });
  const sleeve = new Mesh(
    new CylinderGeometry(0.52, 0.52, 1.05, 18, 1, true),
    sleeveMaterial,
  );
  sleeve.rotation.z = Math.PI / 2;
  sleeve.visible = false;
  capsule.add(sleeve);

  capsule.position.set(CAPSULE_X0, RAIL_Y, 0);
  capsule.traverse((child) => {
    if ((child as Mesh).isMesh) child.castShadow = true;
  });
  ctx.group.add(capsule);

  ctx.handles.capsule = capsule;
  ctx.handles.capsuleCore = core;
  ctx.handles.capsuleSleeve = sleeve;
  ctx.handles.capsuleSleeveMaterial = sleeveMaterial;
};

const buildRouter = (ctx: NetworkBuildContext): void => {
  const node = new Group();
  node.position.set(NODE_X.router, 0, 0);

  // 暗色道岔机箱：中间留出胶囊通道。
  const housings = new InstancedMesh(ctx.unitBox, darkGraphite(), 2);
  setInstanceMatrix(housings, 0, [0, RAIL_Y, -0.78], [0.5, 0.62, 0.3]);
  setInstanceMatrix(housings, 1, [0, RAIL_Y, 0.78], [0.5, 0.62, 0.3]);
  housings.instanceMatrix.needsUpdate = true;
  node.add(housings);

  const cap = new Mesh(roundedBox(0.62, 0.14, 1.9, 0.03), darkSteel());
  cap.position.y = RAIL_Y + 0.4;
  cap.castShadow = true;
  node.add(cap);

  // 三条模型池路线；中间那条是本次请求实际选择的路由。
  const laneGeometry = new CylinderGeometry(0.03, 0.03, 1.8, 6, 1);
  const lanes = new InstancedMesh(laneGeometry, darkSteel(), 2);
  setInstanceMatrix(lanes, 0, [0.95, RAIL_Y - 0.44, -1.2], [1, 1, 1], [0, 0, Math.PI / 2]);
  setInstanceMatrix(lanes, 1, [0.95, RAIL_Y - 0.44, 1.2], [1, 1, 1], [0, 0, Math.PI / 2]);
  lanes.instanceMatrix.needsUpdate = true;
  node.add(lanes);

  const laneMaterial = new MeshBasicMaterial({
    color: new Color(PALETTE.orange),
    transparent: true,
    opacity: 0.65,
    toneMapped: false,
  });
  const activeLane = new Mesh(laneGeometry, laneMaterial);
  activeLane.rotation.z = Math.PI / 2;
  activeLane.position.set(0.95, RAIL_Y - 0.44, 0);
  node.add(activeLane);
  ctx.handles.routerLaneMaterial = laneMaterial;

  // 道岔臂：胶囊靠近时摆向中间路由（位于轨道侧上方，不与胶囊相撞）。
  const arm = new Group();
  arm.position.set(0, RAIL_Y + 0.46, 0.72);
  const armBlade = new Mesh(roundedBox(0.62, 0.06, 0.08, 0.02), darkGraphite());
  armBlade.position.x = 0.31;
  arm.add(armBlade);
  const armTip = new Mesh(
    roundedBox(0.12, 0.07, 0.09, 0.02),
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
  );
  armTip.position.x = 0.6;
  arm.add(armTip);
  arm.add(new Mesh(new SphereGeometry(0.07, 12, 10), darkSteel()));
  node.add(arm);
  ctx.handles.routerArm = arm;

  // 写入后的数据珠沿着选中路线滑下去。
  const bead = new Mesh(
    new SphereGeometry(0.08, 12, 10),
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
  );
  bead.visible = false;
  node.add(bead);
  ctx.handles.routerBead = bead;

  node.userData.infoId = 'model-router';
  ctx.pickables.push(node);
  ctx.group.add(node);

  ctx.supports.push({ position: [NODE_X.router, 0.5, 0], scale: [0.08, 1.0, 0.08] });
  ctx.ports.push({ position: [NODE_X.router + 0.95, RAIL_Y - 0.44, -1.2], rotation: [0, 0, 0] });
  ctx.ports.push({ position: [NODE_X.router + 0.95, RAIL_Y - 0.44, 1.2], rotation: [0, 0, 0] });
};

const buildQueue = (ctx: NetworkBuildContext): void => {
  const node = new Group();
  node.position.set(NODE_X.queue, 0, 0);

  const plate = new Mesh(roundedBox(1.9, 0.08, 1.0, 0.02), darkGraphite());
  plate.position.y = 0.16;
  plate.receiveShadow = true;
  node.add(plate);

  // 排队的请求槽：暗色 cassette + 橙色读数条，胶囊靠近时逐个抬起进批。
  const slotCount = ctx.quality.isMobile ? 5 : 7;
  const slots = new InstancedMesh(
    ctx.unitBox,
    darkGraphite(),
    slotCount,
  );
  slots.instanceMatrix.setUsage(DynamicDrawUsage);
  const strips = new InstancedMesh(
    ctx.unitBox,
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
    slotCount,
  );
  strips.instanceMatrix.setUsage(DynamicDrawUsage);
  for (let index = 0; index < slotCount; index += 1) {
    setInstanceMatrix(slots, index, [-0.75 + index * 0.25, 0.34, 0], [0.16, 0.34, 0.62]);
    setInstanceMatrix(strips, index, [-0.75 + index * 0.25, 0.46, 0.28], [0.1, 0.025, 0.02]);
  }
  slots.instanceMatrix.needsUpdate = true;
  strips.instanceMatrix.needsUpdate = true;
  node.add(slots);
  ctx.handles.queueSlots = slots;
  ctx.handles.queueSlotCount = slotCount;

  // 调度头：跟随胶囊在队列上方移动，像读写磁头。
  const head = new Group();
  head.position.set(0, 1.78, 0.5);
  const headBody = new Mesh(roundedBox(0.34, 0.16, 0.44, 0.03), darkGraphite());
  headBody.castShadow = true;
  head.add(headBody);
  const headLamp = new Mesh(
    roundedBox(0.12, 0.05, 0.1, 0.01),
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
  );
  headLamp.position.set(0, -0.09, 0);
  head.add(headLamp);
  const stem = new Mesh(
    roundedBox(0.025, 1.1, 0.025, 0.008),
    new MeshBasicMaterial({ color: new Color(PALETTE.graphite), toneMapped: false }),
  );
  stem.position.set(0, -0.58, 0);
  head.add(stem);
  node.add(head);
  ctx.handles.queueHead = head;

  node.userData.infoId = 'queue-scheduler';
  ctx.pickables.push(node);
  ctx.group.add(node);

  // 队列框架（由全局支撑实例承载）。
  ctx.supports.push({ position: [NODE_X.queue, 0.66, -0.62], scale: [1.86, 0.055, 0.055] });
  ctx.supports.push({ position: [NODE_X.queue, 0.66, 0.62], scale: [1.86, 0.055, 0.055] });
  ctx.supports.push({ position: [NODE_X.queue, 0.2, -0.62], scale: [1.86, 0.055, 0.055] });
  ctx.supports.push({ position: [NODE_X.queue, 0.2, 0.62], scale: [1.86, 0.055, 0.055] });
  for (const x of [-0.93, 0.93]) {
    ctx.supports.push({ position: [NODE_X.queue + x, 0.44, -0.62], scale: [0.055, 0.5, 0.055] });
    ctx.supports.push({ position: [NODE_X.queue + x, 0.44, 0.62], scale: [0.055, 0.5, 0.055] });
  }
};

const buildCluster = (ctx: NetworkBuildContext): void => {
  const node = new Group();
  node.position.set(NODE_X.cluster, 0, 0);

  const plinth = new Mesh(roundedBox(3.3, 0.22, 3.5, 0.04), darkGraphite());
  plinth.position.y = 0.11;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  node.add(plinth);

  const bed = new Mesh(roundedBox(2.9, 0.05, 3.1, 0.02), darkSteel());
  bed.position.y = 0.235;
  node.add(bed);

  // 两列机架托盘夹出一条通道，胶囊最终停在里面。
  const trays = new InstancedMesh(
    ctx.unitBox,
    graphiteMaterial({ color: '#222320', roughness: 0.4, metalness: 0.6 }),
    6,
  );
  const bars = new InstancedMesh(
    ctx.unitBox,
    new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    6,
  );
  bars.instanceMatrix.setUsage(DynamicDrawUsage);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) {
      const index = (side === 1 ? 0 : 1) * 3 + row;
      setInstanceMatrix(trays, index, [0, 0.64 + row * 0.4, side * 1.25], [1.7, 0.16, 0.85]);
      setInstanceMatrix(bars, index, [0, 0.64 + row * 0.4, side * 0.78], [1.5, 0.05, 0.03]);
      bars.setColorAt(index, new Color(PALETTE.orange));
    }
  }
  trays.instanceMatrix.needsUpdate = true;
  bars.instanceMatrix.needsUpdate = true;
  if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
  trays.castShadow = true;
  node.add(trays, bars);
  ctx.handles.clusterBars = bars;
  ctx.handles.clusterBarCount = 6;

  // 舱体朝观众一侧的橙色状态条：让集群在侧视角也有明确的数据面。
  const faceStrips = new InstancedMesh(
    ctx.unitBox,
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
    5,
  );
  for (let row = 0; row < 3; row += 1) {
    setInstanceMatrix(faceStrips, row, [0, 0.64 + row * 0.4, 1.69], [1.36, 0.05, 0.02]);
  }
  setInstanceMatrix(faceStrips, 3, [1.23, 1.15, 1.3], [0.02, 1.1, 0.03]);
  setInstanceMatrix(faceStrips, 4, [1.23, 1.15, -1.3], [0.02, 1.1, 0.03]);
  faceStrips.instanceMatrix.needsUpdate = true;
  node.add(faceStrips);

  // 背板与细线栅格：集群的“总线”。
  const backplane = new Mesh(roundedBox(0.14, 2.4, 3.2, 0.03), darkGraphite());
  backplane.position.set(1.15, 1.35, 0);
  backplane.castShadow = true;
  node.add(backplane);

  const grid: Array<[Vec3Tuple, Vec3Tuple]> = [];
  for (let y = 0.4; y <= 2.4; y += 0.28) {
    grid.push([
      [1.07, y, -1.45],
      [1.07, y, 1.45],
    ]);
  }
  for (let z = -1.4; z <= 1.4; z += 0.35) {
    grid.push([
      [1.07, 0.3, z],
      [1.07, 2.3, z],
    ]);
  }
  node.add(createLineSegments(grid, PALETTE.teal, 0.26));

  // 顶部的计算笼架与状态环。
  const cage: Array<[Vec3Tuple, Vec3Tuple]> = [];
  const corners: Vec3Tuple[] = [
    [-1.05, 3.5, -1.7],
    [1.25, 3.5, -1.7],
    [1.25, 3.5, 1.7],
    [-1.05, 3.5, 1.7],
  ];
  for (let index = 0; index < corners.length; index += 1) {
    cage.push([corners[index], corners[(index + 1) % corners.length]]);
    cage.push([
      [corners[index][0], 3.5, corners[index][2]],
      [corners[index][0], 0.26, corners[index][2]],
    ]);
  }
  cage.push([corners[0], corners[2]]);
  cage.push([corners[1], corners[3]]);
  node.add(createLineSegments(cage, PALETTE.graphite, 0.3));

  const haloMaterial = new MeshBasicMaterial({
    color: new Color(PALETTE.teal),
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    toneMapped: false,
  });
  const halo = new Mesh(new TorusGeometry(1.95, 0.016, 6, 72), haloMaterial);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 3.52;
  node.add(halo);
  ctx.handles.clusterHaloMaterial = haloMaterial;

  // 停靠脉冲：胶囊进入通道时向外扩散的一圈。
  const burstMaterial = new MeshBasicMaterial({
    color: new Color(PALETTE.orange),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const burst = new Mesh(new TorusGeometry(0.9, 0.024, 6, 48), burstMaterial);
  burst.rotation.y = Math.PI / 2;
  burst.position.set(-0.2, RAIL_Y, 0);
  burst.visible = false;
  node.add(burst);
  ctx.handles.clusterBurst = burst;
  ctx.handles.clusterBurstMaterial = burstMaterial;

  const label = createNodeLabel('gpu-cluster', 0.3, 'SIMULATED').translateY(4.02).translateX(-1.0);
  node.add(label);
  ctx.handles.labels.push({ sprite: label, x: NODE_X.cluster });

  node.userData.infoId = 'gpu-cluster';
  ctx.pickables.push(node);
  ctx.group.add(node);

  // 通道导轨与笼架支柱。
  for (const z of [-0.7, 0.7]) {
    ctx.supports.push({ position: [NODE_X.cluster, 0.3, z], scale: [2.7, 0.06, 0.07] });
  }
  for (const x of [-1.05, 1.25]) {
    for (const z of [-1.7, 1.7]) {
      ctx.supports.push({ position: [NODE_X.cluster + x, 1.88, z], scale: [0.07, 3.24, 0.07] });
    }
  }
};

/* ------------------------------------------------------------------ *
 * 可选层的视觉暗示：旁路线 + 空插座
 * ------------------------------------------------------------------ */

const buildBypass = (ctx: NetworkBuildContext): void => {
  const polyline = (points: Vec3Tuple[]): Array<[Vec3Tuple, Vec3Tuple]> => {
    const segments: Array<[Vec3Tuple, Vec3Tuple]> = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      segments.push([points[index], points[index + 1]]);
    }
    return segments;
  };

  const bypass: Array<[Vec3Tuple, Vec3Tuple]> = [
    // 门架上方可以绕过去的另一条链路。
    ...polyline([
      [-2.9, RAIL_Y, 0.1],
      [-2.1, 2.1, 0.1],
      [-1.1, 3.4, 0.1],
      [1.1, 3.4, 0.1],
      [2.1, 2.1, 0.1],
      [2.9, RAIL_Y, 0.1],
    ]),
    // 认证/限流的侧向旁路：不同实现可以没有这一层。
    ...polyline([
      [1.6, RAIL_Y - 0.05, 0.2],
      [1.9, RAIL_Y + 0.35, 0.95],
      [3.1, RAIL_Y + 0.35, 0.95],
      [3.4, RAIL_Y - 0.05, 0.2],
    ]),
    ...polyline([
      [3.7, RAIL_Y - 0.05, -0.2],
      [4.0, RAIL_Y + 0.35, -1.05],
      [5.3, RAIL_Y + 0.35, -1.05],
      [5.6, RAIL_Y - 0.05, -0.2],
    ]),
  ];
  ctx.group.add(createLineSegments(bypass, PALETTE.graphite, 0.32));

  ctx.ports.push({ position: [1.6, RAIL_Y - 0.05, 0.2], rotation: [Math.PI / 2, 0, 0] });
  ctx.ports.push({ position: [3.4, RAIL_Y - 0.05, 0.2], rotation: [Math.PI / 2, 0, 0] });
  ctx.ports.push({ position: [3.7, RAIL_Y - 0.05, -0.2], rotation: [Math.PI / 2, 0, 0] });
};

const buildSupports = (ctx: NetworkBuildContext): void => {
  if (ctx.supports.length > 0) {
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
  }

  if (ctx.ports.length > 0) {
    const ports = new InstancedMesh(
      new TorusGeometry(0.08, 0.016, 6, 20),
      new MeshBasicMaterial({ color: new Color(PALETTE.graphiteSoft), transparent: true, opacity: 0.8 }),
      ctx.ports.length,
    );
    ctx.ports.forEach((spec: PortSpec, index) => {
      setInstanceMatrix(ports, index, spec.position, [1, 1, 1], spec.rotation);
    });
    ports.instanceMatrix.needsUpdate = true;
    ctx.group.add(ports);
  }
};

const buildAmbient = (ctx: NetworkBuildContext): {
  flow: ReturnType<typeof createFlowParticles>;
  dust: ReturnType<typeof createDustField>;
} => {
  const curve = curveFromPoints([
    new Vector3(RAIL_X0 + 0.4, RAIL_Y + 0.02, 0.04),
    new Vector3(-6.0, RAIL_Y - 0.02, -0.03),
    new Vector3(0.5, RAIL_Y + 0.03, 0.03),
    new Vector3(6.5, RAIL_Y - 0.02, -0.03),
    new Vector3(RAIL_X1 - 0.2, RAIL_Y + 0.02, 0.02),
  ]);
  const flow = createFlowParticles(curve, {
    count: Math.round((ctx.quality.isMobile ? 46 : 96) * ctx.detail),
    color: PALETTE.orange,
    size: 0.08,
    speed: 0.085,
    opacity: 0.8,
    jitter: 0.1,
    additive: true,
    phase: 0.2,
  });
  ctx.group.add(flow.object);

  const dust = createDustField({
    count: Math.round((ctx.quality.isMobile ? 34 : 78) * ctx.detail),
    area: [30, 7.5, 11],
    center: new Vector3(0.4, 3.4, 2.2),
    color: PALETTE.graphiteSoft,
    size: 0.03,
    opacity: 0.22,
    drift: ctx.quality.reducedMotion ? 0.02 : 0.09,
  });
  ctx.group.add(dust.object);

  return { flow, dust };
};

/** 装配整个第 02 章场景，并把每帧需要改写的句柄交出去。 */
export function buildNetwork(quality: QualityInfo): BuiltNetwork {
  const ctx: NetworkBuildContext = {
    group: new Group(),
    pickables: [],
    supports: [],
    ports: [],
    quality,
    detail: quality.isMobile ? 0.55 : Math.max(0.6, Math.min(1, quality.nodeScale)),
    unitBox: new BoxGeometry(1, 1, 1),
    handles: {} as NetworkHandles,
  };
  ctx.handles.labels = [];

  buildDatum(ctx);
  buildRail(ctx);
  buildCapsule(ctx);
  buildDnsStation(ctx);
  buildTlsStation(ctx);
  buildGatewayStation(ctx);
  buildAuthStation(ctx);
  buildRateStation(ctx);
  buildRouter(ctx);
  buildQueue(ctx);
  buildCluster(ctx);
  buildBypass(ctx);
  buildSupports(ctx);
  const ambient = buildAmbient(ctx);

  return {
    group: ctx.group,
    pickables: ctx.pickables,
    handles: ctx.handles,
    flow: ambient.flow,
    dust: ambient.dust,
    supports: ctx.supports,
  };
}
