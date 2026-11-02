/**
 * Chapter 03 — the tokenizer.
 *
 * Laid out as a vertical instrument so the whole process stays inside the UI
 * safe area: the real sentence floats as ten paper character plates at the top,
 * a measuring comb and its orange scan plane travel across it, the strip opens
 * along the real Qwen2.5 token boundaries (3 / 2 / 1 / 2 / 1 / 1 characters),
 * the cut clusters drop through a guillotine blade, and six token slabs settle
 * onto the rail beneath. Source strip and tokens are on screen together.
 *
 * Every token text, vocab id and position comes from
 * `src/data/tokenization.ts`; nothing here splits the sentence by hand.
 */
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { QUESTION_TEXT, QUESTION_TOKENS } from '../../../data/tokenization';
import type { CameraPose, QualityInfo, SceneFrame, StageScene } from '../../types';
import { curveFromPoints, roundedBox, tickStrip } from '../../kit/geometry';
import { accentMaterial, glassMaterial } from '../../kit/materials';
import { createTokenSlab } from '../../kit/nodes';
import { PALETTE } from '../../kit/palette';
import { createDustField, createFlowParticles, dotTexture } from '../../kit/particles';
import { FONT_MONO, FONT_SANS, makeCanvasTexture, makeGlowTexture, roundedRect } from '../../kit/textures';
import {
  CameraTrack,
  clamp01,
  crisp,
  disposeTree,
  hairlineSegments,
  lerp,
  markShared,
  microLabel,
  smooth,
} from './localKit';

const CHAR_PITCH = 0.66;
const CHAR_WIDTH = 0.58;
const CHAR_HEIGHT = 0.76;
const CHAR_COUNT = Array.from(QUESTION_TEXT).length;

const STRIP_LEFT = -3.3;
const STRIP_RIGHT = STRIP_LEFT + CHAR_PITCH * CHAR_COUNT;
const STRIP_Y = 4.9;
const RULER_Y = STRIP_Y - CHAR_HEIGHT / 2 - 0.16;
const COMB_Y = 5.96;
const BLADE_Y = 4.02;

const SEAT_Y = 0.95;
const SEAT_STEP = 1.14;
const SEAT_FIRST = -((QUESTION_TOKENS.length - 1) * SEAT_STEP) / 2;
const SLAB_SCALE = 0.82;
const RAIL_HALF = 3.75;

const SCAN_FROM = -3.86;
const SCAN_TO = 3.86;
const GAP_SIZE = 0.13;

const CLUSTER_DEPART = 0.31;
const CLUSTER_STAGGER = 0.048;
const CLUSTER_FLIGHT = 0.13;
const SLAB_APPEAR = 0.46;
const SLAB_STAGGER = 0.05;
const SLAB_SETTLE = 0.1;

const charBoundaryX = (charIndex: number): number => STRIP_LEFT + CHAR_PITCH * charIndex;
const TOKEN_BOUNDARY_CHARS = QUESTION_TOKENS.slice(1).map((token) => token.offsetStart);
const TOKEN_BOUNDARY_XS = TOKEN_BOUNDARY_CHARS.map(charBoundaryX);
const SEAT_XS = QUESTION_TOKENS.map((_, index) => SEAT_FIRST + index * SEAT_STEP);

const SEAT_EMPTY = new Color('#8c8c84');
const SEAT_FILLED = new Color(PALETTE.orange);

interface TextCluster {
  readonly group: Group;
  readonly baseCenter: number;
  readonly index: number;
  readonly materials: MeshBasicMaterial[];
}

interface SlabSlot {
  readonly group: Group;
  readonly seatX: number;
  readonly index: number;
}

function makeCharCard(glyph: string, index: number): CanvasTexture {
  const width = 260;
  const height = 340;
  return crisp(makeCanvasTexture(width, height, (context, w, h) => {
    context.fillStyle = 'rgba(253, 252, 249, 0.97)';
    roundedRect(context, 5, 5, w - 10, h - 10, 10);
    context.fill();
    context.strokeStyle = 'rgba(20, 20, 20, 0.26)';
    context.lineWidth = 2;
    roundedRect(context, 5, 5, w - 10, h - 10, 10);
    context.stroke();

    context.fillStyle = 'rgba(20, 20, 20, 0.26)';
    context.fillRect(w / 2 - 12, 20, 24, 2);

    context.fillStyle = PALETTE.ink;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `500 150px ${FONT_SANS}`;
    context.fillText(glyph, w / 2, h / 2 + 6);

    context.fillStyle = PALETTE.muted;
    context.textAlign = 'left';
    context.font = `400 28px ${FONT_MONO}`;
    context.fillText(String(index + 1).padStart(2, '0'), 20, h - 34);
  }));
}

