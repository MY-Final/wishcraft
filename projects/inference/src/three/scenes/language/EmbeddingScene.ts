/**
 * Chapter 04 — embedding.
 *
 * Six real token ids ride a feed rail from the left, cross an actual 3D
 * embedding-matrix wall (rows × dimensions × two layers) and leave as six
 * luminous concept vectors fanning out into a measured latent field.
 *
 * The 3D positions are the explicit, labelled low-dimensional projection from
 * `src/data/embedding.ts` — never real model weights.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  SphereGeometry,
  Sprite,
  Vector3,
} from 'three';
import { CONCEPT_VECTORS, EMBEDDING_DIMENSIONS } from '../../../data/embedding';
import { QUESTION_TOKENS, type TokenDatum } from '../../../data/tokenization';
import type { CameraPose, QualityInfo, SceneFrame, StageScene } from '../../types';
import { curveFromPoints, lineFromPoints, roundedBox, tickStrip, tubeAlong } from '../../kit/geometry';
import { accentMaterial, emissiveMaterial, glassMaterial, smokedGlassMaterial } from '../../kit/materials';
import { PALETTE } from '../../kit/palette';
import { createDustField, dotTexture } from '../../kit/particles';
import { FONT_MONO, FONT_SANS, makeCanvasTexture, roundedRect } from '../../kit/textures';
import {
  CameraTrack,
  clamp01,
  crisp,
  disposeTree,
  hairlineSegments,
  inverseSmooth,
  lerp,
  markShared,
  microLabel,
  smooth,
} from './localKit';

const ROWS = 17;
const COLS = 12;
const CELL_W = 0.4;
const CELL_H = 0.28;
const WALL_WIDTH = COLS * CELL_W;
const WALL_HEIGHT = ROWS * CELL_H;
const WALL_LAYER_Z = 0.16;

const PORT_COLS = [5, 6];
const PORT_ROWS = [1, 2, 3, 4];
const PORT_X0 = -0.4;
const PORT_X1 = 0.4;
const PORT_Y0 = -WALL_HEIGHT / 2 + PORT_ROWS[0] * CELL_H;
const PORT_Y1 = -WALL_HEIGHT / 2 + (PORT_ROWS[PORT_ROWS.length - 1] + 1) * CELL_H;

const WALL_POSITION = new Vector3(-2, 2.8, 0);
const WALL_ROTATION = -0.52;
const PORT_WORLD_Y = WALL_POSITION.y + (PORT_Y0 + PORT_Y1) / 2;

const CHIP_GAP = 1.16;
const CHIP_FIRST_X = -3.35;
const CHIP_Y = PORT_WORLD_Y;
const PORT_X = WALL_POSITION.x;
const FEED_TOTAL = PORT_X - (CHIP_FIRST_X - (QUESTION_TOKENS.length - 1) * CHIP_GAP);
const FEED_START = 0.03;
const FEED_END = 0.52;

const FIELD_ORIGIN = new Vector3(0.35, 2.7, 0);
/**
 * Display transform for the conceptual projection: the fan is squeezed
 * horizontally and lifted vertically so the wall + all six labelled tips stay
 * inside the UI safe area. It is a display projection, not the real geometry.
 */
const FIELD_SCALE_X = 0.34;
const FIELD_SCALE_Y = 1.7;
const FIELD_SCALE_Z = 0.85;
const CAGE = { x0: 0.55, x1: 4.2, y0: 0.35, y1: 4.95, z0: -0.9, z1: 0.9 };

const CELL_BASE = new Color('#b8b5a8');
const CELL_BACK = new Color('#95928a');
const CELL_HOT = new Color(PALETTE.orange);

interface ChipSlot {
  readonly group: Group;
  readonly index: number;
  readonly distance: number;
  readonly revealAt: number;
  readonly row: number;
}

interface VectorSlot {
  readonly group: Group;
  readonly tube: Mesh;
  readonly curve: ReturnType<typeof curveFromPoints>;
  readonly tip: Mesh;
  readonly label: Sprite;
  readonly index: number;
  readonly row: number;
  readonly startAt: number;
  readonly indexCount: number;
}

