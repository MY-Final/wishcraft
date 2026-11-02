/**
 * 网关类站点：DNS 环、TLS 编织隧道、API 网关门架、身份认证夹爪、限流光圈。
 *
 * 视觉语言：暗石墨主体 + 钢色关节 + 少量橙/青信号。玻璃只作为薄罩，
 * 靠描边和内部机构立住轮廓，避免纸白背景上的浅灰大块。
 * 标签只保留 DNS 与 API GATEWAY（其余节点点击后由 UI 说明）。
 */
import {
  Color,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { PALETTE } from '../../kit/palette';
import { accentMaterial, glassMaterial, graphiteMaterial, steelMaterial } from '../../kit/materials';
import { curveFromPoints, roundedBox, tubeAlong } from '../../kit/geometry';
import { NODE_X, RAIL_Y } from './networkLayout';
import type { NetworkBuildContext } from './networkLayout';
import {
  createEdgeOverlay,
  createLineSegments,
  createNodeLabel,
  createRadialTicks,
  setInstanceMatrix,
  type Vec3Tuple,
} from './transitSupport';

const darkGraphite = (): ReturnType<typeof graphiteMaterial> =>
  graphiteMaterial({ color: '#191a18', roughness: 0.44, metalness: 0.52 });
const darkSteel = (): ReturnType<typeof steelMaterial> =>
  steelMaterial({ color: '#5d5f5a', roughness: 0.32 });
const clearGlass = (opacity: number): ReturnType<typeof glassMaterial> =>
  glassMaterial({ color: '#e8f0ed', opacity, roughness: 0.06 });

/** 一条绕轴线缠绕的螺旋管：TLS 编织层的几何单元。 */
const helixMesh = (phase: number, material: Material): Mesh => {
  const points: Vector3[] = [];
  const samples = 96;
  const turns = 2.3;
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const angle = phase + t * Math.PI * 2 * turns;
    points.push(new Vector3(-1.22 + t * 2.44, Math.cos(angle) * 0.45, Math.sin(angle) * 0.45));
  }
  return tubeAlong(curveFromPoints(points), 0.035, material, 120, 5);
};

export function buildDnsStation(ctx: NetworkBuildContext): void {
  const node = new Group();
  node.position.set(NODE_X.dns, 0, 0);

  const outer = new Mesh(new TorusGeometry(1.0, 0.062, 8, 60), darkGraphite());
  outer.rotation.y = Math.PI / 2;
  outer.position.y = RAIL_Y;
  outer.castShadow = true;
  node.add(outer);

  const inner = new Mesh(new TorusGeometry(0.66, 0.04, 8, 44), darkSteel());
  inner.rotation.y = Math.PI / 2;
  inner.position.set(0.1, RAIL_Y, 0);
  node.add(inner);

  // 十字支架：让环读成一台解析仪，而不是孤立的圆。
  const spokes = new InstancedMesh(ctx.unitBox, darkSteel(), 2);
  setInstanceMatrix(spokes, 0, [0.1, RAIL_Y, 0], [0.05, 1.94, 0.05]);
  setInstanceMatrix(spokes, 1, [0.1, RAIL_Y, 0], [0.05, 1.94, 0.05], [Math.PI / 2, 0, 0]);
  spokes.instanceMatrix.needsUpdate = true;
  node.add(spokes);

  ctx.handles.dnsActiveMaterial = accentMaterial(PALETTE.teal, 1.6);
  ctx.handles.dnsActiveMaterial.opacity = 0.2;
  const active = new Mesh(new TorusGeometry(0.82, 0.02, 6, 48), ctx.handles.dnsActiveMaterial);
  active.rotation.y = Math.PI / 2;
  active.position.y = RAIL_Y;
  node.add(active);

  // 解析环的回转刻度：胶囊经过时明显转起来。
  const spinner = new Group();
  spinner.position.y = RAIL_Y;
  spinner.add(
    createRadialTicks({
      center: [0, 0, 0],
      radius: 0.86,
      length: 0.16,
      count: 24,
      axis: 'x',
      color: PALETTE.graphite,
      opacity: 0.55,
    }),
  );
  node.add(spinner);
  ctx.handles.dnsSpinner = spinner;

  const pedestal = new Mesh(roundedBox(0.46, 0.34, 0.46, 0.03), darkGraphite());
  pedestal.position.set(0, 0.17, 0);
  pedestal.castShadow = true;
  node.add(pedestal);
  const column = new Mesh(roundedBox(0.16, 1.0, 0.16, 0.02), darkSteel());
  column.position.set(0, 0.62, 0);
  node.add(column);

  const label = createNodeLabel('dns-hop', 0.26).translateY(RAIL_Y + 1.26);
  node.add(label);
  ctx.handles.labels.push({ sprite: label, x: NODE_X.dns });

  node.userData.infoId = 'dns-hop';
  ctx.pickables.push(node);
  ctx.group.add(node);

  ctx.supports.push({ position: [NODE_X.dns, 0.55, -1.35], scale: [0.08, 1.1, 0.08] });
  ctx.supports.push({ position: [NODE_X.dns, 1.0, -0.9], scale: [0.06, 0.06, 0.9] });
}