function makeBeamTexture(): CanvasTexture {
  return crisp(makeCanvasTexture(128, 512, (context, w, h) => {
    const core = context.createLinearGradient(0, 0, 0, h);
    core.addColorStop(0, 'rgba(228, 87, 42, 0)');
    core.addColorStop(0.14, 'rgba(228, 87, 42, 0.45)');
    core.addColorStop(0.5, 'rgba(228, 87, 42, 1)');
    core.addColorStop(0.86, 'rgba(228, 87, 42, 0.45)');
    core.addColorStop(1, 'rgba(228, 87, 42, 0)');
    context.fillStyle = core;
    context.fillRect(w * 0.4, 0, w * 0.2, h);

    const halo = context.createLinearGradient(0, 0, 0, h);
    halo.addColorStop(0, 'rgba(228, 87, 42, 0)');
    halo.addColorStop(0.5, 'rgba(228, 87, 42, 0.3)');
    halo.addColorStop(1, 'rgba(228, 87, 42, 0)');
    context.fillStyle = halo;
    context.fillRect(w * 0.18, 0, w * 0.64, h);
  }));
}

/**
 * Slab face for this chapter: token text, real vocab id and sequence position,
 * sized so all three stay readable on the compact rail.
 */
function makeSlabFace(token: (typeof QUESTION_TOKENS)[number]): CanvasTexture {
  const width = 512;
  const height = 420;
  return crisp(makeCanvasTexture(width, height, (context, w, h) => {
    context.fillStyle = 'rgba(252, 251, 247, 0.98)';
    roundedRect(context, 2, 2, w - 4, h - 4, 14);
    context.fill();
    context.strokeStyle = 'rgba(20, 20, 20, 0.26)';
    context.lineWidth = 3;
    roundedRect(context, 2, 2, w - 4, h - 4, 14);
    context.stroke();

    context.fillStyle = PALETTE.ink;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const glyphs = Array.from(token.display).length;
    context.font = `500 ${glyphs > 2 ? 132 : 158}px ${FONT_SANS}`;
    context.fillText(token.display, w / 2, 138);

    context.fillStyle = PALETTE.orangeDeep;
    context.font = `500 82px ${FONT_MONO}`;
    context.fillText(`#${token.id}`, w / 2, 258);

    context.strokeStyle = 'rgba(20, 20, 20, 0.16)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(50, 300);
    context.lineTo(w - 50, 300);
    context.stroke();

    context.fillStyle = PALETTE.graphiteSoft;
    context.font = `500 44px ${FONT_MONO}`;
    context.fillText(`POS ${String(token.index).padStart(2, '0')}`, w / 2, 348);
  }));
}

export class TokenizerScene implements StageScene {
  readonly group: Group;
  readonly pickables: Object3D[];

  private readonly bodyMaterial: MeshStandardMaterial;
  private readonly trimMaterial: MeshStandardMaterial;
  private readonly track: CameraTrack;
  private readonly clusters: TextCluster[] = [];
  private readonly slabs: SlabSlot[] = [];
  private readonly gaps: number[] = new Array(TOKEN_BOUNDARY_CHARS.length).fill(0);
  private readonly comb: Group;
  private readonly beam: Mesh;
  private readonly beamGlow: Sprite;
  private readonly flash: Mesh;
  private readonly seats: InstancedMesh;
  private readonly railFlow: ReturnType<typeof createFlowParticles>;
  private readonly dust: ReturnType<typeof createDustField>;
  private readonly seatColor = new Color();