function makeChipTexture(token: TokenDatum): CanvasTexture {
  const width = 320;
  const height = 360;
  return crisp(makeCanvasTexture(width, height, (context, w, h) => {
    context.fillStyle = 'rgba(251, 250, 246, 0.96)';
    roundedRect(context, 6, 6, w - 12, h - 12, 12);
    context.fill();
    context.strokeStyle = 'rgba(20, 20, 20, 0.16)';
    context.lineWidth = 1.5;
    roundedRect(context, 6, 6, w - 12, h - 12, 12);
    context.stroke();

    context.fillStyle = PALETTE.muted;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.font = `400 26px ${FONT_MONO}`;
    context.fillText(`POS ${String(token.index).padStart(2, '0')}`, 26, 22);

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = PALETTE.ink;
    const glyphs = Array.from(token.display).length;
    context.font = `500 ${glyphs > 2 ? 96 : 132}px ${FONT_SANS}`;
    context.fillText(token.display, w / 2, 158);

    context.fillStyle = PALETTE.orange;
    context.font = `500 44px ${FONT_MONO}`;
    context.fillText(`#${token.id}`, w / 2, 262);

    context.strokeStyle = 'rgba(20, 20, 20, 0.12)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(40, 304);
    context.lineTo(w - 40, 304);
    context.stroke();

    context.fillStyle = PALETTE.muted;
    context.font = `400 24px ${FONT_MONO}`;
    context.fillText('QWEN2.5 · ID', w / 2, 328);
  }));
}

function makeCurtainTexture(): CanvasTexture {
  return makeCanvasTexture(128, 160, (context, w, h) => {
    const gradient = context.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, h / 2);
    gradient.addColorStop(0, 'rgba(228, 87, 42, 0.85)');
    gradient.addColorStop(0.55, 'rgba(228, 87, 42, 0.28)');
    gradient.addColorStop(1, 'rgba(228, 87, 42, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
  });
}

function rowY(row: number): number {
  return -WALL_HEIGHT / 2 + (row + 0.5) * CELL_H;
}

export class EmbeddingScene implements StageScene {
  readonly group: Group;
  readonly pickables: Object3D[];

  private readonly bodyMaterial: MeshStandardMaterial;
  private readonly trimMaterial: MeshStandardMaterial;
  private readonly track: CameraTrack;
  private readonly matrix: Group;
  private readonly chips: ChipSlot[] = [];
  private readonly vectors: VectorSlot[] = [];
  private readonly cells: InstancedMesh;
  private readonly cellRows: number[] = [];
  private readonly cellLayers: number[] = [];
  private readonly rowIntensity: number[] = new Array(ROWS).fill(0);
  private readonly reader: Mesh;
  private readonly curtain: Mesh;
  private readonly packets: Points;
  private readonly packetPositions: Float32Array;
  private readonly dust: ReturnType<typeof createDustField>;
  private readonly core: Mesh;
  private readonly cellColor = new Color();
  private readonly scratch = new Vector3();

  constructor(quality: QualityInfo) {
    this.group = new Group();
    this.group.name = 'EmbeddingScene';
    this.pickables = [];

    this.bodyMaterial = new MeshStandardMaterial({
      color: new Color('#2c2d27'),
      roughness: 0.46,
      metalness: 0.34,
    });
    this.trimMaterial = new MeshStandardMaterial({
      color: new Color('#8b8c85'),
      roughness: 0.34,
      metalness: 0.5,
    });

    this.matrix = this.buildMatrix();
    this.group.add(this.matrix);
    this.matrix.userData.infoId = 'embedding-matrix';
    this.pickables.push(this.matrix);
    this.cells = this.matrix.getObjectByName('matrix-cells') as InstancedMesh;
    this.reader = this.matrix.getObjectByName('matrix-reader') as Mesh;
    this.curtain = this.matrix.getObjectByName('matrix-curtain') as Mesh;

    this.buildFeed();
    const field = this.buildField();
    this.core = field.core;
    this.packets = field.packets;
    this.packetPositions = field.positions;
    this.group.add(field.root);

    this.dust = createDustField({
      count: Math.round(26 + 40 * quality.nodeScale),
      area: [6.4, 4.4, 2.2],
      center: new Vector3(1.6, 2.8, 0),
      color: PALETTE.muted,
      size: 0.05,
      opacity: 0.15,
      drift: 0.04,
    });
    markShared(dotTexture());
    this.group.add(this.dust.object);

    const title = microLabel('EMBEDDING MATRIX', 'V × d_model · x_t = E[token_id]', { height: 0.34 });
    title.position.set(-3.2, 5.4, 0.55);
    this.group.add(title);

    const portNote = microLabel('ID → ROW', 'SCALED FOR DISPLAY', { height: 0.42, subColor: PALETTE.teal });
    portNote.position.set(0.1, 2.35, 1.45);
    this.group.add(portNote);
    if (quality.nodeScale >= 0.7) this.group.add(this.buildFloorScale());

    this.track = new CameraTrack([
      { at: 0, position: [-6.4, 3.4, 11.8], subject: [-6.3, 1.3, 0], screen: [0.52, 0.42], fov: 38 },
      { at: 0.3, position: [-3.6, 4.2, 23.4], subject: [-2.0, 2.9, 0], screen: [0.5347, 0.49], fov: 44 },
      { at: 0.55, position: [-2.8, 4.0, 23.8], subject: [-1.4, 2.8, 0], screen: [0.5347, 0.49], fov: 44 },
      { at: 0.8, position: [0.2, 3.9, 24.6], subject: [-0.3, 2.7, 0], screen: [0.59, 0.49], fov: 44 },
      { at: 1, position: [0.6, 4.0, 25.2], subject: [-0.2, 2.7, 0], screen: [0.585, 0.49], fov: 44 },
    ]);
  }

