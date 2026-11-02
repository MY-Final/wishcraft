import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from 'three';
import { lineFromPoints, roundedBox, tickStrip } from '../../kit/geometry';
import { glassMaterial, smokedGlassMaterial } from '../../kit/materials';
import { PALETTE } from '../../kit/palette';
import { makeSpriteLabel } from '../../kit/textures';
import type { SceneFrame } from '../../types';

const COLUMNS = 24;
const ROWS = 28;
const CELL_W = 0.16;
const CELL_H = 0.395;
const GAP_X = 0.03;
const GAP_Y = 0.021;
const WIDTH = COLUMNS * CELL_W + (COLUMNS - 1) * GAP_X;
const HEIGHT = ROWS * CELL_H + (ROWS - 1) * GAP_Y;

export class KvCache {
  readonly group = new Group();
  readonly pickables: Group[] = [];
  private readonly cells: InstancedMesh;
  private readonly frontier = new Mesh();
  private readonly frontierGlow = new Mesh();
  private readonly emptyColor = new Color('#34362f');
  private readonly inputColor = new Color('#2f8579');
  private readonly generatedColor = new Color(PALETTE.orange);
  private readonly hotColor = new Color('#ff8b5f');
  private lastSignature = '';

  constructor() {
    this.group.name = 'kv-cache';
    this.buildBoard();
    const geometry = new BoxGeometry(CELL_W, CELL_H, 0.08);
    const material = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.cells = new InstancedMesh(geometry, material, COLUMNS * ROWS);
    this.cells.instanceMatrix.setUsage(35044);
    const dummy = new Object3D();
    const originX = -WIDTH / 2 + CELL_W / 2;
    const originY = HEIGHT / 2 - CELL_H / 2;
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        dummy.position.set(originX + column * (CELL_W + GAP_X), originY - row * (CELL_H + GAP_Y), 0.08);
        dummy.updateMatrix();
        const index = row * COLUMNS + column;
        this.cells.setMatrixAt(index, dummy.matrix);
        this.cells.setColorAt(index, this.emptyColor);
      }
    }
    this.cells.instanceMatrix.needsUpdate = true;
    if (this.cells.instanceColor) this.cells.instanceColor.needsUpdate = true;
    this.group.add(this.cells);
    this.pickables.push(this.group);
    this.group.userData.infoId = 'kv-cache';
  }

  private buildBoard(): void {
    const backing = new Mesh(
      roundedBox(WIDTH + 0.6, HEIGHT + 0.7, 0.26, 0.05),
      smokedGlassMaterial({ color: '#1c211e', opacity: 0.76, roughness: 0.18 }),
    );
    backing.position.z = -0.06;
    this.group.add(backing);

    const border = lineFromPoints(
      [
        [-WIDTH / 2 - 0.24, -HEIGHT / 2 - 0.25, 0.08],
        [WIDTH / 2 + 0.24, -HEIGHT / 2 - 0.25, 0.08],
        [WIDTH / 2 + 0.24, HEIGHT / 2 + 0.25, 0.08],
        [-WIDTH / 2 - 0.24, HEIGHT / 2 + 0.25, 0.08],
        [-WIDTH / 2 - 0.24, -HEIGHT / 2 - 0.25, 0.08],
      ],
      PALETTE.orange,
      0.34,
    );
    this.group.add(border);

    const topTicks = tickStrip(WIDTH + 0.5, 32, {
      axis: 'x',
      color: PALETTE.graphiteSoft,
      opacity: 0.3,
      tickSize: 0.05,
      majorEvery: 8,
      origin: new Vector3(0, HEIGHT / 2 + 0.42, 0.1),
    });
    this.group.add(topTicks);

    const title = makeSpriteLabel('KV CACHE', '28 LAYERS × RECENT 24 POSITIONS · SIMULATED WINDOW', {
      height: 0.22,
      color: '#f4f3ef',
      subColor: '#8bcfc2',
      fontSize: 36,
      subFontSize: 14,
      paddingX: 15,
      paddingY: 8,
      background: 'rgba(24,28,24,0.8)',
      border: 'rgba(228,87,42,0.4)',
    });
    title.position.set(0, HEIGHT / 2 + 0.95, 0.1);
    this.group.add(title);

    const layerLabel = makeSpriteLabel('LAYERS ↓', 'RECENT POSITIONS →', {
      height: 0.15,
      color: 'rgba(244,243,239,0.44)',
      subColor: 'rgba(244,243,239,0.28)',
      fontSize: 22,
      subFontSize: 18,
      paddingX: 8,
      paddingY: 5,
    });
    layerLabel.position.set(-WIDTH / 2 - 0.95, 0, 0.2);
    this.group.add(layerLabel);

    this.frontier.position.set(-WIDTH / 2, 0, 0.14);
    this.frontier.geometry = roundedBox(0.025, HEIGHT + 0.1, 0.02, 0.005);
    this.frontier.material = new MeshBasicMaterial({
      color: PALETTE.orange,
      transparent: true,
      opacity: 0.8,
      toneMapped: false,
    });
    this.group.add(this.frontier);

    this.frontierGlow.position.set(-WIDTH / 2, 0, 0.15);
    this.frontierGlow.geometry = roundedBox(0.11, HEIGHT + 0.12, 0.01, 0.005);
    this.frontierGlow.material = glassMaterial({ color: PALETTE.orange, opacity: 0.16 });
    this.group.add(this.frontierGlow);

    // Keep an unused import honest and make the grid feel intentionally optical.
    const glass = new Mesh(
      roundedBox(WIDTH + 0.9, HEIGHT + 1.0, 0.03, 0.02),
      glassMaterial({ color: '#f4f3ef', opacity: 0.035, roughness: 0.03 }),
    );
    glass.position.z = 0.19;
    this.group.add(glass);
  }

  update(frame: SceneFrame, filledColumns: number, hot: boolean): void {
    const filled = Math.min(COLUMNS, Math.max(0, Math.floor(filledColumns)));
    const bucket = Math.floor(frame.time * 12);
    const signature = `${filled}|${bucket}|${hot}`;
    if (signature === this.lastSignature) {
      this.updateFrontier(filled, frame.time);
      return;
    }
    this.lastSignature = signature;

    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const index = row * COLUMNS + column;
        let color = this.emptyColor;
        if (column < filled) {
          const age = filled - column;
          const isInput = column < 6;
          const base = isInput ? this.inputColor : this.generatedColor;
          const ageFactor = isInput ? 0.8 : Math.max(0.3, 1 - age / 70);
          color = base.clone().multiplyScalar(0.6 + ageFactor * 0.55);
          if (!isInput && column === filled - 1 && hot) {
            color = this.hotColor;
          }
          const rowShade = 0.82 + (row / ROWS) * 0.24;
          color.multiplyScalar(rowShade);
        } else if (column === filled && hot) {
          color = new Color('#49362b');
        }
        this.cells.setColorAt(index, color);
      }
    }
    if (this.cells.instanceColor) this.cells.instanceColor.needsUpdate = true;
    this.updateFrontier(filled, frame.time);
  }

  private updateFrontier(filled: number, time: number): void {
    const x = -WIDTH / 2 + Math.max(0, filled) * (CELL_W + GAP_X) - CELL_W / 2;
    this.frontier.position.x = Math.min(WIDTH / 2, Math.max(-WIDTH / 2, x));
    this.frontierGlow.position.x = this.frontier.position.x;
    const material = this.frontier.material as MeshBasicMaterial;
    material.opacity = filled > 0 ? 0.55 + Math.sin(time * 2.1) * 0.15 : 0.18;
    this.frontier.visible = filled > 0;
    this.frontierGlow.visible = filled > 0;
  }
}
