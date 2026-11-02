import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { QualityInfo, SceneFrame } from '../../types';
import { lineFromPoints, roundedBox } from '../../kit/geometry';
import { accentMaterial, glassMaterial, graphiteMaterial, smokedGlassMaterial } from '../../kit/materials';
import { PALETTE } from '../../kit/palette';
import { createFlowParticles, type FlowParticles } from '../../kit/particles';
import { makeSpriteLabel } from '../../kit/textures';

const SLAB_X = [-3.75, -1.25, 1.25, 3.75];
const SLAB_HEIGHTS = [2.3, 4.2, 4.2, 2.3];

export class MlpLab {
  readonly group = new Group();
  readonly pickables: Group[] = [];
  private readonly dense = new Group();
  private readonly moe = new Group();
  private readonly slabMaterials: MeshBasicMaterial[] = [];
  private readonly denseFlow: FlowParticles;
  private readonly routerGroup = new Group();
  private readonly expertGroups: Group[] = [];
  private readonly expertGlows: Mesh[] = [];
  private readonly moeMotes: Mesh[] = [];

  constructor(quality: QualityInfo) {
    this.group.name = 'mlp-lab';
    this.buildDense();
    this.denseFlow = createFlowParticles(
      new CatmullRomCurve3([
        new Vector3(-5.6, 0.1, 0.9),
        new Vector3(-3.0, 0.8, 0.9),
        new Vector3(0, -0.4, 0.9),
        new Vector3(3.0, 0.5, 0.9),
        new Vector3(5.8, 0.1, 0.9),
      ]),
      {
        count: quality.isMobile ? 20 : 46,
        color: PALETTE.orange,
        size: quality.isMobile ? 0.06 : 0.045,
        speed: 0.12,
        opacity: 0.8,
        jitter: 0.24,
      },
    );
    this.dense.add(this.denseFlow.object);
    this.buildMoe();
    this.group.add(this.dense, this.moe);
    this.dense.userData.infoId = 'mlp';
    this.moe.userData.infoId = 'moe-router';
    this.pickables.push(this.dense, this.moe);
  }

