import {
  Group,
  Line,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { SceneFrame } from '../../types';
import { lineFromPoints, roundedBox, tickStrip } from '../../kit/geometry';
import { accentMaterial, glassMaterial } from '../../kit/materials';
import { PALETTE } from '../../kit/palette';
import { makeSpriteLabel } from '../../kit/textures';
import type { QualityInfo } from '../../types';

type TowerMode = 'transformer' | 'prefill' | 'decode';

interface BlockVisual {
  group: Group;
  glass: Mesh;
  edge: Line;
  glow: Line;
  plate: Mesh;
  baselineY: number;
}

interface InnerVisual {
  mesh: Mesh;
  baseOpacity: number;
}

interface LayerBar {
  mesh: Mesh;
  cap: Mesh;
  index: number;
}

const BLOCK_COUNT = 8;
const BLOCK_START_Y = 3.2;
const BLOCK_STEP = 3.05;
const BLOCK_WIDTH = 15;
const BLOCK_DEPTH = 9;
const BLOCK_HEIGHT = 2.18;

export class LayerTower {
  readonly group = new Group();
  readonly pickables: Group[] = [];
  private readonly blocks: BlockVisual[] = [];
  private readonly inners: InnerVisual[] = [];
  private readonly layerBars: LayerBar[] = [];
  private readonly pulses: Mesh[] = [];
  private readonly crown = new Group();
  private readonly quality: QualityInfo;

  constructor(quality: QualityInfo) {
    this.quality = quality;
    this.group.name = 'model-tower';
    this.buildBase();
    this.buildBlocks();
    this.buildCrown();
    this.buildPulses();
    this.group.userData.infoId = 'transformer-tower';
    this.pickables.push(this.group);
  }

  private buildBase(): void {
    const plinth = new Mesh(
      roundedBox(21, 0.3, 15, 0.08),
      glassMaterial({ color: '#d9ddda', opacity: 0.26, roughness: 0.18 }),
    );
    plinth.position.y = 0.2;
    plinth.receiveShadow = true;
    this.group.add(plinth);

    const baseEdge = lineFromPoints(
      [
        [-10.5, 0.36, 7.5],
        [10.5, 0.36, 7.5],
        [10.5, 0.36, -7.5],
        [-10.5, 0.36, -7.5],
        [-10.5, 0.36, 7.5],
      ],
      PALETTE.graphite,
      0.22,
    );
    this.group.add(baseEdge);

    const baseTicks = tickStrip(19, 38, {
      axis: 'x',
      color: PALETTE.graphite,
      opacity: 0.2,
      tickSize: 0.09,
      majorEvery: 4,
      origin: new Vector3(0, 0.38, 7.55),
    });
    this.group.add(baseTicks);

    const baseLabel = makeSpriteLabel('TRANSFORMER / 模型核心', 'N LAYERS · WEIGHT MATRICES · RESIDUAL STREAM', {
      height: 0.24,
      color: PALETTE.ink,
      subColor: PALETTE.muted,
      fontSize: 40,
      subFontSize: 18,
      paddingX: 16,
      paddingY: 10,
    });
    baseLabel.position.set(-10.9, 0.65, 7.1);
    this.group.add(baseLabel);

    const spine = new Mesh(
      roundedBox(0.045, 25.2, 0.045, 0.01),
      accentMaterial(PALETTE.orange),
    );
    spine.position.set(0, BLOCK_START_Y + 12.9, -3.9);
    this.group.add(spine);
  }

  private buildBlocks(): void {
    for (let index = 0; index < BLOCK_COUNT; index += 1) {
      const group = new Group();
      const y = BLOCK_START_Y + index * BLOCK_STEP;
      group.position.y = y;

      const glass = new Mesh(
        roundedBox(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH, 0.06),
        glassMaterial({
          color: index === 3 ? '#cfdad7' : '#d8e1de',
          opacity: index === 3 ? 0.085 : 0.035,
          roughness: 0.12,
        }),
      );
      glass.castShadow = index === 3;
      glass.visible = false;
      group.add(glass);

      const edge = lineFromPoints(
        [
          [-BLOCK_WIDTH / 2, -BLOCK_HEIGHT / 2, BLOCK_DEPTH / 2],
          [BLOCK_WIDTH / 2, -BLOCK_HEIGHT / 2, BLOCK_DEPTH / 2],
          [BLOCK_WIDTH / 2, BLOCK_HEIGHT / 2, BLOCK_DEPTH / 2],
          [-BLOCK_WIDTH / 2, BLOCK_HEIGHT / 2, BLOCK_DEPTH / 2],
          [-BLOCK_WIDTH / 2, -BLOCK_HEIGHT / 2, BLOCK_DEPTH / 2],
        ],
        PALETTE.graphite,
        0.22,
      );
      group.add(edge);

      const backEdge = lineFromPoints(
        [
          [-BLOCK_WIDTH / 2, 0, -BLOCK_DEPTH / 2],
          [BLOCK_WIDTH / 2, 0, -BLOCK_DEPTH / 2],
        ],
        PALETTE.graphite,
        0.08,
      );
      group.add(backEdge);

      const glow = lineFromPoints(
        [
          [-BLOCK_WIDTH * 0.36, -BLOCK_HEIGHT / 2 + 0.05, BLOCK_DEPTH / 2 + 0.02],
          [BLOCK_WIDTH * 0.36, -BLOCK_HEIGHT / 2 + 0.05, BLOCK_DEPTH / 2 + 0.02],
        ],
        PALETTE.orange,
        0.28,
      );
      group.add(glow);

      const plate = new Mesh(
        roundedBox(BLOCK_WIDTH * 0.3, 0.06, 0.02, 0.01),
        accentMaterial(index === 3 ? PALETTE.orange : PALETTE.graphiteSoft),
      );
      plate.position.set(
        -BLOCK_WIDTH * 0.2,
        -BLOCK_HEIGHT / 2 + 0.08,
        BLOCK_DEPTH / 2 + 0.035,
      );
      group.add(plate);

      // A faint internal activation layer, visible only at grazing angles.
      const inner = new Mesh(
        roundedBox(BLOCK_WIDTH * 0.84, 0.02, BLOCK_DEPTH * 0.7, 0.005),
        new MeshBasicMaterial({
          color: index === 3 ? PALETTE.orange : PALETTE.graphiteSoft,
          transparent: true,
          opacity: index === 3 ? 0.07 : 0.018,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      inner.position.y = 0.05;
      inner.visible = false;
      this.inners.push({ mesh: inner, baseOpacity: index === 3 ? 0.07 : 0.018 });
      group.add(inner);

      const label = makeSpriteLabel(
        `L${String(index * 4 + 1).padStart(2, '0')}–${String(index * 4 + 4).padStart(2, '0')}`,
        undefined,
        {
          height: 0.16,
          color: PALETTE.muted,
          fontSize: 34,
          paddingX: 12,
          paddingY: 8,
        },
      );
      label.position.set(-BLOCK_WIDTH / 2 - 0.55, 0, BLOCK_DEPTH / 2);
      group.add(label);

      this.blocks.push({ group, glass, edge, glow, plate, baselineY: y });
      group.visible = false;
      this.group.add(group);

      // A lighter, instrument-like layer stack replaces the heavy glass volumes.
      const bar = new Mesh(
        roundedBox(12.8, 0.035, 0.045, 0.012),
        new MeshBasicMaterial({
          color: PALETTE.graphite,
          transparent: true,
          opacity: 0.28,
          toneMapped: false,
        }),
      );
      bar.position.set(0, y - BLOCK_HEIGHT / 2 + 0.1, BLOCK_DEPTH / 2 + 0.05);
      const cap = new Mesh(
        roundedBox(0.55, 0.08, 0.06, 0.015),
        new MeshBasicMaterial({ color: PALETTE.orange, toneMapped: false }),
      );
      cap.position.set(5.9, y - BLOCK_HEIGHT / 2 + 0.1, BLOCK_DEPTH / 2 + 0.05);
      cap.scale.x = 0.6;
      this.layerBars.push({ mesh: bar, cap, index });
      this.group.add(bar, cap);
    }
  }

  private buildCrown(): void {
    const topY = BLOCK_START_Y + (BLOCK_COUNT - 1) * BLOCK_STEP + BLOCK_HEIGHT / 2 + 1.8;
    this.crown.position.y = topY;

    const ringA = new Mesh(
      new TorusGeometry(5.6, 0.022, 5, 128),
      new MeshBasicMaterial({ color: PALETTE.graphite, transparent: true, opacity: 0.38 }),
    );
    ringA.rotation.x = Math.PI / 2;
    this.crown.add(ringA);

    const ringB = new Mesh(
      new TorusGeometry(4.7, 0.012, 4, 96),
      new MeshBasicMaterial({ color: PALETTE.orange, transparent: true, opacity: 0.34 }),
    );
    ringB.rotation.x = Math.PI / 2;
    this.crown.add(ringB);

    for (let index = 0; index < 28; index += 1) {
      const angle = (index / 28) * Math.PI * 2;
      const outer = 5.0 + (index % 4 === 0 ? 0.5 : 0.22);
      const tick = lineFromPoints(
        [
          [Math.cos(angle) * 4.8, 0, Math.sin(angle) * 4.8],
          [Math.cos(angle) * outer, 0, Math.sin(angle) * outer],
        ],
        index % 4 === 0 ? PALETTE.orange : PALETTE.graphite,
        index % 4 === 0 ? 0.42 : 0.16,
      );
      this.crown.add(tick);
    }

    const crownLabel = makeSpriteLabel('× 28 LAYERS', 'EACH BLOCK REPRESENTS A GROUP OF LAYERS', {
      height: 0.22,
      color: PALETTE.ink,
      subColor: PALETTE.muted,
      fontSize: 38,
      subFontSize: 16,
      paddingX: 15,
      paddingY: 8,
    });
    crownLabel.position.set(5.8, 2.2, 0);
    this.crown.add(crownLabel);

    this.group.add(this.crown);
  }

  private buildPulses(): void {
    for (let index = 0; index < 5; index += 1) {
      const pulse = new Mesh(
        new SphereGeometry(this.quality.isMobile ? 0.075 : 0.055, 8, 6),
        accentMaterial(PALETTE.orange),
      );
      pulse.position.set(0, BLOCK_START_Y + index * 4.2, -3.9);
      this.pulses.push(pulse);
      this.group.add(pulse);
    }
  }

  update(frame: SceneFrame, mode: TowerMode, focus: number, activity: number): void {
    const motion = frame.reducedMotion ? 0 : 1;
    const time = frame.stageElapsed;
    const selected = mode === 'transformer' ? 3 : mode === 'prefill' ? Math.floor(focus * BLOCK_COUNT) : 3;

    for (let index = 0; index < this.blocks.length; index += 1) {
      const block = this.blocks[index];
      const distance = Math.abs(index - selected);
      const local = Math.max(0, 1 - distance * 0.32);
      const active = local * activity;
      block.group.visible = false;
      block.plate.scale.x = 0.65 + active * 0.75;

      const bar = this.layerBars[index];
      if (bar) {
        const material = bar.mesh.material as MeshBasicMaterial;
        material.opacity = 0.18 + active * 0.64;
        const capMaterial = bar.cap.material as MeshBasicMaterial;
        capMaterial.opacity = 0.35 + active * 0.65;
        bar.cap.scale.x = 0.5 + active * 0.9;
        bar.mesh.position.y =
          block.baselineY -
          BLOCK_HEIGHT / 2 +
          0.1 +
          Math.sin(frame.time * 0.3 + index) * 0.008 * motion;
      }
    }

    this.crown.rotation.y = frame.time * 0.035 * motion;
    this.crown.position.y =
      BLOCK_START_Y + (BLOCK_COUNT - 1) * BLOCK_STEP + BLOCK_HEIGHT / 2 + 1.8 + Math.sin(frame.time * 0.4) * 0.025 * motion;

    for (let index = 0; index < this.pulses.length; index += 1) {
      const pulse = this.pulses[index];
      const base = ((time * (mode === 'prefill' ? 0.35 : 0.18) + index / this.pulses.length) % 1);
      pulse.position.y =
        BLOCK_START_Y -
        1.0 +
        base * ((BLOCK_COUNT - 1) * BLOCK_STEP + BLOCK_HEIGHT + 4);
      pulse.position.x = Math.sin(frame.time * 0.7 + index) * 0.1;
      pulse.scale.setScalar(0.65 + (1 - base) * 0.6 + (mode === 'prefill' ? 0.2 : 0));
      (pulse.material as MeshBasicMaterial).opacity = 0.2 + activity * 0.65;
    }

    const wise = this.group.userData as { infoId?: string };
    wise.infoId = 'transformer-tower';
  }
}
