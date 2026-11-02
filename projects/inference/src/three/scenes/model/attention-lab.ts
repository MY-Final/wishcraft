import {
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
} from 'three';
import { QUESTION_TOKENS } from '../../../data/tokenization';
import type { QualityInfo, SceneFrame } from '../../types';
import { lineFromPoints, roundedBox } from '../../kit/geometry';
import { accentMaterial, glassMaterial, graphiteMaterial, smokedGlassMaterial } from '../../kit/materials';
import { createTokenSlab } from '../../kit/nodes';
import { PALETTE } from '../../kit/palette';
import { makeSpriteLabel } from '../../kit/textures';

const TOKEN_SPACING = 1.92;
const MATRIX_SIZE = 5.3;

export class AttentionLab {
  readonly group = new Group();
  readonly pickables: Group[] = [];
  private readonly tokenSlabs: Group[] = [];
  private readonly tokenBasePositions: Vector3[] = [];
  private readonly qkvPlates: Mesh[] = [];
  private readonly qkvFrames: Mesh[] = [];
  private readonly arcs: Array<{ mesh: Mesh; from: number; to: number }> = [];
  private matrixCells!: InstancedMesh;
  private readonly matrixGroup = new Group();
  private readonly matrixColors: Color[] = [];
  private readonly weights: number[][] = [];
  private readonly labelGroup = new Group();
  private readonly quality: QualityInfo;
  private lastColorUpdate = -1;

  constructor(quality: QualityInfo) {
    this.quality = quality;
    this.group.name = 'attention-lab';
    this.buildTokenRow();
    this.buildMatrix();
    this.buildQkv();
    this.buildArcs();
    this.buildLabels();
    this.group.userData.infoId = 'attention';
    this.matrixGroup.userData.infoId = 'attention-weights';
    this.pickables.push(this.group, this.matrixGroup);
  }

  private buildTokenRow(): void {
    const base = new Mesh(
      roundedBox(12.6, 0.14, 2.1, 0.05),
      graphiteMaterial({ color: '#3e403b', roughness: 0.38 }),
    );
    base.position.set(0, -2.55, 2.0);
    this.group.add(base);

    const rail = lineFromPoints(
      [
        [-6.2, -2.44, 2.0],
        [6.2, -2.44, 2.0],
      ],
      PALETTE.orange,
      0.45,
    );
    this.group.add(rail);

    const slabScale = this.quality.isMobile ? 0.64 : 0.72;
    QUESTION_TOKENS.forEach((token, index) => {
      const x = (index - (QUESTION_TOKENS.length - 1) / 2) * TOKEN_SPACING;
      const slab = createTokenSlab(token);
      const group = slab.group;
      group.scale.setScalar(slabScale);
      group.position.set(x, -1.7, 2.0);
      group.userData.infoId = 'attention';
      this.tokenSlabs.push(group);
      this.tokenBasePositions.push(group.position.clone());
      this.group.add(group);
    });

    const tokenLabel = makeSpriteLabel('TOKEN POSITIONS / 序列位置', 'QUESTION CONTENT · 6 TOKENS', {
      height: 0.2,
      color: PALETTE.muted,
      subColor: PALETTE.muted,
      fontSize: 32,
      subFontSize: 16,
      paddingX: 14,
      paddingY: 8,
    });
    tokenLabel.position.set(-6.9, -3.0, 2.9);
    this.group.add(tokenLabel);
  }