  private buildDense(): void {
    const base = new Mesh(
      roundedBox(11.2, 0.16, 3.2, 0.04),
      graphiteMaterial({ color: '#3d3f39', roughness: 0.4, metalness: 0.5 }),
    );
    base.position.set(0, -2.45, 0.3);
    this.dense.add(base);

    const rails = lineFromPoints(
      [
        [-5.5, -2.34, 1.85],
        [5.5, -2.34, 1.85],
      ],
      PALETTE.orange,
      0.34,
    );
    this.dense.add(rails);

    SLAB_X.forEach((x, index) => {
      const height = SLAB_HEIGHTS[index];
      const slab = new Mesh(
        roundedBox(0.22, height, 2.5, 0.03),
        glassMaterial({
          color: '#dfe7e3',
          opacity: index === 1 || index === 2 ? 0.25 : 0.17,
          roughness: 0.06,
        }),
      );
      slab.position.set(x, -0.4, 0.3);
      slab.rotation.z = 0;
      this.dense.add(slab);

      const frame = lineFromPoints(
        [
          [x - 0.11, -0.4 - height / 2, 1.56],
          [x + 0.11, -0.4 - height / 2, 1.56],
          [x + 0.11, -0.4 + height / 2, 1.56],
          [x - 0.11, -0.4 + height / 2, 1.56],
          [x - 0.11, -0.4 - height / 2, 1.56],
        ],
        PALETTE.graphite,
        0.3,
      );
      this.dense.add(frame);

      const glow = new Mesh(
        roundedBox(0.06, height * 0.7, 0.03, 0.01),
        accentMaterial(index === 1 || index === 2 ? PALETTE.orange : PALETTE.teal),
      );
      glow.position.set(x, -0.4, 1.55);
      this.slabMaterials.push(glow.material as MeshBasicMaterial);
      this.dense.add(glow);

      if (index < SLAB_X.length - 1) {
        const segmentPositions: number[] = [];
        const count = 6;
        const nextX = SLAB_X[index + 1];
        for (let lineIndex = 0; lineIndex < count; lineIndex += 1) {
          const z = 0.3 - 1.0 + (lineIndex / (count - 1)) * 2.0;
          const nextHeight = SLAB_HEIGHTS[index + 1];
          segmentPositions.push(
            x + 0.12,
            -0.4 - height / 2 + (lineIndex / (count - 1)) * height,
            z,
            nextX - 0.12,
            -0.4 - nextHeight / 2 + (lineIndex / (count - 1)) * nextHeight,
            z,
          );
        }
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(segmentPositions), 3));
        this.dense.add(
          new LineSegments(
            geometry,
            new LineBasicMaterial({ color: PALETTE.graphite, transparent: true, opacity: 0.16 }),
          ),
        );
      }
    });

    const matrixPanel = new Mesh(
      roundedBox(4.2, 2.4, 0.14, 0.04),
      smokedGlassMaterial({ color: '#22251f', opacity: 0.75, roughness: 0.18 }),
    );
    matrixPanel.position.set(0, 0.1, -1.2);
    this.dense.add(matrixPanel);

    const matrixLines: number[] = [];
    for (let index = 0; index < 7; index += 1) {
      const x = -1.8 + index * 0.6;
      matrixLines.push(x, -1.0, -1.1, x, 1.2, -1.1);
    }
    for (let index = 0; index < 5; index += 1) {
      const y = -1.0 + index * 0.55;
      matrixLines.push(-1.8, y, -1.1, 1.8, y, -1.1);
    }
    const matrixGeometry = new BufferGeometry();
    matrixGeometry.setAttribute('position', new BufferAttribute(new Float32Array(matrixLines), 3));
    this.dense.add(
      new LineSegments(
        matrixGeometry,
        new LineBasicMaterial({ color: PALETTE.orange, transparent: true, opacity: 0.2 }),
      ),
    );

    const label = makeSpriteLabel('MLP / 前馈网络', 'EXPAND ×4 · ACTIVATION · PROJECT', {
      height: 0.23,
      color: PALETTE.ink,
      subColor: PALETTE.muted,
      fontSize: 36,
      subFontSize: 16,
      paddingX: 15,
      paddingY: 8,
    });
    label.position.set(-4.8, 2.6, 1.8);
    this.dense.add(label);

    const expansion = makeSpriteLabel('DENSE', 'EVERY TOKEN · ALL PARAMETERS', {
      height: 0.15,
      color: PALETTE.muted,
      subColor: PALETTE.muted,
      fontSize: 26,
      subFontSize: 13,
      paddingX: 10,
      paddingY: 6,
    });
    expansion.position.set(4.7, -2.1, 1.9);
    this.dense.add(expansion);
  }

  private buildMoe(): void {
    this.moe.visible = false;
    const base = new Mesh(
      roundedBox(11.2, 0.16, 3.2, 0.04),
      graphiteMaterial({ color: '#3d3f39', roughness: 0.4, metalness: 0.5 }),
    );
    base.position.set(0, -2.45, 0.3);
    this.moe.add(base);

    const router = new Mesh(
      new TorusGeometry(1.0, 0.07, 8, 48),
      new MeshBasicMaterial({ color: PALETTE.orange, toneMapped: false }),
    );
    router.position.set(-3.75, 0, 0.45);
    this.routerGroup.add(router);
    this.moe.add(this.routerGroup);

    const routerCore = new Mesh(
      new SphereGeometry(0.24, 16, 12),
      accentMaterial(PALETTE.orange),
    );
    routerCore.position.copy(router.position);
    this.routerGroup.add(routerCore);

    const routerLabel = makeSpriteLabel('MoE ROUTER / 路由', 'TOP-2 · PER TOKEN', {
      height: 0.22,
      color: PALETTE.ink,
      subColor: PALETTE.orange,
      fontSize: 34,
      subFontSize: 15,
      paddingX: 14,
      paddingY: 8,
    });
    routerLabel.position.set(-3.75, 2.1, 1.2);
    this.routerGroup.add(routerLabel);

    for (let index = 0; index < 4; index += 1) {
      const group = new Group();
      const x = -0.8 + index * 1.75;
      group.position.set(x, -0.4, 0.2);

      const shell = new Mesh(
        roundedBox(1.36, 3.0, 1.7, 0.04),
        glassMaterial({ color: '#dfe6e2', opacity: 0.14, roughness: 0.1 }),
      );
      group.add(shell);

      const frame = lineFromPoints(
        [
          [-0.68, -1.5, 0.86],
          [0.68, -1.5, 0.86],
          [0.68, 1.5, 0.86],
          [-0.68, 1.5, 0.86],
          [-0.68, -1.5, 0.86],
        ],
        PALETTE.graphite,
        0.24,
      );
      group.add(frame);

      const glow = new Mesh(
        roundedBox(0.04, 2.1, 0.03, 0.01),
        accentMaterial(PALETTE.graphiteSoft),
      );
      glow.position.set(0, 0, 0.88);
      group.add(glow);
      this.expertGlows.push(glow);

      const sprite = makeSpriteLabel(`E${index + 1}`, undefined, {
        height: 0.18,
        color: PALETTE.ink,
        fontSize: 32,
        paddingX: 10,
        paddingY: 6,
      });
      sprite.position.set(0, 1.85, 0.95);
      group.add(sprite);

      group.userData.infoId = 'moe-expert';
      this.expertGroups.push(group);
      this.moe.add(group);
    }

    for (let index = 0; index < 4; index += 1) {
      const mote = new Mesh(
        new SphereGeometry(0.055, 8, 6),
        accentMaterial(index < 2 ? PALETTE.orange : PALETTE.graphiteSoft),
      );
      mote.position.set(-3.75, 0, 0.45);
      this.moeMotes.push(mote);
      this.moe.add(mote);
    }

    const expertNote = makeSpriteLabel('SPARSE EXPERTS', 'ONLY SELECTED EXPERTS COMPUTE', {
      height: 0.14,
      color: PALETTE.muted,
      subColor: PALETTE.muted,
      fontSize: 24,
      subFontSize: 12,
      paddingX: 9,
      paddingY: 5,
    });
    expertNote.position.set(4.5, -2.1, 1.4);
    this.moe.add(expertNote);

    this.moe.userData.infoId = 'moe-router';
  }

  update(frame: SceneFrame, intensity: number): void {
    const motion = frame.reducedMotion ? 0 : 1;
    const activity = Math.max(0.08, Math.min(1, intensity));
    const isMoe = frame.architecture === 'moe';
    this.dense.visible = !isMoe;
    this.moe.visible = isMoe;

    this.denseFlow.update(frame.stageElapsed);
    (this.denseFlow.object.material as MeshBasicMaterial).opacity = 0.28 + activity * 0.6;

    const time = frame.stageElapsed;
    for (let index = 0; index < this.slabMaterials.length; index += 1) {
      this.slabMaterials[index].opacity = 0.3 + activity * (0.42 + Math.sin(time * 2 + index) * 0.12);
    }

    if (isMoe) {
      this.routerGroup.rotation.z = frame.time * 0.25 * motion;
      const selectedA = 0;
      const selectedB = 1 + (Math.floor(frame.stageElapsed * 0.35) % 3);
      this.expertGroups.forEach((group, index) => {
        const selected = index === selectedA || index === selectedB;
        const material = this.expertGlows[index].material as MeshBasicMaterial;
        material.opacity = selected ? 0.9 : 0.14;
        const scaleTarget = selected ? 1.04 : 0.98;
        group.scale.setScalar(scaleTarget);
      });

      this.moeMotes.forEach((mote, index) => {
        const targetIndex = index < 2 ? selectedA : selectedB;
        const target = this.expertGroups[targetIndex].position;
        const cycle = ((time * 0.52 + index / this.moeMotes.length) % 1);
        mote.position.x = -3.75 + (target.x + 3.75) * cycle;
        mote.position.y = 0 + Math.sin(cycle * Math.PI) * 0.9;
        mote.position.z = 0.45 + (target.z + 0.2 - 0.45) * cycle;
        mote.scale.setScalar(0.6 + Math.sin(cycle * Math.PI) * 0.5);
      });
    }

    const bob = Math.sin(frame.time * 0.22) * 0.02 * motion;
    this.dense.position.y = bob;
    this.moe.position.y = bob;
  }
}
