/**
 * 第 02 章 / THE NETWORK —— 请求胶囊穿过一条抽象网络。
 *
 * 局部坐标：+X 是流程方向，+Y 向上，+Z 朝向观众。
 * 胶囊从 x≈-10.9 出发，穿过 DNS/连接环 → TLS 编织隧道 → API 网关门架 →
 * 身份认证夹爪 → 限流光圈 → 模型路由开关 → 排队调度槽 → GPU 集群通道，
 * 最终停在 x≈+12.2 的集群通道中段。网关类结构用旁路线与空插座暗示「各厂商不同」。
 *
 * 构图：UI 占左下章节卡与右上遥测，镜头注视点略偏主体左侧，把胶囊与门架
 * 推到画面中右。机械响应全部由 stageProgress 推导，拖动时间轴可立即复现。
 */
import { Color } from 'three';
import type { Group, Material, Mesh, Object3D, SpriteMaterial } from 'three';
import { PALETTE } from '../../kit/palette';
import { disposeObject } from '../../kit/geometry';
import { dotTexture } from '../../kit/particles';
import type { DustField, FlowParticles } from '../../kit/particles';
import type { CameraPose, QualityInfo, SceneFrame, StageScene } from '../../types';
import { buildNetwork } from './networkBuild';
import {
  capsuleXAt,
  NETWORK_CAMERA_KEYS,
  NODE_X,
  RAIL_Y,
} from './networkLayout';
import type { NetworkHandles } from './networkLayout';
import {
  clamp01,
  createCameraTrack,
  gaussianPulse,
  lerp,
  proximity,
  setInstanceMatrix,
  smoothstep,
  type CameraTrack,
} from './transitSupport';

export class NetworkScene implements StageScene {
  readonly group: Group;
  readonly pickables: Object3D[];

  private readonly cameraTrack: CameraTrack;
  private readonly handles: NetworkHandles;
  private readonly flow: FlowParticles;
  private readonly dust: DustField;
  private readonly teal = new Color(PALETTE.teal);
  private readonly orange = new Color(PALETTE.orange);
  private readonly ledColor = new Color();

  constructor(quality: QualityInfo) {
    const built = buildNetwork(quality);
    this.group = built.group;
    this.pickables = built.pickables;
    this.handles = built.handles;
    this.flow = built.flow;
    this.dust = built.dust;
    this.cameraTrack = createCameraTrack(NETWORK_CAMERA_KEYS);
  }

