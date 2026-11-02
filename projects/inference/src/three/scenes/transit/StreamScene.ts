/**
 * 第 08 章 / THE STREAM —— 答案以流的形式返回客户端。
 *
 * 局部坐标：返回链路沿 -X 流动（越走越接近客户端），+Y 向上，+Z 朝向观众。
 * 结构顺序：Detokenizer（+11.9）→ SSE 协议桅杆（+9.8）→ 5 个网络 Chunk
 * （+8.6 … -2.2）→ TTFT 仪表（-2.7）→ 客户端窗口（-11.4）。
 *
 * 教学重点必须一眼可见：上方是 55 个 Token 的等距标尺与 9 个 SSE 事件括号，
 * 下方是按字节划分的 5 段传输标尺；两套边界并不重合，错位连线直接落在画面上。
 * 标签只在镜头靠近时出现，避免 9 个事件标签同时挤在画面里。
 */
import { Color } from 'three';
import type { Group, Material, Mesh, Object3D, SpriteMaterial } from 'three';
import { PALETTE } from '../../kit/palette';
import { disposeObject } from '../../kit/geometry';
import { dotTexture } from '../../kit/particles';
import { SSE_EVENTS } from '../../../data/request';
import { SIMULATED, visibleAnswerTokensAt } from '../../../data/metrics';
import type { CameraPose, QualityInfo, SceneFrame, StageScene } from '../../types';
import { buildStream } from './streamCargo';
import { CHUNK_SPANS, STREAM_CAMERA_KEYS, TOKEN_TOTAL } from './streamLayout';
import type { StreamHandles } from './streamLayout';
import { paintClientScreen, paintEventPreview } from './streamPainters';
import {
  clamp01,
  createCameraTrack,
  lerp,
  setInstanceMatrix,
  smoothstep,
  type CameraTrack,
} from './transitSupport';

export class StreamScene implements StageScene {
  readonly group: Group;
  readonly pickables: Object3D[];

  private readonly cameraTrack: CameraTrack;
  private readonly handles: StreamHandles;
  private readonly teal = new Color(PALETTE.teal);
  private readonly orange = new Color(PALETTE.orange);
  private readonly tint = new Color();
  private readonly dimOrange = new Color(PALETTE.orange).multiplyScalar(0.35);
  private readonly activeChunk = new Float32Array(CHUNK_SPANS.length);
  private readonly chunkCenters = Float32Array.from(CHUNK_SPANS.map((span) => (span.start + span.end) / 2));
  private previewEventId = -2;
  private lastScreenTokens = -1;

  constructor(quality: QualityInfo) {
    const built = buildStream(quality);
    this.group = built.group;
    this.pickables = built.pickables;
    this.handles = built.handles;
    this.cameraTrack = createCameraTrack(STREAM_CAMERA_KEYS);
  }