export function buildTlsStation(ctx: NetworkBuildContext): void {
  const node = new Group();
  node.position.set(NODE_X.tls, 0, 0);

  const tubeMaterial = clearGlass(0.07);
  const tube = new Mesh(new CylinderGeometry(0.6, 0.6, 2.5, 28, 1, true), tubeMaterial);
  tube.rotation.z = Math.PI / 2;
  tube.position.y = RAIL_Y;
  node.add(tube);
  node.add(createEdgeOverlay(tube.geometry, PALETTE.graphite, 0.3));
  ctx.handles.tlsTubeMaterial = tubeMaterial;

  // 两条反相的螺旋缠绕成 TLS 编织层。
  const helixMaterial = new MeshBasicMaterial({
    color: new Color(PALETTE.teal),
    transparent: true,
    opacity: 0.85,
    toneMapped: false,
  });
  const graphiteHelix = new MeshBasicMaterial({
    color: new Color(PALETTE.graphite),
    transparent: true,
    opacity: 0.6,
    toneMapped: false,
  });
  const helixGroup = new Group();
  helixGroup.position.y = RAIL_Y;
  helixGroup.add(helixMesh(0, helixMaterial), helixMesh(Math.PI, graphiteHelix));
  node.add(helixGroup);
  ctx.handles.tlsHelixGroup = helixGroup;
  ctx.handles.tlsHelixMaterial = helixMaterial;

  const collars = new InstancedMesh(
    new TorusGeometry(0.72, 0.05, 8, 40),
    darkGraphite(),
    3,
  );
  [-1.2, 0, 1.2].forEach((offset, index) => {
    setInstanceMatrix(collars, index, [offset, RAIL_Y, 0], [1, 1, 1], [0, Math.PI / 2, 0]);
  });
  collars.instanceMatrix.needsUpdate = true;
  node.add(collars);

  // 三根纵向龙骨：把玻璃罩读成一段机架。
  const struts = new InstancedMesh(ctx.unitBox, darkSteel(), 3);
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2 + Math.PI / 6;
    setInstanceMatrix(
      struts,
      index,
      [0, RAIL_Y + Math.cos(angle) * 0.72, Math.sin(angle) * 0.72],
      [2.4, 0.045, 0.045],
    );
  }
  struts.instanceMatrix.needsUpdate = true;
  node.add(struts);

  node.userData.infoId = 'https-tunnel';
  ctx.pickables.push(node);
  ctx.group.add(node);

  ctx.supports.push({ position: [NODE_X.tls, 0.5, -1.18], scale: [0.08, 1.0, 0.08] });
  ctx.supports.push({ position: [NODE_X.tls, 0.86, -0.94], scale: [0.055, 0.055, 0.52] });
  ctx.supports.push({ position: [NODE_X.tls, 0.5, 1.18], scale: [0.08, 1.0, 0.08] });
  ctx.supports.push({ position: [NODE_X.tls, 0.86, 0.94], scale: [0.055, 0.055, 0.52] });
}

