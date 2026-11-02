import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import { candidatesFor, softmaxWithTemperature } from '../../../data/sampling';
import { ANSWER_TOKENS } from '../../../data/tokenization';
import { lineFromPoints, roundedBox, tubeAlong } from '../../kit/geometry';
import { accentMaterial, smokedGlassMaterial } from '../../kit/materials';
import { PALETTE } from '../../kit/palette';
import { makeGlowTexture, makeSpriteLabel } from '../../kit/textures';
import type { QualityInfo, SceneFrame } from '../../types';

const BAR_COUNT = 9;
const ORB_COUNT = 12;

interface Orb {
  sprite: Sprite;
  active: boolean;
  start: number;
}

export class OutputHead {
  readonly group = new Group();
  readonly pickables: Group[] = [];
  private readonly ringGroup = new Group();
  private readonly bars: Array<{ pivot: Group; bar: Mesh }> = [];
  private readonly barsGroup = new Group();
  private readonly core: Mesh;
  private readonly orbs: Orb[] = [];
  private readonly railCurve: CatmullRomCurve3;
  private lastGenerated = -1;
  private lastStage = -1;
  private generated = 0;
  private lastDistribution = '';

  constructor(_quality: QualityInfo) {
    this.group.name = 'output-head';
    this.railCurve = new CatmullRomCurve3([
      new Vector3(0, 0, 0.5),
      new Vector3(3.8, -0.8, 2.4),
      new Vector3(8.0, 0.2, 5.5),
      new Vector3(13.5, 1.4, 9.0),
      new Vector3(19.0, 2.6, 13.0),
    ]);

    this.buildRing();
    this.buildBars();
    this.buildRail();
    this.buildOrbs();
    this.buildLabels();
    this.group.userData.infoId = 'logits';
    this.ringGroup.userData.infoId = 'logits';
    this.barsGroup.userData.infoId = 'sampler';
    this.pickables.push(this.ringGroup, this.barsGroup);

    this.core = new Mesh(
      new SphereGeometry(0.22, 20, 14),
      new MeshBasicMaterial({ color: PALETTE.orange, toneMapped: false }),
    );
    this.ringGroup.add(this.core);
  }

  private buildRing(): void {
    const backing = new Mesh(
      new CircleGeometry(2.55, 64),
      smokedGlassMaterial({ color: '#1d211d', opacity: 0.58, metalness: 0.2, roughness: 0.15 }),
    );
    backing.position.z = -0.25;
    this.ringGroup.add(backing);

    const ring = new Mesh(
      new TorusGeometry(2.55, 0.04, 8, 96),
      accentMaterial(PALETTE.graphiteSoft),
    );
    this.ringGroup.add(ring);

    const ringInner = new Mesh(
      new TorusGeometry(2.32, 0.012, 5, 96),
      accentMaterial(PALETTE.orange),
    );
    this.ringGroup.add(ringInner);

    const radialGeometry = new BufferGeometry();
    const positions: number[] = [];
    for (let index = 0; index < 36; index += 1) {
      const angle = (index / 36) * Math.PI * 2;
      const inner = index % 3 === 0 ? 2.32 : 2.42;
      positions.push(Math.cos(angle) * inner, Math.sin(angle) * inner, 0.04);
      positions.push(Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, 0.04);
    }
    radialGeometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    this.ringGroup.add(
      new LineSegments(
        radialGeometry,
        new LineBasicMaterial({ color: PALETTE.orange, transparent: true, opacity: 0.3 }),
      ),
    );

    for (let index = 0; index < 3; index += 1) {
      const arc = new Mesh(
        new TorusGeometry(2.72 + index * 0.17, 0.008, 4, 80, 1.4 + index * 0.4),
        new MeshBasicMaterial({
          color: index === 0 ? PALETTE.orange : PALETTE.graphite,
          transparent: true,
          opacity: 0.32 - index * 0.07,
          depthWrite: false,
        }),
      );
      arc.rotation.z = index * 2.1;
      this.ringGroup.add(arc);
    }

    this.group.add(this.ringGroup);
  }