  update(frame: SceneFrame): void {
    const progress = clamp01(frame.stageProgress);
    const motion = frame.reducedMotion ? 0 : 1;
    const time = frame.time;
    const handles = this.handles;

    // 胶囊沿链路推进；位置完全由本章进度决定，拖动时间轴可立即复现。
    const capsuleX = capsuleXAt(progress);
    handles.capsule.position.set(
      capsuleX,
      RAIL_Y + Math.sin(time * 1.7) * 0.012 * motion,
      0,
    );
    handles.capsule.rotation.x = Math.sin(time * 0.9) * 0.05 * motion + progress * 0.25;
    handles.capsuleCore.scale.set(1, 1 + Math.sin(time * 2.1) * 0.06 * motion, 1);

    // 标签只随镜头焦点出现；远处的小字直接隐藏，避免漂在空场景里。
    const focus = this.cameraTrack.sample(progress, 1).target.x;
    for (const label of handles.labels) {
      const near = 1 - smoothstep((Math.abs(label.x - focus) - 4.2) / 2.6);
      const material = label.sprite.material as SpriteMaterial;
      material.opacity = near;
      label.sprite.visible = near > 0.04;
    }

    // DNS 环：胶囊靠近时解析刻度加速，青色量规亮起。
    const dnsNear = proximity(capsuleX, NODE_X.dns, 0.9, 2.5);
    handles.dnsSpinner.rotation.x = time * 0.5 * motion + progress * 2.4;
    handles.dnsActiveMaterial.opacity = 0.18 + 0.7 * dnsNear;

    // TLS：编织层持续旋转，胶囊进入时玻璃隧道与加密套筒同时变实。
    const tlsNear = proximity(capsuleX, NODE_X.tls, 1.3, 3.0);
    handles.tlsHelixGroup.rotation.x = time * 0.55 * motion + progress * 2.8;
    handles.tlsTubeMaterial.opacity = 0.05 + 0.14 * tlsNear;
    handles.tlsHelixMaterial.opacity = 0.55 + 0.4 * tlsNear;
    handles.capsuleSleeveMaterial.opacity = 0.3 * tlsNear;
    handles.capsuleSleeve.visible = tlsNear > 0.02;

    // API 网关：扫描面走完一次竖向扫掠，端口灯顺序回应。
    const sweep = clamp01((capsuleX + 1.6) / 3.2);
    const scanFade = Math.sin(sweep * Math.PI);
    handles.gatewayScan.position.y = lerp(2.85, 0.24, sweep);
    handles.gatewayScanMaterial.opacity = scanFade * 0.7;
    handles.gatewayScan.visible = scanFade > 0.02;
    for (let index = 0; index < handles.gatewayLedCount; index += 1) {
      const pulse = gaussianPulse(capsuleX, -1.5 + index * 0.17, 0.45);
      const settled = smoothstep((capsuleX - (-1.6 + index * 0.15)) / 0.7);
      this.ledColor.copy(this.teal).lerp(this.orange, clamp01(pulse * 1.1 + settled * 0.5));
      handles.gatewayLeds.setColorAt(index, this.ledColor);
    }
    if (handles.gatewayLeds.instanceColor) handles.gatewayLeds.instanceColor.needsUpdate = true;

    // 认证：两片夹爪合拢，通过后橙色指示灯留下确认。
    const authNear = proximity(capsuleX, NODE_X.auth, 0.8, 2.1);
    handles.authJaws.forEach((jaw, index) => {
      const side = index === 0 ? -1 : 1;
      jaw.position.z = side * lerp(1.0, 0.49, authNear);
    });
    handles.authIndicatorMaterial.opacity =
      0.14 + 0.8 * smoothstep((capsuleX - (NODE_X.auth - 0.4)) / 1.4);

    // 限流：快门叶片收拢并轻微旋转；配额鼓随进度滚动。
    const rateNear = proximity(capsuleX, NODE_X.rate, 0.9, 2.3);
    const irisRadius = lerp(0.96, 0.64, rateNear * 0.9);
    for (let index = 0; index < handles.rateIrisCount; index += 1) {
      const angle =
        (index / handles.rateIrisCount) * Math.PI * 2 + progress * 1.8 + time * 0.2 * motion;
      setInstanceMatrix(
        handles.rateIris,
        index,
        [0, RAIL_Y + Math.cos(angle) * irisRadius, Math.sin(angle) * irisRadius],
        [0.1, 0.3, 0.06],
        [angle, 0, rateNear * 0.8],
      );
    }
    handles.rateIris.instanceMatrix.needsUpdate = true;
    handles.rateRingMaterial.opacity = 0.32 + 0.55 * rateNear;
    handles.rateDrum.rotation.z = progress * Math.PI * 7 + time * 0.3 * motion;

    // 路由：道岔摆向被选中的模型池，数据珠沿着该路线滑行。
    const armAngle = lerp(0.95, 0, smoothstep((capsuleX - (NODE_X.router - 2.1)) / 1.9));
    handles.routerArm.rotation.y = -armAngle;
    const laneTravel = clamp01((capsuleX - (NODE_X.router + 0.2)) / 1.85);
    handles.routerBead.position.set(0.3 + laneTravel * 1.7, RAIL_Y - 0.44, 0);
    handles.routerBead.visible = laneTravel > 0.03 && laneTravel < 0.99;
    handles.routerLaneMaterial.opacity = 0.25 + 0.7 * Math.sin(laneTravel * Math.PI);

    // 调度：槽位被逐个抬起，磁头跟随胶囊。
    for (let index = 0; index < handles.queueSlotCount; index += 1) {
      const lift = gaussianPulse(capsuleX - 0.25, 8.55 + index * 0.25, 0.55);
      setInstanceMatrix(
        handles.queueSlots,
        index,
        [-0.75 + index * 0.25, 0.34 + lift * 0.22, 0],
        [0.16, 0.34, 0.62],
      );
    }
    handles.queueSlots.instanceMatrix.needsUpdate = true;
    handles.queueHead.position.x = Math.max(-0.9, Math.min(0.82, capsuleX - NODE_X.queue));
    handles.queueHead.position.y = 1.78 + proximity(capsuleX, NODE_X.queue, 0.7, 2.0) * 0.06;

    // 集群：胶囊停靠，计算条与状态环响应。
    const clusterNear = proximity(capsuleX, NODE_X.cluster, 1.6, 3.5);
    const dock = smoothstep((capsuleX - 11.1) / 1.9);
    for (let index = 0; index < handles.clusterBarCount; index += 1) {
      const row = index % 3;
      const side = index < 3 ? 1 : -1;
      const activity =
        0.35 +
        0.65 * Math.abs(Math.sin(time * 1.6 * motion + index * 1.27)) * (0.35 + 0.65 * clusterNear);
      setInstanceMatrix(
        handles.clusterBars,
        index,
        [0, 0.64 + row * 0.4, side * 0.78],
        [0.4 + activity * 0.95, 0.05, 0.03],
      );
      this.ledColor.copy(this.teal).lerp(this.orange, clamp01(dock * 1.2 + activity * 0.25));
      handles.clusterBars.setColorAt(index, this.ledColor);
    }
    handles.clusterBars.instanceMatrix.needsUpdate = true;
    if (handles.clusterBars.instanceColor) handles.clusterBars.instanceColor.needsUpdate = true;
    handles.clusterBurst.scale.setScalar(lerp(0.5, 2.1, dock));
    handles.clusterBurstMaterial.opacity = Math.sin(dock * Math.PI) * 0.7;
    handles.clusterBurst.visible = handles.clusterBurstMaterial.opacity > 0.02;
    handles.clusterHaloMaterial.opacity = 0.16 + 0.4 * clusterNear;

    // 环境：只在允许动效时流动，减少动效时静止。
    this.flow.update(motion ? time : 0);
    this.dust.update(motion ? time : 0);
  }

  cameraPose(frame: SceneFrame, aspect: number): CameraPose {
    return this.cameraTrack.sample(frame.stageProgress, aspect);
  }

  dispose(): void {
    // 只清理由本场景拥有的贴图；dotTexture 是 kit 的共享缓存，不能顺手释放。
    const shared = dotTexture();
    this.group.traverse((child) => {
      const material = (child as Mesh).material as Material | Material[] | undefined;
      if (!material) return;
      const list = Array.isArray(material) ? material : [material];
      for (const entry of list) {
        if ((entry as { map?: unknown }).map === shared) {
          (entry as { map?: unknown }).map = null;
        }
      }
    });
    disposeObject(this.group);
  }
}