  update(frame: SceneFrame): void {
    const progress = clamp01(frame.stageProgress);
    const motion = frame.reducedMotion ? 0 : 1;
    const time = frame.time;
    const handles = this.handles;

    // 视觉焦点取自相机注视点：镜头经过的元素依次被点亮，标签也只显示近邻。
    const focus = this.cameraTrack.sample(progress, 1).target.x;
    const activate = (x: number): number => smoothstep((x - focus) / 1.7);
    const labelNear = (x: number, inner: number): number =>
      1 - smoothstep((Math.abs(x - focus) - inner) / 0.9);

    // Detokenizer：滚筒按进度旋转，文本带随经过而变亮。
    handles.detokDrum.rotation.z = progress * Math.PI * 9 + time * 0.25 * motion;
    handles.detokRibbonMaterial.opacity = 0.45 + 0.45 * activate(10.4);

    // 9 个 SSE 事件：逐个点亮；只有镜头附近的 2–3 个事件显示标签。
    let activeEvent = -1;
    handles.eventMarkers.forEach((marker) => {
      const value = activate(marker.center);
      marker.material.opacity = 0.18 + 0.72 * value;
      const near = labelNear(marker.center, 0.7);
      const material = marker.label.material as SpriteMaterial;
      material.opacity = 0.3 + 0.7 * near;
      marker.label.visible = near > 0.05;
      if (value > 0.55) activeEvent = marker.index;
    });
    if (activeEvent !== this.previewEventId) {
      this.previewEventId = activeEvent;
      paintEventPreview(handles.previewCanvas, activeEvent >= 0 ? SSE_EVENTS[activeEvent] : null);
      handles.previewTexture.needsUpdate = true;
    }

    // 5 个 Chunk：灯与标签应答；容器里的 Token 微粒呼吸。
    for (let index = 0; index < CHUNK_SPANS.length; index += 1) {
      const center = this.chunkCenters[index];
      const value = activate(center);
      this.activeChunk[index] = value;
      this.tint.copy(this.dimOrange).lerp(this.teal, value);
      handles.chunkLamps.setColorAt(index, this.tint);
      const labelMaterial = handles.chunkLabels[index].material as SpriteMaterial;
      const near = labelNear(center, 1.1);
      labelMaterial.opacity = 0.35 + 0.65 * near;
      handles.chunkLabels[index].visible = near > 0.05;
    }
    if (handles.chunkLamps.instanceColor) handles.chunkLamps.instanceColor.needsUpdate = true;

    for (let index = 0; index < TOKEN_TOTAL; index += 1) {
      const chunkValue = this.activeChunk[handles.moteChunk[index]] ?? 0;
      const bob = Math.sin(time * 1.3 * motion + handles.motePhase[index]) * 0.024;
      setInstanceMatrix(handles.chunkMotes, index, [
        handles.moteBase[index * 3],
        handles.moteBase[index * 3 + 1] + bob,
        handles.moteBase[index * 3 + 2],
      ]);
      this.tint.copy(this.dimOrange).lerp(this.orange, 0.4 + 0.6 * chunkValue);
      handles.chunkMotes.setColorAt(index, this.tint);
    }
    handles.chunkMotes.instanceMatrix.needsUpdate = true;
    if (handles.chunkMotes.instanceColor) handles.chunkMotes.instanceColor.needsUpdate = true;

    // TTFT 仪表：指针走到模拟读数，tokens/s 柱随解码推进长起来。
    const gauge = smoothstep((progress - 0.12) / 0.5);
    handles.ttftNeedle.rotation.z = lerp(0, 1.4, gauge);
    const speedRatio = clamp01(SIMULATED.decodeTokPerSec / 60);
    const barHeight = 0.18 + 1.5 * speedRatio * smoothstep((progress - 0.2) / 0.6);
    handles.ttftBar.scale.y = barHeight;
    handles.ttftBar.position.y = 0.62 + barHeight / 2;
    handles.portRingMaterial.opacity = 0.25 + 0.6 * smoothstep((progress - 0.78) / 0.22);

    // 客户端窗口：可见 Token 数变化时才重绘 Canvas。
    const visibleTokens = visibleAnswerTokensAt(frame.stageIndex, progress);
    if (visibleTokens !== this.lastScreenTokens) {
      this.lastScreenTokens = visibleTokens;
      paintClientScreen(handles.screenCanvas, visibleTokens);
      handles.screenTexture.needsUpdate = true;
    }

    // 延迟标尺上的读数珠跟着“已抵达的 Token”向客户端滑动。
    const arrival = smoothstep(visibleTokens / TOKEN_TOTAL);
    handles.latencyMarker.position.set(lerp(-3.4, -10.6, arrival), 2.3, 0.12);
    handles.latencyMarker.visible = arrival > 0.02;
    // 客户端窗口标题只在回程末段出现，避免 p≈0.5 时在画面左缘被裁一半。
    handles.clientLabel.visible = progress > 0.62;

    // 环境微粒：减少动效时静止。
    handles.flow.update(motion ? time : 0);
    handles.protocolFlow.update(motion ? time : 0);
    handles.dust.update(motion ? time : 0);
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