export function buildGatewayStation(ctx: NetworkBuildContext): void {
  const node = new Group();

  const pillars = new InstancedMesh(ctx.unitBox, darkGraphite(), 2);
  setInstanceMatrix(pillars, 0, [0, 1.5, -2.25], [0.18, 3.0, 0.18]);
  setInstanceMatrix(pillars, 1, [0, 1.5, 2.25], [0.18, 3.0, 0.18]);
  pillars.instanceMatrix.needsUpdate = true;
  pillars.castShadow = true;
  node.add(pillars);

  const feet = new InstancedMesh(ctx.unitBox, darkGraphite(), 2);
  setInstanceMatrix(feet, 0, [0, 0.09, -2.25], [0.5, 0.18, 0.5]);
  setInstanceMatrix(feet, 1, [0, 0.09, 2.25], [0.5, 0.18, 0.5]);
  feet.instanceMatrix.needsUpdate = true;
  node.add(feet);

  const topBeam = new Mesh(roundedBox(0.36, 0.26, 4.95, 0.03), darkGraphite());
  topBeam.position.y = 2.96;
  topBeam.castShadow = true;
  node.add(topBeam);

  const subBeam = new Mesh(roundedBox(0.16, 0.07, 4.1, 0.02), darkSteel());
  subBeam.position.y = 2.67;
  node.add(subBeam);

  // 悬挂的暗色刀片：门架内部的检查隔板。
  const blades = new InstancedMesh(ctx.unitBox, darkGraphite(), 5);
  for (let index = 0; index < 5; index += 1) {
    setInstanceMatrix(blades, index, [0, 2.32, -1.5 + index * 0.75], [0.46, 0.62, 0.035]);
  }
  blades.instanceMatrix.needsUpdate = true;
  node.add(blades);

  // 青色门洞轮廓：不用实心玻璃面挡视线。
  const portal: Array<[Vec3Tuple, Vec3Tuple]> = [
    [
      [0, 0.2, -1.95],
      [0, 2.78, -1.95],
    ],
    [
      [0, 2.78, -1.95],
      [0, 2.78, 1.95],
    ],
    [
      [0, 2.78, 1.95],
      [0, 0.2, 1.95],
    ],
    [
      [0, 0.2, 1.95],
      [0, 0.2, -1.95],
    ],
  ];
  node.add(createLineSegments(portal, PALETTE.teal, 0.55));

  // 扫描面：胶囊穿过门架时从上到下走一遍。
  const scanMaterial = new MeshBasicMaterial({
    color: new Color(PALETTE.tealLight),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
  const scan = new Mesh(new PlaneGeometry(3.9, 0.4), scanMaterial);
  scan.rotation.y = Math.PI / 2;
  scan.position.y = 2.4;
  scan.renderOrder = 3;
  scan.visible = false;
  node.add(scan);
  ctx.handles.gatewayScan = scan;
  ctx.handles.gatewayScanMaterial = scanMaterial;

  // 端口灯阵：读请求时的顺序脉冲。
  const ledCount = ctx.quality.isMobile ? 8 : 12;
  const leds = new InstancedMesh(
    ctx.unitBox,
    new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    ledCount,
  );
  for (let index = 0; index < ledCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    setInstanceMatrix(leds, index, [0, 0.55 + row * 0.36, side * 2.1], [0.06, 0.12, 0.03]);
    leds.setColorAt(index, new Color(PALETTE.orange));
  }
  leds.instanceMatrix.needsUpdate = true;
  if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
  node.add(leds);
  ctx.handles.gatewayLeds = leds;
  ctx.handles.gatewayLedCount = ledCount;

  const label = createNodeLabel('api-gateway', 0.3).translateY(3.5);
  node.add(label);
  ctx.handles.labels.push({ sprite: label, x: NODE_X.gateway });

  node.userData.infoId = 'api-gateway';
  ctx.pickables.push(node);
  ctx.group.add(node);

  ctx.supports.push({ position: [0, 0.055, -2.25], scale: [0.56, 0.11, 0.56] });
  ctx.supports.push({ position: [0, 0.055, 2.25], scale: [0.56, 0.11, 0.56] });

  // 门架顶部的两个空插座：这一层不一定存在。
  ctx.ports.push({ position: [-0.72, 3.1, 0], rotation: [-Math.PI / 2, 0, 0] });
  ctx.ports.push({ position: [0.72, 3.1, 0], rotation: [-Math.PI / 2, 0, 0] });
}

export function buildAuthStation(ctx: NetworkBuildContext): void {
  const node = new Group();
  node.position.set(NODE_X.auth, 0, 0);

  const jaws: Group[] = [];
  for (const side of [-1, 1]) {
    const jaw = new Group();
    jaw.position.set(0, RAIL_Y, side);
    const plate = new Mesh(roundedBox(0.44, 1.15, 0.14, 0.03), darkGraphite());
    plate.castShadow = true;
    jaw.add(plate);
    const pad = new Mesh(roundedBox(0.26, 0.46, 0.06, 0.02), darkSteel());
    pad.position.z = -side * 0.09;
    jaw.add(pad);
    const stripe = new Mesh(
      roundedBox(0.05, 0.86, 0.02, 0.008),
      new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
    );
    stripe.position.set(0, 0, -side * 0.08);
    jaw.add(stripe);
    const outerStripe = new Mesh(
      roundedBox(0.05, 0.86, 0.015, 0.006),
      new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
    );
    outerStripe.position.set(0.13, 0, side * 0.082);
    jaw.add(outerStripe);
    const hinge = new Mesh(new CylinderGeometry(0.05, 0.05, 0.46, 10, 1), darkSteel());
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0, 0.62, 0);
    jaw.add(hinge);
    node.add(jaw);
    jaws.push(jaw);
  }
  ctx.handles.authJaws = jaws;

  const actuator = new Mesh(roundedBox(0.86, 0.28, 0.46, 0.04), darkGraphite());
  actuator.position.set(0, 2.18, 0);
  actuator.castShadow = true;
  node.add(actuator);

  const indicatorMaterial = accentMaterial(PALETTE.orange, 1.8);
  indicatorMaterial.opacity = 0.14;
  const indicator = new Mesh(roundedBox(0.12, 0.08, 0.12, 0.02), indicatorMaterial);
  indicator.position.set(0, 2.38, 0);
  node.add(indicator);
  ctx.handles.authIndicatorMaterial = indicatorMaterial;

  node.userData.infoId = 'auth-check';
  ctx.pickables.push(node);
  ctx.group.add(node);

  ctx.supports.push({ position: [NODE_X.auth, 1.92, -1.0], scale: [0.06, 0.52, 0.06] });
  ctx.supports.push({ position: [NODE_X.auth, 1.92, 1.0], scale: [0.06, 0.52, 0.06] });
  ctx.supports.push({ position: [NODE_X.auth, 2.32, 0], scale: [0.06, 0.06, 2.2] });
}

export function buildRateStation(ctx: NetworkBuildContext): void {
  const node = new Group();
  node.position.set(NODE_X.rate, 0, 0);

  const ring = new Mesh(new TorusGeometry(1.02, 0.07, 8, 60), darkGraphite());
  ring.rotation.y = Math.PI / 2;
  ring.position.y = RAIL_Y;
  ring.castShadow = true;
  node.add(ring);

  const ringMaterial = new MeshBasicMaterial({
    color: new Color(PALETTE.teal),
    transparent: true,
    opacity: 0.55,
    toneMapped: false,
  });
  const innerRing = new Mesh(new TorusGeometry(0.84, 0.018, 6, 48), ringMaterial);
  innerRing.rotation.y = Math.PI / 2;
  innerRing.position.y = RAIL_Y;
  node.add(innerRing);
  ctx.handles.rateRingMaterial = ringMaterial;

  // 光圈：12 片暗色快门叶片在胶囊靠近时收拢。
  const irisCount = ctx.quality.isMobile ? 9 : 12;
  const iris = new InstancedMesh(ctx.unitBox, darkGraphite(), irisCount);
  iris.instanceMatrix.setUsage(DynamicDrawUsage);
  node.add(iris);
  ctx.handles.rateIris = iris;
  ctx.handles.rateIrisCount = irisCount;

  // 配额鼓：刻着长窗口额度的滚动计数筒。
  const drum = new Group();
  drum.position.set(0, 0.64, -1.8);
  const drumShell = new Mesh(
    new CylinderGeometry(0.28, 0.28, 0.44, 20, 1),
    darkGraphite(),
  );
  drumShell.rotation.x = Math.PI / 2;
  drumShell.castShadow = true;
  drum.add(drumShell);
  const drumTicks = new InstancedMesh(
    ctx.unitBox,
    new MeshBasicMaterial({ color: new Color(PALETTE.orange), toneMapped: false }),
    14,
  );
  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    setInstanceMatrix(
      drumTicks,
      index,
      [Math.cos(angle) * 0.295, Math.sin(angle) * 0.295, 0.235],
      [0.014, 0.09, 0.014],
      [0, 0, angle],
    );
  }
  drumTicks.instanceMatrix.needsUpdate = true;
  drum.add(drumTicks);
  node.add(drum);
  ctx.handles.rateDrum = drum;

  node.userData.infoId = 'rate-limit';
  ctx.pickables.push(node);
  ctx.group.add(node);

  ctx.supports.push({ position: [NODE_X.rate, 0.32, -1.8], scale: [0.09, 0.64, 0.09] });
  ctx.supports.push({ position: [NODE_X.rate, 0.64, -1.38], scale: [0.05, 0.05, 0.86] });
  ctx.ports.push({ position: [NODE_X.rate, RAIL_Y + 1.06, 0], rotation: [-Math.PI / 2, 0, 0] });
}
