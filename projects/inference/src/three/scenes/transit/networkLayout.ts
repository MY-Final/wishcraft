/**
 * NetworkScene 的共享布局与句柄类型。
 *
 * 场景拆成三块：本文件只放坐标常量与类型；networkStations.ts 放网关类站点；
 * networkBuild.ts 负责整体装配。NetworkScene.ts 只保留每帧状态与相机。
 *
 * 构图约定：UI 占据左下章节卡与右上遥测面板，主体应落在画面中右侧
 * （1440×900 下约 x 620–1030）。因此相机注视点始终略偏在主体左侧。
 */
import type {
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  Sprite,
} from 'three';
import type { DustField, FlowParticles } from '../../kit/particles';
import type { BuildContext, CameraKey, SupportSpec, Vec3Tuple } from './transitSupport';
import { clamp01, smootherstep } from './transitSupport';

export const RAIL_Y = 1.08;
export const CAPSULE_X0 = -10.9;
/** 胶囊最终停靠在集群通道中段，避免撞上尾部背板。 */
export const CAPSULE_X1 = 12.2;

/**
 * 胶囊推进：平滑起步，但中段比线性略慢，让 p≈0.5 时胶囊正接近门架，
 * 镜头可以同时框住胶囊与整座 API 网关。
 */
export function capsuleXAt(progress: number): number {
  const eased = Math.pow(smootherstep(clamp01(progress)), 1.35);
  return CAPSULE_X0 + eased * (CAPSULE_X1 - CAPSULE_X0);
}

export const RAIL_X0 = -13.8;
export const RAIL_X1 = 13.8;
export const ENTRY_X = -12.55;

export const NODE_X = {
  dns: -8.6,
  tls: -5.2,
  gateway: 0,
  auth: 2.5,
  rate: 4.6,
  router: 7.0,
  queue: 9.35,
  cluster: 12.1,
} as const;

/** 5 个关键帧：入口 → DNS → 门架 → 计算侧 → 拉远看集群。 */
export const NETWORK_CAMERA_KEYS: readonly CameraKey[] = [
  { at: 0.02, position: [-13.6, 3.0, 9.4], target: [-10.4, 0.9, 0], fov: 40 },
  { at: 0.25, position: [-10.0, 3.0, 9.2], target: [-9.2, 0.9, 0], fov: 38 },
  { at: 0.5, position: [-6.4, 3.0, 9.2], target: [-1.3, 1.1, 0], fov: 38 },
  { at: 0.75, position: [2.0, 3.4, 9.8], target: [7.6, 1.2, 0], fov: 38 },
  { at: 1, position: [3.4, 6.2, 15.0], target: [11.2, 1.5, 0], fov: 44 },
];

/** 节点标签只在镜头靠近时出现，避免小字漂在空场景里。 */
export interface LabelHandle {
  sprite: Sprite;
  x: number;
}

/** 每个站点 / 机构里会被每帧改写的对象与材质。 */
export interface NetworkHandles {
  capsule: Group;
  capsuleCore: Mesh;
  capsuleSleeve: Mesh;
  capsuleSleeveMaterial: MeshPhysicalMaterial;
  dnsSpinner: Group;
  dnsActiveMaterial: MeshBasicMaterial;
  tlsHelixGroup: Group;
  tlsTubeMaterial: MeshPhysicalMaterial;
  tlsHelixMaterial: MeshBasicMaterial;
  gatewayScan: Mesh;
  gatewayScanMaterial: MeshBasicMaterial;
  gatewayLeds: InstancedMesh;
  gatewayLedCount: number;
  authJaws: Group[];
  authIndicatorMaterial: MeshBasicMaterial;
  rateIris: InstancedMesh;
  rateIrisCount: number;
  rateRingMaterial: MeshBasicMaterial;
  rateDrum: Group;
  routerArm: Group;
  routerBead: Mesh;
  routerLaneMaterial: MeshBasicMaterial;
  queueSlots: InstancedMesh;
  queueSlotCount: number;
  queueHead: Group;
  clusterBars: InstancedMesh;
  clusterBarCount: number;
  clusterBurst: Mesh;
  clusterBurstMaterial: MeshBasicMaterial;
  clusterHaloMaterial: MeshBasicMaterial;
  labels: LabelHandle[];
}

export interface PortSpec {
  position: Vec3Tuple;
  rotation: Vec3Tuple;
}

export interface NetworkBuildContext extends BuildContext<NetworkHandles> {
  ports: PortSpec[];
}

export interface BuiltNetwork {
  group: Group;
  pickables: Object3D[];
  handles: NetworkHandles;
  flow: FlowParticles;
  dust: DustField;
  supports: SupportSpec[];
}
