import { Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { CameraPose, QualityInfo, SceneFrame, StageScene } from '../../types';
import { curveFromPoints, lineFromPoints, tubeAlong } from '../../kit/geometry';
import { PALETTE } from '../../kit/palette';
import { createFlowParticles, type FlowParticles } from '../../kit/particles';
import { makeSpriteLabel } from '../../kit/textures';
import { AttentionLab } from './attention-lab';
import { KvCache } from './kv-cache';
import { MlpLab } from './mlp-lab';
import { OutputHead } from './output-head';
import { LayerTower } from './tower';

interface PoseKey {
  at: number;
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const TRANSFORMER_POSES: PoseKey[] = [
  { at: 0, pos: [20, 18, 46], target: [-4, 12, 0], fov: 44 },
  { at: 0.16, pos: [12, 17, 34], target: [-3, 13, 1.5], fov: 41 },
  { at: 0.32, pos: [-24, 20, 38], target: [-14, 13, 6.4], fov: 39 },
  { at: 0.47, pos: [-22, 20, 40], target: [-14.5, 13, 7], fov: 38 },
  { at: 0.6, pos: [-2, 16, 24], target: [-2, 13.5, 3.2], fov: 40 },
  { at: 0.76, pos: [14, 18, 40], target: [4, 13, 6.2], fov: 38 },
  { at: 0.86, pos: [12, 16.5, 35], target: [2.5, 13, 6.2], fov: 38 },
  { at: 0.95, pos: [6, 10, 29], target: [-2, 17, 0], fov: 43 },
  { at: 1, pos: [21, 20, 41], target: [-4, 12, 0], fov: 45 },
];

const PREFILL_POSES: PoseKey[] = [
  { at: 0, pos: [25, 19, 43], target: [3, 11, 0], fov: 45 },
  { at: 0.28, pos: [22, 17, 33], target: [4, 11, -1], fov: 43 },
  { at: 0.58, pos: [25, 14, 19], target: [11, 9.5, -4.5], fov: 42 },
  { at: 0.8, pos: [24, 14.5, 21], target: [10, 9.5, -4], fov: 42 },
  { at: 1, pos: [27, 18, 41], target: [4, 10, -1], fov: 45 },
];

const DECODE_POSES: PoseKey[] = [
  { at: 0, pos: [19, 15, 39], target: [0, 9, 4], fov: 44 },
  { at: 0.2, pos: [12, 12, 33], target: [-2, 8, 13], fov: 41 },
  { at: 0.44, pos: [7, 10, 26], target: [-2, 7.4, 13], fov: 40 },
  { at: 0.58, pos: [8, 10.5, 27], target: [-2, 7.4, 13], fov: 40 },
  { at: 0.72, pos: [18, 13, 30], target: [1, 8, 6], fov: 43 },
  { at: 0.88, pos: [24, 16, 33], target: [5, 9, 0], fov: 45 },
  { at: 1, pos: [26, 18, 39], target: [4, 9, 0], fov: 46 },
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function samplePose(poses: PoseKey[], progress: number): CameraPose {
  const p = clamp01(progress);
  let from = poses[0];
  let to = poses[poses.length - 1];
  for (let index = 0; index < poses.length - 1; index += 1) {
    if (p >= poses[index].at && p <= poses[index + 1].at) {
      from = poses[index];
      to = poses[index + 1];
      break;
    }
  }
  const t = smooth((p - from.at) / (to.at - from.at || 1));
  return {
    position: new Vector3(mix(from.pos[0], to.pos[0], t), mix(from.pos[1], to.pos[1], t), mix(from.pos[2], to.pos[2], t)),
    target: new Vector3(
      mix(from.target[0], to.target[0], t),
      mix(from.target[1], to.target[1], t),
      mix(from.target[2], to.target[2], t),
    ),
    fov: mix(from.fov, to.fov, t),
  };
}

export class ModelScene implements StageScene {
  readonly group = new Group();
  readonly pickables: import('three').Object3D[] = [];
  private readonly tower: LayerTower;
  private readonly attention: AttentionLab;
  private readonly mlp: MlpLab;
  private readonly cache: KvCache;
  private readonly output: OutputHead;
  private readonly cacheFlow: FlowParticles;
  private readonly outputFlow: FlowParticles;
  private readonly currentPose: CameraPose = {
    position: new Vector3(),
    target: new Vector3(),
    fov: 44,
  };

  constructor(quality: QualityInfo) {
    this.group.name = 'chapter-model';
    this.tower = new LayerTower(quality);
    this.attention = new AttentionLab(quality);
    this.mlp = new MlpLab(quality);
    this.cache = new KvCache();
    this.output = new OutputHead(quality);

    this.attention.group.position.set(-9.2, 13.0, 6.0);
    this.mlp.group.position.set(8.8, 13.0, 6.2);
    this.cache.group.position.set(13.4, 8.8, -5.4);
    this.output.group.position.set(0, 7.2, 13.4);

    this.group.add(this.tower.group, this.attention.group, this.mlp.group, this.cache.group, this.output.group);

    const cacheCurve = curveFromPoints([
      new Vector3(7.2, 11.5, 0.8),
      new Vector3(9.4, 10.4, -2.0),
      new Vector3(11.3, 9.0, -4.2),
    ]);
    this.group.add(
      tubeAlong(
        cacheCurve,
        0.014,
        new MeshBasicMaterial({ color: PALETTE.graphite, transparent: true, opacity: 0.24 }),
        48,
        4,
      ),
    );
    this.cacheFlow = createFlowParticles(cacheCurve, {
      count: quality.isMobile ? 12 : 24,
      color: PALETTE.teal,
      size: quality.isMobile ? 0.07 : 0.05,
      speed: 0.1,
      opacity: 0.7,
      jitter: 0.12,
    });
    this.group.add(this.cacheFlow.object);

    const outputCurve = curveFromPoints([
      new Vector3(3.4, 8.2, 5.8),
      new Vector3(2.1, 7.6, 9.2),
      new Vector3(0.4, 7.2, 12.0),
    ]);
    this.group.add(
      tubeAlong(
        outputCurve,
        0.016,
        new MeshBasicMaterial({ color: PALETTE.orange, transparent: true, opacity: 0.24 }),
        48,
        4,
      ),
    );
    this.outputFlow = createFlowParticles(outputCurve, {
      count: quality.isMobile ? 16 : 32,
      color: PALETTE.orange,
      size: quality.isMobile ? 0.08 : 0.055,
      speed: 0.11,
      opacity: 0.78,
      jitter: 0.15,
    });
    this.group.add(this.outputFlow.object);

    this.buildStageAnnotations();
    this.pickables.push(
      this.tower.group,
      this.attention.group,
      this.mlp.group,
      this.cache.group,
      this.output.group,
      ...this.attention.pickables,
      ...this.mlp.pickables,
      ...this.cache.pickables,
      ...this.output.pickables,
    );
  }

  private buildStageAnnotations(): void {
    const entryLabel = makeSpriteLabel('VECTORS IN / 向量输入', 'CONTEXT SEQUENCE · HIDDEN STATE', {
      height: 0.22,
      color: PALETTE.muted,
      subColor: PALETTE.orange,
      fontSize: 32,
      subFontSize: 14,
      paddingX: 12,
      paddingY: 7,
    });
    entryLabel.position.set(-16.5, 8.1, 3.2);
    this.group.add(entryLabel);

    const towerLine = lineFromPoints(
      [
        [-16, 7.4, 2.2],
        [-13, 7.4, 2.2],
        [-10.5, 9.8, 2.2],
      ],
      PALETTE.graphite,
      0.18,
    );
    this.group.add(towerLine);

    const coreLabel = makeSpriteLabel('MODEL CORE / 推理集群', 'SOFTWARE VIEW · NOT PHYSICAL SERVER GEOMETRY', {
      height: 0.2,
      color: PALETTE.muted,
      subColor: PALETTE.muted,
      fontSize: 30,
      subFontSize: 13,
      paddingX: 12,
      paddingY: 7,
    });
    coreLabel.position.set(-13.5, 27.8, -5.5);
    this.group.add(coreLabel);
  }

  update(frame: SceneFrame): void {
    const stage = frame.stageIndex;
    const p = frame.stageProgress;
    const ended = frame.phase === 'ended';
    const transformer = stage === 4;
    const prefill = stage === 5;
    const decode = stage === 6;

    this.attention.group.visible = transformer && p < 0.63;
    this.mlp.group.visible = transformer && p > 0.52;
    this.cache.group.visible = stage >= 5 || ended;
    this.output.group.visible = stage === 6 || ended;
    this.cacheFlow.object.visible = this.cache.group.visible;
    this.outputFlow.object.visible = this.output.group.visible;
    this.tower.group.visible =
      ended ||
      (transformer && (p < 0.22 || p > 0.9)) ||
      (prefill && (p < 0.3 || p > 0.88)) ||
      (decode && (p < 0.28 || p > 0.8));

    const towerMode = transformer ? 'transformer' : prefill ? 'prefill' : 'decode';
    const focus = prefill ? smooth((p - 0.08) / 0.78) : decode ? Math.min(1, frame.generatedTokenCount / 55) : 0.35;
    const towerActivity = ended ? 0.6 : transformer ? 0.55 + smooth((p - 0.15) / 0.55) * 0.35 : prefill ? 0.92 : 0.82;
    this.tower.update(frame, towerMode, focus, towerActivity);

    const attentionIntensity = ended
      ? 0.35
      : transformer
        ? 0.32 + smooth((p - 0.18) / 0.28) * 0.68
        : prefill
          ? 0.26
          : 0.22;
    this.attention.update(frame, attentionIntensity);

    const mlpIntensity = ended
      ? 0.32
      : transformer
        ? 0.24 + smooth((p - 0.55) / 0.24) * 0.76
        : prefill
          ? 0.22
          : 0.2;
    this.mlp.update(frame, mlpIntensity);

    let filledColumns = 0;
    if (prefill) {
      filledColumns = Math.round(smooth((p - 0.12) / 0.72) * 6);
    } else if (decode) {
      filledColumns = Math.min(24, 6 + frame.generatedTokenCount);
    } else if (ended || stage > 6) {
      filledColumns = 24;
    }
    if (this.cache.group.visible) this.cache.update(frame, filledColumns, decode);
    if (this.output.group.visible) this.output.update(frame);
    if (this.cacheFlow.object.visible) this.cacheFlow.update(frame.stageElapsed);
    if (this.outputFlow.object.visible) this.outputFlow.update(frame.stageElapsed);

    const cacheFlowMaterial = this.cacheFlow.object.material as MeshBasicMaterial;
    cacheFlowMaterial.opacity = prefill ? 0.82 : decode ? 0.34 : 0.16;
    const outputFlowMaterial = this.outputFlow.object.material as MeshBasicMaterial;
    outputFlowMaterial.opacity = decode ? 0.78 : transformer ? 0.18 : 0.22;
  }

  cameraPose(frame: SceneFrame, aspect: number): CameraPose {
    let pose: CameraPose;
    if (frame.phase === 'ended') {
      pose = samplePose(DECODE_POSES, 1);
    } else if (frame.stageIndex === 4) {
      pose = samplePose(TRANSFORMER_POSES, frame.stageProgress);
    } else if (frame.stageIndex === 5) {
      pose = samplePose(PREFILL_POSES, frame.stageProgress);
    } else if (frame.stageIndex === 6) {
      pose = samplePose(DECODE_POSES, frame.stageProgress);
    } else {
      pose = samplePose(TRANSFORMER_POSES, 1);
    }

    if (aspect < 1) {
      const offset = pose.position.clone().sub(pose.target).multiplyScalar(1.45);
      pose.position.copy(pose.target).add(offset);
      pose.fov = Math.min(62, pose.fov + 5);
    } else if (aspect < 1.4) {
      const offset = pose.position.clone().sub(pose.target).multiplyScalar(1.08);
      pose.position.copy(pose.target).add(offset);
    }

    this.currentPose.position.copy(pose.position);
    this.currentPose.target.copy(pose.target);
    this.currentPose.fov = pose.fov;
    return this.currentPose;
  }

  dispose(): void {
    this.group.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else if (material) material.dispose();
    });
    this.cacheFlow.object.geometry.dispose();
    (this.cacheFlow.object.material as MeshBasicMaterial).dispose();
    this.outputFlow.object.geometry.dispose();
    (this.outputFlow.object.material as MeshBasicMaterial).dispose();
  }
}