  constructor(quality: QualityInfo) {
    this.group = new Group();
    this.group.name = 'TokenizerScene';
    this.pickables = [];

    this.bodyMaterial = new MeshStandardMaterial({
      color: new Color('#3c3d37'),
      roughness: 0.48,
      metalness: 0.3,
    });
    this.trimMaterial = new MeshStandardMaterial({
      color: new Color('#87887f'),
      roughness: 0.32,
      metalness: 0.55,
    });

    const strip = this.buildStrip();
    const comb = this.buildComb();
    const cutter = this.buildCutter();
    const rail = this.buildRail();
    this.group.add(strip, comb.group, cutter, rail);

    const guide: number[] = [-4.05, COMB_Y + 0.24, -0.42, 4.05, COMB_Y + 0.24, -0.42];
    guide.push(
      -4.05, COMB_Y + 0.16, -0.42, -4.05, COMB_Y + 0.32, -0.42,
      4.05, COMB_Y + 0.16, -0.42, 4.05, COMB_Y + 0.32, -0.42,
    );
    this.group.add(hairlineSegments(guide, PALETTE.graphiteSoft, 0.42));

    this.comb = comb.group;
    this.beam = comb.beam;
    this.beamGlow = comb.glow;
    this.flash = this.buildFlash();
    this.group.add(this.flash);
    if (quality.nodeScale >= 0.7) {
      this.group.add(this.buildFloorScale(), this.buildBackdrop());
    }

    cutter.userData.infoId = 'tokenizer';
    rail.userData.infoId = 'token-rail';
    this.pickables.push(cutter, rail);

    // Six real token slabs, hidden until the blade emits them.
    QUESTION_TOKENS.forEach((token, index) => {
      const slab = createTokenSlab(token);
      delete slab.group.userData.infoId;
      slab.label.scale.setScalar(0.82);
      const faceMaterial = slab.label.material as MeshBasicMaterial;
      faceMaterial.map?.dispose();
      faceMaterial.map = makeSlabFace(token);
      faceMaterial.needsUpdate = true;
      slab.group.position.set(SEAT_XS[index], SEAT_Y, 0);
      slab.group.scale.setScalar(0.004);
      slab.group.visible = false;
      rail.add(slab.group);
      this.slabs.push({ group: slab.group, seatX: SEAT_XS[index], index });
    });

    const seatMesh = new InstancedMesh(
      roundedBox(0.34, 0.04, 0.5, 0.012),
      new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      QUESTION_TOKENS.length,
    );
    const matrix = new Matrix4();
    SEAT_XS.forEach((seatX, index) => {
      matrix.makeTranslation(seatX, 0.195, 0);
      seatMesh.setMatrixAt(index, matrix);
      seatMesh.setColorAt(index, SEAT_EMPTY);
    });
    seatMesh.instanceMatrix.needsUpdate = true;
    if (seatMesh.instanceColor) seatMesh.instanceColor.needsUpdate = true;
    seatMesh.frustumCulled = false;
    this.seats = seatMesh;
    this.group.add(seatMesh);

    this.railFlow = createFlowParticles(
      curveFromPoints([
        [-3.6, SEAT_Y, 0.32],
        [3.6, SEAT_Y, 0.32],
      ]),
      {
        count: Math.round(16 + 20 * quality.nodeScale),
        color: PALETTE.orange,
        size: 0.06,
        speed: 0.12,
        opacity: 0.75,
        jitter: 0.04,
      },
    );
    markShared(dotTexture());
    this.group.add(this.railFlow.object);

    this.dust = createDustField({
      count: Math.round(22 + 40 * quality.nodeScale),
      area: [9, 6.4, 3],
      center: new Vector3(0, 3.1, 0),
      color: PALETTE.muted,
      size: 0.05,
      opacity: 0.15,
      drift: 0.05,
    });
    this.group.add(this.dust.object);

    this.track = new CameraTrack([
      { at: 0, position: [0, 5.25, 22.8], subject: [0, STRIP_Y, 0], screen: [0.6076, 0.44], fov: 34 },
      { at: 0.34, position: [0.8, 5.0, 22.4], subject: [0, 4.5, 0], screen: [0.6076, 0.45], fov: 34.5 },
      { at: 0.62, position: [0.3, 4.0, 22.0], subject: [0, 3.4, 0], screen: [0.6076, 0.47], fov: 35 },
      { at: 0.9, position: [0, 3.2, 22.8], subject: [0, 2.7, 0], screen: [0.6076, 0.5], fov: 34 },
      { at: 1, position: [0.5, 3.3, 23.2], subject: [0, 2.7, 0], screen: [0.6, 0.5], fov: 34 },
    ]);
  }