  private buildBars(): void {
    for (let index = 0; index < BAR_COUNT; index += 1) {
      const angle = -Math.PI * 0.78 + (index / (BAR_COUNT - 1)) * Math.PI * 1.56;
      const pivot = new Group();
      pivot.rotation.z = angle + Math.PI / 2;
      const bar = new Mesh(
        roundedBox(0.075, 1, 0.075, 0.025),
        new MeshBasicMaterial({
          color: index === 0 ? PALETTE.orange : PALETTE.orangeLight,
          transparent: true,
          opacity: 0.6,
          toneMapped: false,
        }),
      );
      bar.position.y = 0.62;
      bar.scale.y = 0.35;
      pivot.add(bar);
      this.bars.push({ pivot, bar });
      this.barsGroup.add(pivot);
    }
    // A small dark glass orbit around the bars keeps them readable.
    const arc = new Mesh(
      new TorusGeometry(2.15, 0.016, 4, 64, Math.PI * 1.6),
      new MeshBasicMaterial({ color: PALETTE.graphite, transparent: true, opacity: 0.25 }),
    );
    arc.rotation.z = Math.PI * 0.2;
    this.barsGroup.add(arc);
    this.group.add(this.barsGroup);
  }

  private buildRail(): void {
    const rail = tubeAlong(
      this.railCurve,
      0.018,
      new MeshBasicMaterial({ color: PALETTE.graphite, transparent: true, opacity: 0.28 }),
      100,
      4,
    );
    this.group.add(rail);

    const accent = tubeAlong(
      this.railCurve,
      0.008,
      new MeshBasicMaterial({ color: PALETTE.orange, transparent: true, opacity: 0.5, toneMapped: false }),
      100,
      4,
    );
    accent.position.y = 0.04;
    this.group.add(accent);

    const exitLabel = makeSpriteLabel('TOKEN OUT / 生成', 'NEW TOKEN → DETOKENIZER → STREAM', {
      height: 0.2,
      color: PALETTE.muted,
      subColor: PALETTE.orange,
      fontSize: 28,
      subFontSize: 13,
      paddingX: 10,
      paddingY: 6,
    });
    exitLabel.position.set(15.8, 3.6, 10.5);
    this.group.add(exitLabel);
  }

  private buildOrbs(): void {
    const texture = makeGlowTexture(PALETTE.orange);
    for (let index = 0; index < ORB_COUNT; index += 1) {
      const sprite = new Sprite(
        new SpriteMaterial({
          map: texture,
          color: PALETTE.orange,
          transparent: true,
          depthWrite: false,
          opacity: 0.9,
        }),
      );
      sprite.scale.setScalar(0.55);
      sprite.visible = false;
      this.orbs.push({ sprite, active: false, start: 0 });
      this.group.add(sprite);
    }
  }

  private buildLabels(): void {
    const title = makeSpriteLabel('OUTPUT HEAD / 输出头', 'LOGITS → SOFTMAX → SAMPLE', {
      height: 0.23,
      color: PALETTE.ink,
      subColor: PALETTE.muted,
      fontSize: 34,
      subFontSize: 15,
      paddingX: 14,
      paddingY: 8,
    });
    title.position.set(-1.5, 3.9, 0.3);
    this.group.add(title);

    const vocab = makeSpriteLabel('VOCAB 151,665', 'SIMULATED LOGITS · TEMPERATURE-AWARE', {
      height: 0.18,
      color: PALETTE.orange,
      subColor: PALETTE.muted,
      fontSize: 28,
      subFontSize: 13,
      paddingX: 10,
      paddingY: 6,
    });
    vocab.position.set(2.7, -3.4, 0.2);
    this.group.add(vocab);

    const centerLabel = makeSpriteLabel('DECODE LOOP', 'ONE TOKEN AT A TIME', {
      height: 0.17,
      color: PALETTE.muted,
      subColor: PALETTE.muted,
      fontSize: 24,
      subFontSize: 12,
      paddingX: 9,
      paddingY: 5,
    });
    centerLabel.position.set(-3.2, -2.7, 0.2);
    this.group.add(centerLabel);

    const leader = lineFromPoints(
      [
        [-2.7, -2.55, 0.2],
        [-1.3, -2.2, 0.2],
        [-0.2, -1.4, 0.2],
      ],
      PALETTE.graphite,
      0.2,
    );
    this.group.add(leader);
  }