  private buildMatrix(): void {
    const panel = new Mesh(
      roundedBox(MATRIX_SIZE + 0.6, MATRIX_SIZE + 0.6, 0.22, 0.06),
      smokedGlassMaterial({ color: '#1f2422', opacity: 0.78, metalness: 0.25, roughness: 0.16 }),
    );
    panel.position.set(0, 1.25, -1.1);
    this.matrixGroup.add(panel);

    const frame = lineFromPoints(
      [
        [-MATRIX_SIZE / 2, 1.25 - MATRIX_SIZE / 2, -0.97],
        [MATRIX_SIZE / 2, 1.25 - MATRIX_SIZE / 2, -0.97],
        [MATRIX_SIZE / 2, 1.25 + MATRIX_SIZE / 2, -0.97],
        [-MATRIX_SIZE / 2, 1.25 + MATRIX_SIZE / 2, -0.97],
        [-MATRIX_SIZE / 2, 1.25 - MATRIX_SIZE / 2, -0.97],
      ],
      PALETTE.orange,
      0.38,
    );
    this.matrixGroup.add(frame);

    const cellSize = 0.64;
    const gap = 0.22;
    const geometry = roundedBox(cellSize, cellSize, 0.08, 0.025);
    const material = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.96 });
    this.matrixCells = new InstancedMesh(geometry, material, 36);
    const dummy = new Object3D();
    const start = -((cellSize + gap) * 5) / 2;
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const index = row * 6 + column;
        dummy.position.set(start + column * (cellSize + gap), 1.25 + ((5 - row) - 2.5) * (cellSize + gap), -0.93);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        this.matrixCells.setMatrixAt(index, dummy.matrix);
        const color = new Color('#30332e');
        this.matrixColors.push(color);
        this.matrixCells.setColorAt(index, color);
      }
    }
    this.matrixCells.instanceMatrix.needsUpdate = true;
    if (this.matrixCells.instanceColor) this.matrixCells.instanceColor.needsUpdate = true;
    this.matrixGroup.add(this.matrixCells);

    const topLabel = makeSpriteLabel('ATTENTION WEIGHTS', 'SIMULATED · CAUSAL MASK · L14', {
      height: 0.24,
      color: '#f4f3ef',
      subColor: '#8bcfc2',
      fontSize: 36,
      subFontSize: 16,
      paddingX: 16,
      paddingY: 10,
      background: 'rgba(31,36,34,0.78)',
      border: 'rgba(228,87,42,0.35)',
    });
    topLabel.position.set(0, 4.7, -0.8);
    this.matrixGroup.add(topLabel);

    const rowLabel = makeSpriteLabel('QUERY ↓', undefined, {
      height: 0.14,
      color: '#8bcfc2',
      fontSize: 30,
      paddingX: 10,
      paddingY: 6,
    });
    rowLabel.position.set(-3.5, 4.2, -0.8);
    this.matrixGroup.add(rowLabel);

    const columnLabel = makeSpriteLabel('KEY →', undefined, {
      height: 0.14,
      color: '#8bcfc2',
      fontSize: 30,
      paddingX: 10,
      paddingY: 6,
    });
    columnLabel.position.set(3.4, -1.45, -0.8);
    this.matrixGroup.add(columnLabel);

    this.group.add(this.matrixGroup);
    this.group.userData.infoId = 'attention';
  }

  private buildQkv(): void {
    const labels = ['Q', 'K', 'V'];
    const colors = [PALETTE.orange, PALETTE.teal, PALETTE.graphiteSoft];
    labels.forEach((label, index) => {
      const x = -5.9 + index * 1.45;
      const plate = new Mesh(
        roundedBox(1.2, 3.2, 0.12, 0.04),
        glassMaterial({ color: '#f3f6f4', opacity: 0.24, roughness: 0.06 }),
      );
      plate.position.set(x, 1.1, 1.05);
      plate.rotation.y = -0.12 + index * 0.05;
      plate.userData.infoId = 'qkv';
      this.qkvPlates.push(plate);
      this.group.add(plate);

      const frame = new Mesh(
        roundedBox(1.3, 3.32, 0.06, 0.02),
        accentMaterial(colors[index]),
      );
      frame.position.set(x, 1.1, 0.98);
      frame.scale.z = 0.3;
      this.qkvFrames.push(frame);
      this.group.add(frame);

      const line = lineFromPoints(
        [
          [x - 0.45, 2.2, 1.12],
          [x + 0.45, 2.2, 1.12],
          [x + 0.45, 0.9, 1.12],
        ],
        colors[index],
        0.54,
      );
      this.group.add(line);

      const sprite = makeSpriteLabel(label, index === 0 ? 'QUERY' : index === 1 ? 'KEY' : 'VALUE', {
        height: 0.24,
        color: '#141414',
        subColor: PALETTE.muted,
        fontSize: 42,
        subFontSize: 16,
        paddingX: 12,
        paddingY: 8,
      });
      sprite.position.set(x, 3.05, 1.3);
      this.group.add(sprite);
    });

    const caption = makeSpriteLabel('Q · K · V', 'THREE LEARNED PROJECTIONS', {
      height: 0.16,
      color: PALETTE.muted,
      subColor: PALETTE.muted,
      fontSize: 28,
      subFontSize: 14,
      paddingX: 10,
      paddingY: 6,
    });
    caption.position.set(-4.5, 4.15, 1.5);
    this.group.add(caption);
  }

  private buildArcs(): void {
    for (let from = 1; from < QUESTION_TOKENS.length; from += 1) {
      for (let to = 0; to < from; to += 1) {
        const start = this.tokenBasePositions[from].clone().add(new Vector3(0, 0.55, 0.35));
        const end = this.tokenBasePositions[to].clone().add(new Vector3(0, 0.55, 0.35));
        const middle = start.clone().lerp(end, 0.5);
        middle.y += 1.0 + (from - to) * 0.28;
        middle.z += 0.65;
        const curve = new QuadraticBezierCurve3(start, middle, end);
        const mesh = new Mesh(
          new TubeGeometry(curve, 26, this.quality.isMobile ? 0.012 : 0.016, 4, false),
          new MeshBasicMaterial({
            color: PALETTE.orange,
            transparent: true,
            opacity: 0.1,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        mesh.renderOrder = 4;
        this.arcs.push({ mesh, from, to });
        this.group.add(mesh);
      }
    }
  }

  private buildLabels(): void {
    const header = makeSpriteLabel('SELF-ATTENTION / 自注意力', 'CAUSAL CONTEXT MIXING · 6 TOKENS', {
      height: 0.27,
      color: PALETTE.ink,
      subColor: PALETTE.muted,
      fontSize: 38,
      subFontSize: 16,
      paddingX: 16,
      paddingY: 9,
    });
    header.position.set(-5.8, 4.8, 1.4);
    this.labelGroup.add(header);

    const formula = makeSpriteLabel('softmax(QKᵀ / √d + M) V', 'SIMULATED WEIGHTS · NOT REAL ACTIVATIONS', {
      height: 0.2,
      color: PALETTE.graphite,
      subColor: PALETTE.orangeDeep,
      fontSize: 32,
      subFontSize: 15,
      paddingX: 14,
      paddingY: 8,
      background: 'rgba(244,243,239,0.78)',
      border: 'rgba(216,213,204,0.7)',
    });
    formula.position.set(3.5, -3.05, 2.2);
    this.labelGroup.add(formula);

    this.group.add(this.labelGroup);
  }

  update(frame: SceneFrame, intensity: number): void {
    const motion = frame.reducedMotion ? 0 : 1;
    const stageTime = frame.stageElapsed;
    const activity = Math.min(1, Math.max(0.05, intensity));

    this.group.rotation.y = Math.sin(frame.time * 0.14) * 0.025 * motion;

    for (let index = 0; index < this.tokenSlabs.length; index += 1) {
      const slab = this.tokenSlabs[index];
      const base = this.tokenBasePositions[index];
      slab.position.y = base.y + Math.sin(frame.time * 0.9 + index * 0.7) * 0.018 * motion;
    }

    for (let index = 0; index < this.qkvPlates.length; index += 1) {
      const plate = this.qkvPlates[index];
      const frameMaterial = this.qkvFrames[index].material as MeshBasicMaterial;
      frameMaterial.opacity = 0.44 + activity * 0.46;
      plate.rotation.z = Math.sin(stageTime * 0.25 + index) * 0.012 * motion;
    }

    const bucket = Math.floor(frame.time * 15);
    if (bucket !== this.lastColorUpdate) {
      this.lastColorUpdate = bucket;
      this.updateWeights(stageTime, activity);
      this.updateMatrixColors();
    }

    for (const arc of this.arcs) {
      const row = this.weights[arc.from];
      const weight = row ? row[arc.to] : 0;
      const material = arc.mesh.material as MeshBasicMaterial;
      material.opacity = 0.035 + weight * 0.82 * activity;
      arc.mesh.visible = material.opacity > 0.04;
    }
  }

  private updateWeights(time: number, activity: number): void {
    for (let row = 0; row < 6; row += 1) {
      const values: number[] = [];
      let sum = 0;
      for (let column = 0; column < 6; column += 1) {
        if (column > row) {
          values.push(0);
          continue;
        }
        const distance = row - column;
        const proximity = Math.exp(-distance * 0.58);
        const modulation = 0.72 + 0.28 * Math.sin(time * 0.55 + row * 1.3 + column * 2.1);
        const value = proximity * modulation * (0.7 + activity * 0.3);
        values.push(value);
        sum += value;
      }
      this.weights[row] = values.map((value) => (sum > 0 ? value / sum : 0));
    }
  }

  private updateMatrixColors(): void {
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const index = row * 6 + column;
        const weight = this.weights[row]?.[column] ?? 0;
        const causal = column <= row;
        const base = new Color(causal ? '#2c302b' : '#20221e');
        const target = new Color(PALETTE.orange);
        const color = base.clone().lerp(target, Math.min(1, weight * 3.1));
        this.matrixColors[index] = color;
        this.matrixCells.setColorAt(index, color);
      }
    }
    if (this.matrixCells.instanceColor) this.matrixCells.instanceColor.needsUpdate = true;
  }
}