  private buildStrip(): Group {
    const strip = new Group();
    strip.name = 'tokenizer-source-strip';

    QUESTION_TOKENS.forEach((token, index) => {
      const cluster = new Group();
      const center = (charBoundaryX(token.offsetStart) + charBoundaryX(token.offsetEnd)) / 2;
      const glyphs = Array.from(QUESTION_TEXT).slice(token.offsetStart, token.offsetEnd);
      const materials: MeshBasicMaterial[] = [];

      glyphs.forEach((glyph, offset) => {
        const card = makeCharCard(glyph, token.offsetStart + offset);
        const material = new MeshBasicMaterial({
          map: card,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          side: DoubleSide,
        });
        const plate = new Mesh(new PlaneGeometry(CHAR_WIDTH, CHAR_HEIGHT), material);
        plate.position.set(charBoundaryX(token.offsetStart) + CHAR_PITCH * (offset + 0.5) - center, 0, 0);
        plate.renderOrder = 6;
        cluster.add(plate);
        materials.push(material);
      });

      cluster.position.set(center, STRIP_Y, 0);
      strip.add(cluster);
      this.clusters.push({ group: cluster, baseCenter: center, index, materials });
    });

    // Character ruler: the ten-character grid the tokens do not follow.
    const charTicks: number[] = [STRIP_LEFT, RULER_Y, 0, STRIP_RIGHT, RULER_Y, 0];
    for (let slot = 0; slot <= CHAR_COUNT; slot += 1) {
      const x = charBoundaryX(slot);
      charTicks.push(x, RULER_Y, 0, x, RULER_Y + 0.08, 0);
    }
    strip.add(hairlineSegments(charTicks, PALETTE.graphiteSoft, 0.6));

    const tokenTicks: number[] = [];
    TOKEN_BOUNDARY_XS.forEach((x) => {
      tokenTicks.push(x, RULER_Y - 0.16, 0, x, RULER_Y + 0.26, 0);
    });
    strip.add(hairlineSegments(tokenTicks, PALETTE.orange, 1));

    return strip;
  }

  private buildComb(): { group: Group; beam: Mesh; glow: Sprite } {
    const group = new Group();
    group.name = 'tokenizer-comb';

    const body = new Mesh(roundedBox(1.24, 0.14, 0.4, 0.04), this.bodyMaterial);
    body.position.y = COMB_Y;
    body.castShadow = true;
    group.add(body);

    const slider = new Mesh(roundedBox(0.28, 0.1, 0.28, 0.03), this.trimMaterial);
    slider.position.y = COMB_Y + 0.13;
    group.add(slider);

    const indicator = new Mesh(roundedBox(0.5, 0.02, 0.02, 0.008), accentMaterial(PALETTE.orange));
    indicator.position.set(0, COMB_Y + 0.09, 0.21);
    group.add(indicator);

    const teeth = new InstancedMesh(new BoxGeometry(0.022, 0.52, 0.022), this.trimMaterial, 3);
    const matrix = new Matrix4();
    for (let index = -1; index <= 1; index += 1) {
      matrix.makeTranslation(index * CHAR_PITCH, COMB_Y - 0.33, 0);
      teeth.setMatrixAt(index + 1, matrix);
    }
    teeth.instanceMatrix.needsUpdate = true;
    teeth.frustumCulled = false;
    group.add(teeth);

    const beam = new Mesh(
      new PlaneGeometry(0.3, 0.94),
      new MeshBasicMaterial({
        map: makeBeamTexture(),
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
        opacity: 0.78,
      }),
    );
    beam.position.set(0, STRIP_Y + 0.6, 0.1);
    beam.renderOrder = 8;
    group.add(beam);

    const glow = new Sprite(
      new SpriteMaterial({
        map: makeGlowTexture(PALETTE.orange),
        color: PALETTE.orange,
        transparent: true,
        depthWrite: false,
        opacity: 0.4,
      }),
    );
    glow.scale.setScalar(1.1);
    glow.position.set(0, STRIP_Y + 0.52, 0.18);
    group.add(glow);

    group.position.x = SCAN_FROM;
    return { group, beam, glow };
  }