  update(frame: SceneFrame): void {
    const motion = frame.reducedMotion ? 0 : 1;
    this.generated = frame.generatedTokenCount;
    if (!this.group.visible) return;

    this.ringGroup.rotation.z = frame.time * 0.03 * motion;
    this.barsGroup.rotation.z = Math.sin(frame.time * 0.22) * 0.025 * motion;

    const pulseSpeed = frame.stageIndex === 6 ? 1.8 : 0.55;
    const pulse = 0.72 + Math.sin(frame.stageElapsed * pulseSpeed) * 0.16;
    this.core.scale.setScalar(pulse);
    (this.core.material as MeshBasicMaterial).color.setStyle(
      this.generated > 0 && frame.stageIndex === 6 ? PALETTE.orange : PALETTE.orangeLight,
    );

    const answerIndex = Math.max(0, Math.min(ANSWER_TOKENS.length - 1, this.generated - 1));
    const distributionKey = `${answerIndex}|${frame.temperature.toFixed(2)}`;
    if (distributionKey !== this.lastDistribution) {
      this.lastDistribution = distributionKey;
      this.updateBars(answerIndex, frame.temperature);
    }

    if (frame.stageIndex !== 6) {
      this.orbs.forEach((orb) => {
        orb.active = false;
        orb.sprite.visible = false;
      });
      this.lastStage = frame.stageIndex;
      if (frame.stageIndex < 6) this.generated = frame.generatedTokenCount;
      return;
    }

    if (this.lastStage !== 6) {
      this.orbs.forEach((orb) => {
        orb.active = false;
        orb.sprite.visible = false;
      });
      this.lastGenerated = this.generated - 1;
      this.lastStage = 6;
    }

    if (this.generated < this.lastGenerated) {
      this.orbs.forEach((orb) => {
        orb.active = false;
        orb.sprite.visible = false;
      });
      this.lastGenerated = this.generated;
    }

    if (this.generated > this.lastGenerated) {
      const count = Math.min(3, this.generated - this.lastGenerated);
      for (let index = 0; index < count; index += 1) {
        const orb = this.orbs.find((entry) => !entry.active) ?? this.orbs[0];
        orb.active = true;
        orb.start = frame.stageElapsed - index * 0.07;
        orb.sprite.visible = true;
      }
      this.lastGenerated = this.generated;
    }

    const lifetime = 1.5;
    for (const orb of this.orbs) {
      if (!orb.active) continue;
      const t = (frame.stageElapsed - orb.start) / lifetime;
      if (t >= 1) {
        orb.active = false;
        orb.sprite.visible = false;
        continue;
      }
      const eased = t * t * (3 - 2 * t);
      const pos = this.railCurve.getPointAt(Math.max(0, Math.min(1, eased)));
      orb.sprite.position.copy(pos);
      orb.sprite.scale.setScalar(0.55 + Math.sin(t * Math.PI) * 0.32);
      (orb.sprite.material as SpriteMaterial).opacity = 0.85 * (1 - t * 0.35);
    }
  }

  private updateBars(answerIndex: number, temperature: number): void {
    const candidates = candidatesFor(answerIndex);
    const scored = softmaxWithTemperature(candidates, temperature).sort((a, b) => b.probability - a.probability);
    this.bars.forEach((entry, index) => {
      const candidate = scored[index];
      const probability = candidate?.probability ?? 0;
      const length = 0.28 + Math.sqrt(probability) * 2.35;
      entry.bar.scale.y = length;
      entry.bar.position.y = 0.25 + length / 2;
      const material = entry.bar.material as MeshBasicMaterial;
      material.opacity = 0.22 + probability * 1.3;
      material.color.setStyle(index === 0 ? PALETTE.orange : PALETTE.orangeLight);
      entry.pivot.rotation.z = -Math.PI * 0.78 + (index / (BAR_COUNT - 1)) * Math.PI * 1.56 + Math.PI / 2;
    });
  }
}