  private buildFloorScale(): Group {
    const scale = new Group();
    scale.name = 'embedding-floor-scale';
    const segments: number[] = [];
    [-2.0, 2.0].forEach((z) => {
      segments.push(-5.4, 0.012, z, 6.2, 0.012, z);
      for (let step = 0; step <= 17; step += 1) {
        const x = -5.4 + step * 0.65;
        const length = step % 5 === 0 ? 0.2 : 0.1;
        segments.push(x, 0.012, z, x, 0.012, z + length);
      }
    });
    scale.add(hairlineSegments(segments, PALETTE.graphiteSoft, 0.2));
    return scale;
  }

  private buildMatrix(): Group {
    const wall = new Group();
    wall.name = 'embedding-matrix-wall';
    wall.position.copy(WALL_POSITION);
    wall.rotation.y = WALL_ROTATION;

    // --- real two-layer cell grid (rows = vocab ids, columns = dimensions) ---
    const cells = new InstancedMesh(
      new BoxGeometry(CELL_W - 0.05, CELL_H - 0.05, 0.1),
      new MeshStandardMaterial({ color: 0xffffff, roughness: 0.58, metalness: 0.06 }),
      ROWS * COLS * 2,
    );
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const scale = new Vector3(1, 1, 1);
    const position = new Vector3();
    let instance = 0;
    for (let layer = 0; layer < 2; layer += 1) {
      const z = layer === 0 ? WALL_LAYER_Z : -WALL_LAYER_Z;
      for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
          const isPort = PORT_ROWS.includes(row) && PORT_COLS.includes(col);
          position.set(
            isPort ? 0 : -WALL_WIDTH / 2 + (col + 0.5) * CELL_W,
            isPort ? -100 : rowY(row),
            isPort ? 0 : z,
          );
          matrix.compose(position, quaternion, scale);
          cells.setMatrixAt(instance, matrix);
          cells.setColorAt(instance, layer === 0 ? CELL_BASE : CELL_BACK);
          this.cellRows.push(row);
          this.cellLayers.push(layer);
          instance += 1;
        }
      }
    }
    cells.instanceMatrix.needsUpdate = true;
    if (cells.instanceColor) cells.instanceColor.needsUpdate = true;
    cells.frustumCulled = false;
    cells.name = 'matrix-cells';
    wall.add(cells);

    // --- hairline grid, with the intake port left open ---
    const grid: number[] = [];
    const z = WALL_LAYER_Z + 0.055;
    for (let row = 0; row <= ROWS; row += 1) {
      const y = -WALL_HEIGHT / 2 + row * CELL_H;
      if (y > PORT_Y0 && y < PORT_Y1) {
        grid.push(-WALL_WIDTH / 2, y, z, PORT_X0, y, z, PORT_X1, y, z, WALL_WIDTH / 2, y, z);
      } else {
        grid.push(-WALL_WIDTH / 2, y, z, WALL_WIDTH / 2, y, z);
      }
    }
    for (let col = 0; col <= COLS; col += 1) {
      const x = -WALL_WIDTH / 2 + col * CELL_W;
      if (x > PORT_X0 && x < PORT_X1) {
        grid.push(x, -WALL_HEIGHT / 2, z, x, PORT_Y0, z, x, PORT_Y1, z, x, WALL_HEIGHT / 2, z);
      } else {
        grid.push(x, -WALL_HEIGHT / 2, z, x, WALL_HEIGHT / 2, z);
      }
    }
    // row ticks down the left cheek so the row/ID reading is legible
    for (let row = 0; row < ROWS; row += 1) {
      const y = rowY(row);
      const length = row % 4 === 0 ? 0.16 : 0.09;
      grid.push(-WALL_WIDTH / 2 - 0.24, y, z, -WALL_WIDTH / 2 - 0.24 + length, y, z);
    }
    wall.add(hairlineSegments(grid, PALETTE.graphite, 0.52));

    const back = new Mesh(
      roundedBox(WALL_WIDTH + 0.16, WALL_HEIGHT + 0.16, 0.04, 0.02),
      smokedGlassMaterial({ opacity: 0.12 }),
    );
    back.position.z = -WALL_LAYER_Z - 0.09;
    wall.add(back);

    // --- frame ---
    const top = new Mesh(roundedBox(WALL_WIDTH + 0.34, 0.19, 0.46, 0.03), this.bodyMaterial);
    top.position.set(0, WALL_HEIGHT / 2 + 0.095, 0);
    top.castShadow = true;
    wall.add(top);

    const bottom = new Mesh(roundedBox(WALL_WIDTH + 0.34, 0.19, 0.46, 0.03), this.bodyMaterial);
    bottom.position.set(0, -WALL_HEIGHT / 2 - 0.095, 0);
    wall.add(bottom);

    [-1, 1].forEach((side) => {
      const post = new Mesh(roundedBox(0.19, WALL_HEIGHT + 0.38, 0.46, 0.03), this.bodyMaterial);
      post.position.set(side * (WALL_WIDTH / 2 + 0.095), 0, 0);
      post.castShadow = true;
      wall.add(post);
    });

    [-1, 1].forEach((side) => {
      const leg = new Mesh(roundedBox(0.18, 0.34, 0.18, 0.02), this.trimMaterial);
      leg.position.set(side * (WALL_WIDTH / 2 - 0.3), -WALL_HEIGHT / 2 - 0.25, 0);
      wall.add(leg);

      const foot = new Mesh(roundedBox(0.44, 0.08, 0.44, 0.02), this.bodyMaterial);
      foot.position.set(side * (WALL_WIDTH / 2 - 0.3), -WALL_HEIGHT / 2 - 0.46, 0);
      wall.add(foot);
    });

    // --- intake port rim + reading light ---
    const rim = new InstancedMesh(new BoxGeometry(1, 1, 1), accentMaterial(PALETTE.orange, 1.2), 4);
    const rimY = (PORT_Y0 + PORT_Y1) / 2;
    const rimZ = WALL_LAYER_Z + 0.1;
    const rims: Array<[number, number, number, number]> = [
      [0, PORT_Y1 + 0.03, PORT_X1 - PORT_X0 + 0.12, 0.06],
      [0, PORT_Y0 - 0.03, PORT_X1 - PORT_X0 + 0.12, 0.06],
      [PORT_X0 - 0.03, rimY, 0.06, PORT_Y1 - PORT_Y0 + 0.12],
      [PORT_X1 + 0.03, rimY, 0.06, PORT_Y1 - PORT_Y0 + 0.12],
    ];
    rims.forEach(([x, y, width, height], index) => {
      matrix.compose(new Vector3(x, y, rimZ), quaternion, new Vector3(width, height, 0.06));
      rim.setMatrixAt(index, matrix);
    });
    rim.instanceMatrix.needsUpdate = true;
    rim.frustumCulled = false;
    wall.add(rim);

    const curtain = new Mesh(
      new PlaneGeometry(PORT_X1 - PORT_X0, PORT_Y1 - PORT_Y0),
      new MeshBasicMaterial({
        map: makeCurtainTexture(),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        opacity: 0.7,
      }),
    );
    curtain.position.set(0, rimY, 0.02);
    curtain.name = 'matrix-curtain';
    curtain.renderOrder = 7;
    wall.add(curtain);

    const reader = new Mesh(
      new BoxGeometry(WALL_WIDTH - 0.06, 0.055, 0.055),
      new MeshBasicMaterial({ color: PALETTE.orange, transparent: true, opacity: 0, toneMapped: false }),
    );
    reader.position.set(0, rowY(0), rimZ);
    reader.name = 'matrix-reader';
    wall.add(reader);

    return wall;
  }

  private buildFeed(): void {
    const feed = new Group();
    feed.name = 'embedding-feed-rail';

    const beam = new Mesh(roundedBox(7.0, 0.08, 0.36, 0.02), this.bodyMaterial);
    beam.position.set(-5.9, 0.78, 0);
    beam.receiveShadow = true;
    feed.add(beam);

    [-9.25, -2.55].forEach((x) => {
      const post = new Mesh(roundedBox(0.09, 0.74, 0.09, 0.015), this.bodyMaterial);
      post.position.set(x, 0.37, 0);
      feed.add(post);

      const foot = new Mesh(roundedBox(0.3, 0.06, 0.3, 0.015), this.trimMaterial);
      foot.position.set(x, 0.03, 0);
      feed.add(foot);
    });

    feed.add(
      tickStrip(6.6, 33, {
        axis: 'x',
        color: PALETTE.graphite,
        opacity: 0.24,
        tickSize: 0.045,
        majorEvery: 5,
        origin: new Vector3(-5.9, 0.79, 0.2),
      }),
    );

    QUESTION_TOKENS.forEach((token, index) => {
      const chip = new Group();
      chip.name = `embedding-chip-${index}`;
      chip.position.set(CHIP_FIRST_X - index * CHIP_GAP, CHIP_Y, 0);

      const shell = new Mesh(
        roundedBox(0.72, 0.82, 0.16, 0.04),
        glassMaterial({ color: '#eef2f0', opacity: 0.34 }),
      );
      chip.add(shell);

      const label = new Mesh(
        new PlaneGeometry(0.64, 0.72),
        new MeshBasicMaterial({
          map: makeChipTexture(token),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      label.position.z = 0.086;
      label.renderOrder = 5;
      chip.add(label);

      const skirt = new Mesh(roundedBox(0.5, 0.03, 0.3, 0.01), accentMaterial(PALETTE.orange));
      skirt.position.y = -0.44;
      chip.add(skirt);

      feed.add(chip);
      const distance = PORT_X - (CHIP_FIRST_X - index * CHIP_GAP);
      this.chips.push({
        group: chip,
        index,
        distance,
        revealAt: FEED_START + (FEED_END - FEED_START) * inverseSmooth(distance / FEED_TOTAL),
        row: token.id % ROWS,
      });
    });

    this.group.add(feed);
  }

  private buildField(): {
    root: Group;
    core: Mesh;
    packets: Points;
    positions: Float32Array;
  } {
    const root = new Group();
    root.name = 'embedding-field';

    // --- origin mast ---
    const base = new Mesh(roundedBox(0.42, 0.1, 0.42, 0.02), this.bodyMaterial);
    base.position.set(FIELD_ORIGIN.x, 0.05, 0);
    root.add(base);

    const mast = new Mesh(roundedBox(0.09, 2.6, 0.09, 0.02), this.trimMaterial);
    mast.position.set(FIELD_ORIGIN.x, 1.3, 0);
    root.add(mast);

    const collar = new Mesh(roundedBox(0.3, 0.1, 0.3, 0.03), glassMaterial({ opacity: 0.34 }));
    collar.position.set(FIELD_ORIGIN.x, 2.64, 0);
    root.add(collar);

    const core = new Mesh(new SphereGeometry(0.1, 14, 12), emissiveMaterial(PALETTE.orange, 2.4));
    core.position.copy(FIELD_ORIGIN);
    root.add(core);

    root.add(
      lineFromPoints(
        [
          [-1.85, PORT_WORLD_Y, 0],
          [-0.2, PORT_WORLD_Y + 0.6, 0],
          [FIELD_ORIGIN.x, FIELD_ORIGIN.y - 0.04, 0],
        ],
        PALETTE.graphiteSoft,
        0.34,
      ),
    );

    // --- measured cage ---
    const cage: number[] = [];
    const { x0, x1, y0, y1, z0, z1 } = CAGE;
    cage.push(
      x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, x0, y0, z0,
      x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1, x0, y1, z0,
      x0, y0, z0, x0, y1, z0, x1, y0, z0, x1, y1, z0,
      x1, y0, z1, x1, y1, z1, x0, y0, z1, x0, y1, z1,
    );
    for (let step = 1; step < 10; step += 1) {
      const x = lerp(x0, x1, step / 10);
      cage.push(x, y0, z0, x, y0, z1);
    }
    for (let step = 1; step < 4; step += 1) {
      const z = lerp(z0, z1, step / 4);
      cage.push(x0, y0, z, x1, y0, z);
    }
    for (let step = 1; step < 6; step += 1) {
      const x = lerp(x0, x1, step / 6);
      cage.push(x, y0, z0, x, y1, z0);
    }
    for (let step = 1; step < 3; step += 1) {
      const y = lerp(y0, y1, step / 3);
      cage.push(x0, y, z0, x1, y, z0);
    }
    root.add(hairlineSegments(cage, PALETTE.graphite, 0.15));

    // --- six concept vectors ---
    const material = new MeshBasicMaterial({
      color: PALETTE.orange,
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
    });
    const packetPositions = new Float32Array(CONCEPT_VECTORS.length * 3);
    const packetGeometry = new BufferGeometry();
    packetGeometry.setAttribute('position', new BufferAttribute(packetPositions, 3));
    packetGeometry.boundingSphere = null;

    CONCEPT_VECTORS.forEach((concept) => {
      const chip = this.chips[concept.tokenIndex];
      const tip = new Vector3(
        FIELD_ORIGIN.x + concept.position[0] * FIELD_SCALE_X,
        FIELD_ORIGIN.y + concept.position[1] * FIELD_SCALE_Y,
        concept.position[2] * FIELD_SCALE_Z,
      );
      const mid = FIELD_ORIGIN.clone().lerp(tip, 0.5);
      mid.y += 0.26;
      const curve = curveFromPoints([FIELD_ORIGIN, mid, tip]);

      const group = new Group();
      group.name = `embedding-vector-${concept.tokenIndex}`;

      const tube = tubeAlong(curve, 0.055, material, 56, 5);
      group.add(tube);

      const marker = new Mesh(new OctahedronGeometry(0.17), emissiveMaterial(PALETTE.orange, 1.8));
      marker.position.copy(tip);
      group.add(marker);

      const label = microLabel(concept.text, `#${concept.tokenId}`, { height: 0.44 });
      label.position.set(tip.x + 0.18, tip.y + 0.4, tip.z);
      label.material.opacity = 0;
      group.add(label);

      const hit = new Mesh(new SphereGeometry(0.55, 8, 6), new MeshBasicMaterial({ visible: false }));
      hit.position.copy(tip);
      group.add(hit);

      const hitMid = new Mesh(new SphereGeometry(0.45, 8, 6), new MeshBasicMaterial({ visible: false }));
      hitMid.position.copy(curve.getPointAt(0.62));
      group.add(hitMid);

      group.userData.infoId = 'vector-space';
      group.userData.tokenIndex = concept.tokenIndex;
      this.group.add(group);
      this.pickables.push(group);

      this.vectors.push({
        group,
        tube,
        curve,
        tip: marker,
        label,
        index: concept.tokenIndex,
        row: chip ? chip.row : 0,
        startAt: chip ? chip.revealAt : 0,
        indexCount: (tube.geometry as BufferGeometry).index?.count ?? 0,
      });
    });

    const packets = new Points(
      packetGeometry,
      new PointsMaterial({
        color: PALETTE.orange,
        size: 0.2,
        map: dotTexture(),
        transparent: true,
        depthWrite: false,
        sizeAttenuation: true,
        toneMapped: false,
      }),
    );
    packets.frustumCulled = false;
    packets.renderOrder = 6;
    root.add(packets);

    const header = microLabel(
      `3D PROJECTION OF ${EMBEDDING_DIMENSIONS}-D`,
      'CONCEPTUAL · NOT MODEL WEIGHTS',
      { height: 0.44 },
    );
    header.position.set(1.9, CAGE.y1 + 0.4, 0);
    root.add(header);

    const scaleNote = microLabel('LATENT FIELD', `${CONCEPT_VECTORS.length} CONCEPT VECTORS`, {
      height: 0.36,
      subColor: PALETTE.teal,
    });
    scaleNote.position.set(0.9, CAGE.y0 - 0.42, 0.7);
    root.add(scaleNote);

    return { root, core, packets, positions: packetPositions };
  }

  update(frame: SceneFrame): void {
    const p = clamp01(frame.stageProgress);
    const ambient = frame.reducedMotion ? 0 : frame.stageElapsed;

    // ---- feed rail advances; each chip is read as it reaches the port ----
    const feed = FEED_TOTAL * smooth(p, FEED_START, FEED_END);
    this.rowIntensity.fill(0);

    this.chips.forEach((chip) => {
      const remaining = chip.distance - feed;
      const scale = smooth(remaining, 0, 0.5);
      chip.group.position.set(CHIP_FIRST_X - chip.index * CHIP_GAP + feed, CHIP_Y, 0);
      chip.group.scale.setScalar(Math.max(0.001, scale));
      chip.group.rotation.set((1 - scale) * 0.5, (1 - scale) * 0.4, (1 - scale) * 0.55);
      chip.group.visible = scale > 0.002;

      const flash = smooth(p, chip.revealAt - 0.02, chip.revealAt + 0.02);
      const decay = clamp01(1 - Math.max(0, p - chip.revealAt) / 0.18);
      this.rowIntensity[chip.row] = Math.min(1, 0.28 * flash + 0.88 * flash * decay);
    });

    // ---- matrix cells light their row ----
    for (let instance = 0; instance < this.cellRows.length; instance += 1) {
      const intensity = this.rowIntensity[this.cellRows[instance]];
      const layerScale = this.cellLayers[instance] === 0 ? 1 : 0.72;
      this.cellColor
        .copy(this.cellLayers[instance] === 0 ? CELL_BASE : CELL_BACK)
        .lerp(CELL_HOT, intensity * layerScale);
      this.cells.setColorAt(instance, this.cellColor);
    }
    if (this.cells.instanceColor) this.cells.instanceColor.needsUpdate = true;

    // ---- reading line follows the newest id ----
    let active: ChipSlot | null = null;
    this.chips.forEach((chip) => {
      if (p >= chip.revealAt) active = chip;
    });
    if (active) {
      const activeChip: ChipSlot = active;
      this.reader.position.y = rowY(activeChip.row);
      const settle = clamp01(1 - (p - activeChip.revealAt) / 0.12);
      (this.reader.material as MeshBasicMaterial).opacity = 0.3 + 0.6 * settle;
    } else {
      (this.reader.material as MeshBasicMaterial).opacity = 0;
    }
    (this.curtain.material as MeshBasicMaterial).opacity =
      0.5 + 0.12 * Math.sin(ambient * 2.2) + 0.28 * (active ? 1 : 0);

    // ---- concept vectors grow out of the matrix ----
    this.vectors.forEach((slot) => {
      const reveal = smooth(p, slot.startAt + 0.02, slot.startAt + 0.22);
      slot.tube.visible = reveal > 0.004;
      (slot.tube.geometry as BufferGeometry).setDrawRange(
        0,
        Math.max(0, Math.floor(slot.indexCount * reveal)),
      );
      const tipScale = smooth(p, slot.startAt + 0.17, slot.startAt + 0.27);
      slot.tip.scale.setScalar(
        Math.max(0.001, tipScale * (0.9 + 0.1 * Math.sin(ambient * 2.4 + slot.index))),
      );
      slot.tip.rotation.set(ambient * 0.3 + slot.index, ambient * 0.45 + slot.index * 0.7, 0);
      slot.label.material.opacity = smooth(p, slot.startAt + 0.19, slot.startAt + 0.31);
    });

    // ---- luminous packets run along each vector ----
    this.vectors.forEach((slot, index) => {
      const reveal = smooth(p, slot.startAt + 0.02, slot.startAt + 0.22);
      if (reveal < 0.06) {
        this.packetPositions[index * 3 + 1] = -999;
        return;
      }
      const cycle = ((ambient * 0.16 + index * 0.19) % 1) * reveal;
      slot.curve.getPointAt(cycle, this.scratch);
      this.packetPositions[index * 3] = this.scratch.x;
      this.packetPositions[index * 3 + 1] = this.scratch.y;
      this.packetPositions[index * 3 + 2] = this.scratch.z;
    });
    (this.packets.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;

    this.core.scale.setScalar(1 + 0.12 * Math.sin(ambient * 3.1));
    this.dust.update(ambient);
  }

  cameraPose(frame: SceneFrame, aspect: number): CameraPose {
    return this.track.sample(frame.stageProgress, aspect);
  }

  dispose(): void {
    disposeTree(this.group);
  }
}