  /** Horizontal guillotine: the cut plane the character clusters drop through. */
  private buildCutter(): Group {
    const cutter = new Group();
    cutter.name = 'tokenizer-cutter';

    [-RAIL_HALF + 0.03, RAIL_HALF - 0.03].forEach((x) => {
      const post = new Mesh(roundedBox(0.1, 3.28, 0.1, 0.02), this.bodyMaterial);
      post.position.set(x, 2.28, -0.06);
      post.castShadow = true;
      cutter.add(post);

      const foot = new Mesh(roundedBox(0.36, 0.07, 0.36, 0.015), this.trimMaterial);
      foot.position.set(x, 0.035, -0.06);
      cutter.add(foot);
    });

    const blade = new Mesh(roundedBox(RAIL_HALF * 2, 0.09, 0.56, 0.02), this.bodyMaterial);
    blade.position.set(0, BLADE_Y, 0);
    blade.castShadow = true;
    cutter.add(blade);

    const upperEdge = new Mesh(roundedBox(RAIL_HALF * 2, 0.022, 0.06, 0.008), accentMaterial(PALETTE.orange));
    upperEdge.position.set(0, BLADE_Y + 0.06, 0.1);
    cutter.add(upperEdge);

    const lowerEdge = new Mesh(
      roundedBox(RAIL_HALF * 2, 0.022, 0.06, 0.008),
      accentMaterial(PALETTE.orangeLight),
    );
    lowerEdge.position.set(0, BLADE_Y - 0.06, 0.1);
    cutter.add(lowerEdge);

    return cutter;
  }

  private buildRail(): Group {
    const rail = new Group();
    rail.name = 'tokenizer-rail';

    const plinth = new Mesh(roundedBox(RAIL_HALF * 2, 0.18, 1.4, 0.02), this.bodyMaterial);
    plinth.position.set(0, 0.09, 0);
    plinth.receiveShadow = true;
    rail.add(plinth);

    [-0.24, 0.24].forEach((z) => {
      const beam = new Mesh(roundedBox(RAIL_HALF * 2 - 0.2, 0.045, 0.05, 0.014), this.trimMaterial);
      beam.position.set(0, 0.2, z);
      rail.add(beam);
    });

    const cradles = new InstancedMesh(
      roundedBox(0.46, 0.14, 0.58, 0.02),
      glassMaterial({ opacity: 0.32 }),
      SEAT_XS.length,
    );
    const matrix = new Matrix4();
    SEAT_XS.forEach((seatX, index) => {
      matrix.makeTranslation(seatX, 0.24, 0);
      cradles.setMatrixAt(index, matrix);
    });
    cradles.instanceMatrix.needsUpdate = true;
    cradles.frustumCulled = false;
    rail.add(cradles);

    rail.add(
      tickStrip(6.3, 42, {
        axis: 'x',
        color: PALETTE.graphite,
        opacity: 0.34,
        tickSize: 0.05,
        majorEvery: 7,
        origin: new Vector3(0, 0.09, 0.712),
      }),
    );

    const label = microLabel(`${CHAR_COUNT} CHARS → ${QUESTION_TOKENS.length} TOKENS`, 'QWEN2.5 · REAL IDS', {
      height: 0.56,
    });
    label.position.set(0, 2.95, 0.6);
    rail.add(label);

    return rail;
  }

  private buildFloorScale(): Group {
    const scale = new Group();
    scale.name = 'tokenizer-floor-scale';
    const segments: number[] = [];
    [-1.55, 1.55].forEach((z) => {
      segments.push(-4.6, 0.012, z, 4.6, 0.012, z);
      for (let step = 0; step <= 18; step += 1) {
        const x = -4.5 + step * 0.5;
        const length = step % 5 === 0 ? 0.2 : 0.1;
        segments.push(x, 0.012, z, x, 0.012, z + length);
      }
    });
    scale.add(hairlineSegments(segments, PALETTE.graphiteSoft, 0.2));
    return scale;
  }

  /** Reference plane behind the instrument: depth without a coloured card. */
  private buildBackdrop(): Group {
    const backdrop = new Group();
    backdrop.name = 'tokenizer-backdrop';
    const segments: number[] = [];
    const z = -1.7;
    for (let step = 0; step <= 9; step += 1) {
      const x = -4.2 + step;
      segments.push(x, 0.1, z, x, 6.2, z);
    }
    for (let step = 0; step <= 6; step += 1) {
      const y = 0.1 + step;
      segments.push(-4.2, y, z, 4.2, y, z);
    }
    backdrop.add(hairlineSegments(segments, PALETTE.graphiteSoft, 0.1));
    return backdrop;
  }

  private buildFlash(): Mesh {
    const flash = new Mesh(
      new PlaneGeometry(0.05, 0.9),
      new MeshBasicMaterial({
        color: new Color(PALETTE.orange),
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    flash.position.set(TOKEN_BOUNDARY_XS[0], STRIP_Y, 0.16);
    flash.renderOrder = 9;
    return flash;
  }

  update(frame: SceneFrame): void {
    const p = clamp01(frame.stageProgress);
    const ambient = frame.reducedMotion ? 0 : frame.stageElapsed;

    // ---- scanning comb and beam ----
    const scan = smooth(p, 0.06, 0.34);
    // After the cut the comb returns to its rest position on the left.
    const retract = smooth(p, 0.42, 0.6);
    const beamX = lerp(lerp(SCAN_FROM, SCAN_TO, scan), SCAN_FROM, retract);
    this.comb.position.x = beamX;
    const flicker = 0.8 + 0.2 * Math.sin(ambient * 8.5 + beamX * 3.4);
    const beamVisible = scan > 0.001 && scan < 0.999;
    this.beam.visible = beamVisible;
    this.beamGlow.visible = beamVisible;
    (this.beam.material as MeshBasicMaterial).opacity = 0.78 * flicker;
    (this.beamGlow.material as SpriteMaterial).opacity = 0.4 * flicker;

    // ---- cut burst on the nearest real token boundary ----
    let nearest = TOKEN_BOUNDARY_XS[0];
    let best = Number.POSITIVE_INFINITY;
    TOKEN_BOUNDARY_XS.forEach((x) => {
      const distance = Math.abs(x - beamX);
      if (distance < best) {
        best = distance;
        nearest = x;
      }
    });
    const burst = Math.exp(-(best * best) / 0.018) * 0.9 * (1 - smooth(p, 0.34, 0.4));
    this.flash.position.x = nearest;
    this.flash.scale.setScalar(0.55 + burst * 0.55);
    (this.flash.material as MeshBasicMaterial).opacity = burst;

    // ---- the strip opens only along real token boundaries ----
    const cutProgress = smooth(p, 0.06, 0.4);
    TOKEN_BOUNDARY_CHARS.forEach((charIndex, gapIndex) => {
      const x = charBoundaryX(charIndex);
      this.gaps[gapIndex] = smooth(beamX, x, x + 0.34) * GAP_SIZE;
      // Retracting comb must not close a gap that has already been cut.
      if (p > 0.4) this.gaps[gapIndex] = Math.max(this.gaps[gapIndex], GAP_SIZE * cutProgress);
    });

    // The cut sentence stays on screen as a dimmed reference so the 10-char ->
    // 6-token comparison is readable for the whole chapter.
    let offset = 0;
    this.clusters.forEach((cluster) => {
      const depart = CLUSTER_DEPART + cluster.index * CLUSTER_STAGGER;
      const arrive = depart + CLUSTER_FLIGHT;
      const cut = smooth(p, depart, arrive);
      const x = cluster.baseCenter + offset;

      cluster.group.position.set(x, STRIP_Y - cut * 0.04, 0);
      cluster.group.scale.setScalar(1 - cut * 0.06);
      cluster.materials.forEach((material) => {
        material.opacity = lerp(1, 0.78, cut);
      });

      offset += this.gaps[cluster.index] ?? 0;
    });

    // ---- the blade drops each token onto its own seat ----
    this.slabs.forEach((slot) => {
      const appearAt = SLAB_APPEAR + slot.index * SLAB_STAGGER;
      const settle = smooth(p, appearAt, appearAt + SLAB_SETTLE);

      slot.group.position.set(slot.seatX, lerp(SEAT_Y + 0.42, SEAT_Y, settle), 0);
      slot.group.scale.setScalar(Math.max(0.004, lerp(0.05, SLAB_SCALE, settle)));
      slot.group.visible = settle > 0.002;

      this.seatColor
        .copy(SEAT_EMPTY)
        .lerp(SEAT_FILLED, smooth(p, appearAt + SLAB_SETTLE - 0.04, appearAt + SLAB_SETTLE + 0.03));
      this.seats.setColorAt(slot.index, this.seatColor);
    });
    if (this.seats.instanceColor) this.seats.instanceColor.needsUpdate = true;

    this.railFlow.update(ambient, smooth(p, 0.5, 0.9));
    this.dust.update(ambient);
  }

  cameraPose(frame: SceneFrame, aspect: number): CameraPose {
    return this.track.sample(frame.stageProgress, aspect);
  }

  dispose(): void {
    disposeTree(this.group);
  }
}
