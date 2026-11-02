import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three';
import { ANSWER_TOKENS } from '../../../data/tokenization';
import { FINAL_OVERVIEW_POSITION, FINAL_OVERVIEW_TARGET } from '../../layout';
import { lineFromPoints, roundedBox } from '../../kit/geometry';
import { glowMaterial, graphiteMaterial } from '../../kit/materials';
import { createDataCapsule } from '../../kit/nodes';
import { PALETTE } from '../../kit/palette';
import { createFlowParticles, type FlowParticles } from '../../kit/particles';
import { FONT_MONO, FONT_SANS, makeSpriteLabel } from '../../kit/textures';
import type { CameraPose, QualityInfo, SceneFrame, StageScene } from '../../types';
import { ChatScreen } from './chat-screen';

const SCREEN_WIDTH = 7.2;
const SCREEN_HEIGHT = 4.5;
const MONITOR_CENTER_Y = 3.25;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

interface PoseKey {
  at: number;
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const STAGE_ONE_POSES: PoseKey[] = [
  { at: 0, pos: [7.2, 5.4, 21.0], target: [-2.2, 3.2, 0.4], fov: 39 },
  { at: 0.3, pos: [5.3, 5.0, 20.0], target: [-2.4, 3.15, 0.6], fov: 38 },
  { at: 0.56, pos: [5.2, 5.2, 19.5], target: [-2.7, 3.0, 0.8], fov: 38 },
  { at: 0.78, pos: [5.0, 5.4, 20.0], target: [-1.6, 3.2, 1.1], fov: 38 },
  { at: 1, pos: [8.4, 7.1, 22.0], target: [3.6, 4.0, 2.0], fov: 40 },
];

const ARRIVAL_POSES: PoseKey[] = [
  { at: 0, pos: [5.6, 5.2, 17.8], target: [-3.6, 3.1, 0.2], fov: 36 },
  { at: 0.28, pos: [5.5, 5.2, 17.5], target: [-4.0, 3.0, 0.2], fov: 36 },
  { at: 0.55, pos: [5.2, 5.1, 17.3], target: [-4.0, 3.0, 0.3], fov: 36 },
  { at: 0.72, pos: [6.5, 5.6, 19.5], target: [-3.2, 3.0, 0.1], fov: 38 },
  { at: 0.86, pos: [17.5, 11.5, 28.0], target: [1.5, 3.1, -1.2], fov: 46 },
  {
    at: 1,
    pos: [FINAL_OVERVIEW_POSITION.x, FINAL_OVERVIEW_POSITION.y, FINAL_OVERVIEW_POSITION.z],
    target: [FINAL_OVERVIEW_TARGET.x, FINAL_OVERVIEW_TARGET.y, FINAL_OVERVIEW_TARGET.z],
    fov: 48,
  },
];

function samplePose(poses: PoseKey[], progress: number): { position: Vector3; target: Vector3; fov: number } {
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
  const span = to.at - from.at || 1;
  const t = smooth((p - from.at) / span);
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

export class ClientScene implements StageScene {
  readonly group = new Group();
  readonly pickables: Group[] = [];

  private readonly screen = new ChatScreen();
  private readonly halo = new Group();
  private readonly monitor = new Group();
  private readonly requestGroup = new Group();
  private readonly webGroup = new Group();
  private readonly apiGroup = new Group();
  private readonly capsule: Group;
  private readonly formatLine: Line;
  private readonly motes: FlowParticles;
  private readonly baseRings = new Group();
  private readonly annotations = new Group();
  private readonly quality: QualityInfo;
  private readonly currentPose: CameraPose = {
    position: new Vector3(),
    target: new Vector3(),
    fov: 38,
  };

  constructor(quality: QualityInfo) {
    this.quality = quality;
    this.group.name = 'chapter-client';
    this.buildMonitor();
    this.buildHalo();
    this.buildBase();
    this.buildRequestFormation();
    this.buildAnnotations();

    this.capsule = createDataCapsule({
      color: PALETTE.orange,
      length: 1.8,
      radius: 0.3,
      infoId: 'request-capsule',
      label: 'REQUEST',
    });
    this.capsule.position.set(2.65, 2.6, 1.4);
    this.capsule.userData.infoId = 'request-capsule';
    this.requestGroup.add(this.capsule);
    this.pickables.push(this.capsule);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
    this.formatLine = new Line(
      geometry,
      new LineBasicMaterial({ color: PALETTE.orange, transparent: true, opacity: 0.5 }),
    );
    this.formatLine.renderOrder = 3;
    this.group.add(this.formatLine);

    this.motes = createFlowParticles(
      new CatmullRomCurve3([
        new Vector3(1.3, 3.1, 0.3),
        new Vector3(2.0, 2.8, 0.8),
        new Vector3(2.65, 2.6, 1.4),
      ]),
      {
        count: Math.round(26 * Math.max(0.5, quality.nodeScale)),
        color: PALETTE.orange,
        size: quality.isMobile ? 0.08 : 0.06,
        speed: 0.1,
        opacity: 0.8,
        jitter: 0.18,
      },
    );
    this.requestGroup.add(this.motes.object);
    this.group.add(this.requestGroup);

    this.requestGroup.visible = false;
    this.screen.update({
      phase: 'landing',
      stageIndex: 0,
      stageProgress: 0,
      visibleTokens: 0,
      clientMode: 'web',
    });
  }

  private buildMonitor(): void {
    const frame = new Mesh(
      roundedBox(SCREEN_WIDTH + 0.6, SCREEN_HEIGHT + 0.6, 0.26, 0.08),
      graphiteMaterial({ color: '#242522', roughness: 0.24, metalness: 0.78 }),
    );
    frame.castShadow = true;
    frame.receiveShadow = false;
    frame.userData.infoId = 'client-screen';
    this.monitor.add(frame);

    const screenMesh = new Mesh(
      new PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT),
      new MeshBasicMaterial({ map: this.screen.texture, toneMapped: false }),
    );
    screenMesh.position.z = 0.137;
    screenMesh.userData.infoId = 'client-screen';
    this.monitor.add(screenMesh);

    const reflection = new Mesh(
      new PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT),
      new MeshPhysicalMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.035,
        roughness: 0.04,
        metalness: 0.3,
        clearcoat: 1,
        depthWrite: false,
      }),
    );
    reflection.position.z = 0.145;
    this.monitor.add(reflection);

    const bevel = new Mesh(
      roundedBox(SCREEN_WIDTH + 0.74, SCREEN_HEIGHT + 0.74, 0.1, 0.09),
      new MeshPhysicalMaterial({
        color: '#d9dfdc',
        transparent: true,
        opacity: 0.18,
        roughness: 0.08,
        metalness: 0.6,
        clearcoat: 1,
        depthWrite: false,
      }),
    );
    bevel.position.z = -0.1;
    this.monitor.add(bevel);

    const power = new Mesh(
      roundedBox(0.48, 0.03, 0.03, 0.01),
      new MeshBasicMaterial({ color: PALETTE.orange, toneMapped: false }),
    );
    power.position.set(0, -SCREEN_HEIGHT / 2 - 0.22, 0.18);
    this.monitor.add(power);

    for (let index = 0; index < 4; index += 1) {
      const x = index % 2 === 0 ? -1 : 1;
      const y = index < 2 ? -1 : 1;
      const screw = new Mesh(
        new CircleGeometry(0.025, 10),
        new MeshBasicMaterial({ color: '#6e6f69', toneMapped: false }),
      );
      screw.position.set(
        x * (SCREEN_WIDTH / 2 + 0.22),
        y * (SCREEN_HEIGHT / 2 + 0.2),
        0.17,
      );
      this.monitor.add(screw);
    }

    const bezelLine = lineFromPoints(
      [
        [-SCREEN_WIDTH / 2 - 0.1, -SCREEN_HEIGHT / 2 - 0.18, 0.17],
        [SCREEN_WIDTH / 2 + 0.1, -SCREEN_HEIGHT / 2 - 0.18, 0.17],
      ],
      PALETTE.graphite,
      0.28,
    );
    this.monitor.add(bezelLine);

    this.monitor.position.set(0, MONITOR_CENTER_Y, 0);
    this.monitor.rotation.y = -0.06;
    this.monitor.userData.infoId = 'client-screen';
    this.group.add(this.monitor);
    this.pickables.push(this.monitor);
  }

  private buildHalo(): void {
    this.halo.position.set(-0.2, MONITOR_CENTER_Y + 0.2, -1.15);
    const radius = 4.35;
    const arcs = [
      { start: 0.1, arc: 1.65, opacity: 0.24 },
      { start: 2.1, arc: 1.2, opacity: 0.16 },
      { start: 3.7, arc: 1.85, opacity: 0.22 },
    ];
    for (const entry of arcs) {
      const ring = new Mesh(
        new TorusGeometry(radius, 0.009, 4, 180, entry.arc),
        new MeshBasicMaterial({
          color: new Color(PALETTE.graphite),
          transparent: true,
          opacity: entry.opacity,
          depthWrite: false,
          side: DoubleSide,
        }),
      );
      ring.rotation.z = entry.start;
      this.halo.add(ring);
    }

    const innerRing = new Mesh(
      new TorusGeometry(3.9, 0.006, 4, 220),
      new MeshBasicMaterial({ color: PALETTE.hairline, transparent: true, opacity: 0.48, depthWrite: false }),
    );
    this.halo.add(innerRing);

    const marker = new Mesh(
      new TorusGeometry(radius, 0.02, 5, 18, 0.13),
      new MeshBasicMaterial({ color: PALETTE.orange, toneMapped: false }),
    );
    marker.rotation.z = 1.42;
    this.halo.add(marker);

    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2;
      const inner = radius + 0.12;
      const outer = radius + (index % 6 === 0 ? 0.34 : 0.19);
      const tick = lineFromPoints(
        [
          [Math.cos(angle) * inner, Math.sin(angle) * inner, 0],
          [Math.cos(angle) * outer, Math.sin(angle) * outer, 0],
        ],
        index % 6 === 0 ? PALETTE.orange : PALETTE.graphite,
        index % 6 === 0 ? 0.55 : 0.18,
      );
      this.halo.add(tick);
    }

    this.group.add(this.halo);
  }

  private buildBase(): void {
    const rings = [
      { inner: 3.05, outer: 3.062, opacity: 0.28 },
      { inner: 3.55, outer: 3.558, opacity: 0.18 },
      { inner: 4.2, outer: 4.206, opacity: 0.1 },
    ];
    for (const entry of rings) {
      const ring = new Mesh(
        new RingGeometry(entry.inner, entry.outer, 128),
        new MeshBasicMaterial({
          color: PALETTE.graphite,
          transparent: true,
          opacity: entry.opacity,
          depthWrite: false,
          side: DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.012;
      this.baseRings.add(ring);
    }

    for (let index = 0; index < 36; index += 1) {
      const angle = (index / 36) * Math.PI * 2;
      const inner = 3.02;
      const outer = index % 9 === 0 ? 3.38 : 3.2;
      const tick = lineFromPoints(
        [
          [Math.cos(angle) * inner, 0.014, Math.sin(angle) * inner],
          [Math.cos(angle) * outer, 0.014, Math.sin(angle) * outer],
        ],
        index % 9 === 0 ? PALETTE.orange : PALETTE.graphite,
        index % 9 === 0 ? 0.6 : 0.28,
      );
      this.baseRings.add(tick);
    }

    // Four measurement tethers make the monitor feel suspended rather than pasted on.
    for (let index = 0; index < 4; index += 1) {
      const angle = Math.PI / 4 + (index * Math.PI) / 2;
      const start = new Vector3(
        Math.cos(angle) * (SCREEN_WIDTH / 2 + 0.4),
        MONITOR_CENTER_Y - SCREEN_HEIGHT / 2 - 0.35,
        Math.sin(angle) * 0.4,
      );
      const end = new Vector3(Math.cos(angle) * 2.8, 0.03, Math.sin(angle) * 2.8);
      this.baseRings.add(lineFromPoints([start, end], PALETTE.graphite, 0.11));
    }

    this.group.add(this.baseRings);
  }

  private buildRequestFormation(): void {
    const apiTexture = makeRequestPanelTexture('api');
    const webTexture = makeRequestPanelTexture('web');

    const createPanel = (texture: CanvasTexture, id: string): Group => {
      const panel = new Group();
      const back = new Mesh(
        roundedBox(4.9, 3.55, 0.08, 0.05),
        new MeshPhysicalMaterial({
          color: '#f7f5ef',
          transparent: true,
          opacity: 0.82,
          roughness: 0.14,
          metalness: 0.08,
          clearcoat: 1,
          depthWrite: false,
        }),
      );
      back.castShadow = true;
      panel.add(back);

      const face = new Mesh(
        new PlaneGeometry(4.64, 3.28),
        new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide, toneMapped: false }),
      );
      face.position.z = 0.045;
      panel.add(face);

      const edge = lineFromPoints(
        [
          [-2.35, -1.63, 0.06],
          [2.35, -1.63, 0.06],
          [2.35, 1.63, 0.06],
          [-2.35, 1.63, 0.06],
          [-2.35, -1.63, 0.06],
        ],
        PALETTE.graphite,
        0.22,
      );
      panel.add(edge);

      const topLine = lineFromPoints(
        [
          [-2.35, 1.63, 0.062],
          [2.35, 1.63, 0.062],
        ],
        PALETTE.orange,
        0.75,
      );
      panel.add(topLine);
      panel.position.set(4.45, 3.3, 1.1);
      panel.rotation.y = -0.3;
      panel.userData.infoId = id;
      return panel;
    };

    this.apiGroup.add(createPanel(apiTexture, 'request-capsule'));
    this.webGroup.add(createPanel(webTexture, 'request-capsule'));

    const label = makeSpriteLabel('REQUEST / 构造请求体', 'APPLICATION/JSON · STREAM=TRUE', {
      height: 0.28,
      color: PALETTE.ink,
      subColor: PALETTE.orange,
      background: 'rgba(253,252,249,0.9)',
      border: 'rgba(216,213,204,0.9)',
      fontSize: 44,
      subFontSize: 21,
      paddingX: 22,
      paddingY: 16,
    });
    label.position.set(4.45, 5.3, 1.1);
    label.rotation.y = -0.34;
    this.apiGroup.add(label);
    this.webGroup.add(label.clone());

    this.group.add(this.apiGroup, this.webGroup);
    this.pickables.push(this.apiGroup, this.webGroup);
  }

  private buildAnnotations(): void {
    const clientLabel = makeSpriteLabel('CLIENT / 浏览器', 'USER DEVICE · REQUEST ORIGIN', {
      height: 0.26,
      color: PALETTE.ink,
      subColor: PALETTE.muted,
      fontSize: 42,
      subFontSize: 19,
      paddingX: 18,
      paddingY: 12,
    });
    clientLabel.position.set(-5.25, 6.05, 0.8);
    this.annotations.add(clientLabel);

    const outLabel = makeSpriteLabel('HTTPS / OUT', 'TLS 1.3 · APPLICATION/JSON', {
      height: 0.23,
      color: PALETTE.orange,
      subColor: PALETTE.muted,
      fontSize: 38,
      subFontSize: 18,
      paddingX: 16,
      paddingY: 10,
    });
    outLabel.position.set(3.0, 0.95, 1.6);
    this.annotations.add(outLabel);

    const measure = lineFromPoints(
      [
        [-4.15, 0.95, 0.2],
        [4.15, 0.95, 0.2],
      ],
      PALETTE.graphite,
      0.18,
    );
    this.annotations.add(measure);
    this.group.add(this.annotations);

    const spriteGlowTexture = makeGlowTextureLocal();
    const glow = new Sprite(
      new SpriteMaterial({
        map: spriteGlowTexture,
        color: PALETTE.orange,
        transparent: true,
        opacity: 0.12,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(9, 6, 1);
    glow.position.set(0, MONITOR_CENTER_Y, -0.5);
    this.group.add(glow);

    const groundGlow = new Mesh(
      new CircleGeometry(3.0, 64),
      glowMaterial({ color: PALETTE.orange, opacity: 0.035, additive: false }),
    );
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = 0.006;
    this.group.add(groundGlow);
  }

  update(frame: SceneFrame): void {
    const motion = frame.reducedMotion ? 0 : 1;
    const stage = frame.stageIndex;
    const activeRequest = frame.phase === 'journey' && stage === 0;
    const activeArrival = frame.phase === 'journey' && stage === 8;
    const landing = frame.phase === 'landing';
    const ended = frame.phase === 'ended';

    this.monitor.position.y = MONITOR_CENTER_Y + Math.sin(frame.time * 0.6) * 0.02 * motion;
    this.halo.rotation.z = frame.time * 0.018 * motion - 0.1;
    this.baseRings.rotation.y = frame.time * 0.01 * motion;

    const visibleTokens = ended
      ? ANSWER_TOKENS.length
      : activeArrival
        ? Math.floor(smooth((frame.stageProgress - 0.02) / 0.58) * ANSWER_TOKENS.length)
        : 0;

    this.screen.update({
      phase: frame.phase,
      stageIndex: stage,
      stageProgress: frame.stageProgress,
      visibleTokens,
      clientMode: frame.clientMode,
    });

    this.annotations.visible = activeRequest && frame.stageProgress > 0.2 && !this.quality.isMobile;
    this.requestGroup.visible = activeRequest;
    this.apiGroup.visible =
      activeRequest &&
      frame.clientMode === 'api' &&
      frame.stageProgress > 0.12 &&
      !this.quality.isMobile;
    this.webGroup.visible =
      activeRequest &&
      frame.clientMode === 'web' &&
      frame.stageProgress > 0.12 &&
      !this.quality.isMobile;
    this.formatLine.visible = activeRequest && frame.stageProgress > 0.12;

    if (activeRequest) {
      const progress = frame.stageProgress;
      const appear = smooth((progress - 0.1) / 0.22);
      const travel = smooth((progress - 0.62) / 0.36);
      this.capsule.visible = progress > 0.08;
      this.capsule.scale.setScalar(Math.max(0.001, appear * 0.95));
      this.capsule.position.set(
        2.7 + travel * 10.5,
        2.55 + travel * 1.5 + Math.sin(frame.time * 1.2) * 0.04 * motion,
        1.35 + travel * 0.8,
      );
      this.capsule.rotation.x = frame.time * 0.22 * motion;
      this.capsule.rotation.z = Math.sin(frame.time * 0.4) * 0.06 * motion;

      this.updateFormatLine();
      this.motes.update(frame.time, Math.min(1, appear * 1.12));
    } else {
      this.capsule.visible = false;
    }

    // Gentle depth tilt in the arrival stage to reveal the physical frame.
    if (activeArrival) {
      this.monitor.rotation.y = -0.06 + Math.sin(smooth((frame.stageProgress - 0.55) / 0.3) * Math.PI) * 0.03;
    } else {
      this.monitor.rotation.y = -0.06;
    }

    if (landing) {
      this.capsule.visible = false;
      this.requestGroup.visible = false;
      this.apiGroup.visible = false;
      this.webGroup.visible = false;
      this.formatLine.visible = false;
      this.annotations.visible = false;
    }

    if (this.quality.isMobile) {
      this.formatLine.visible = false;
    }
  }

  private updateFormatLine(): void {
    const attribute = this.formatLine.geometry.getAttribute('position') as BufferAttribute;
    const values = attribute.array as Float32Array;
    values[0] = 1.8;
    values[1] = 3.1;
    values[2] = 0.2;
    values[3] = 2.2;
    values[4] = 2.8;
    values[5] = 0.8;
    values[6] = this.capsule.position.x - 0.6;
    values[7] = this.capsule.position.y;
    values[8] = this.capsule.position.z;
    attribute.needsUpdate = true;
    this.formatLine.geometry.computeBoundingSphere();
  }

  cameraPose(frame: SceneFrame, aspect: number): CameraPose {
    let pose: CameraPose;
    if (frame.phase === 'landing') {
      const drift = frame.reducedMotion ? 0 : 1;
      pose = {
        position: new Vector3(
          11.6 + Math.sin(frame.time * 0.07) * 0.5 * drift,
          7.4 + Math.cos(frame.time * 0.055) * 0.2 * drift,
          23.2,
        ),
        target: new Vector3(-3.2, 3.0, 0),
        fov: 36.5,
      };
    } else if (frame.phase === 'ended') {
      pose = {
        position: FINAL_OVERVIEW_POSITION.clone(),
        target: FINAL_OVERVIEW_TARGET.clone(),
        fov: 48,
      };
    } else if (frame.stageIndex === 0) {
      pose = samplePose(STAGE_ONE_POSES, frame.stageProgress);
    } else if (frame.stageIndex === 8) {
      pose = samplePose(ARRIVAL_POSES, frame.stageProgress);
    } else {
      pose = samplePose(ARRIVAL_POSES, 1);
    }

    if (aspect < 1) {
      const distanceScale = 1.42 + (1 - aspect) * 0.5;
      const offset = pose.position.clone().sub(pose.target).multiplyScalar(distanceScale);
      pose.position.copy(pose.target).add(offset);
      pose.fov = Math.min(62, pose.fov + 5);
      // The desktop composition places the screen right of centre to dodge the
      // chapter card. On a phone the card is below, so pull the subject back to
      // the horizontal centre of the viewport.
      pose.target.x *= 0.24;
    } else if (aspect < 1.35) {
      const offset = pose.position.clone().sub(pose.target).multiplyScalar(1.06);
      pose.position.copy(pose.target).add(offset);
    }

    this.currentPose.position.copy(pose.position);
    this.currentPose.target.copy(pose.target);
    this.currentPose.fov = pose.fov;
    return this.currentPose;
  }

  dispose(): void {
    this.screen.dispose();
    this.group.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = (mesh as Mesh).material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else if (material) material.dispose();
    });
    this.motes.object.geometry.dispose();
    (this.motes.object.material as MeshBasicMaterial).dispose();
  }
}

/* --------------------------------------------------------------------------
   Panel textures — actual request data is drawn from request.ts through the
   same values used by the HTML inspector, so the two views cannot drift.
   -------------------------------------------------------------------------- */

function makeRequestPanelTexture(mode: 'web' | 'api'): CanvasTexture {
  const width = 1200;
  const height = 840;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Request panel needs a 2D canvas');

  ctx.fillStyle = '#f7f5ef';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(20,20,20,0.055)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#e4572a';
  ctx.font = `500 18px ${FONT_MONO}`;
  ctx.textBaseline = 'top';
  ctx.fillText(mode === 'api' ? 'API / REQUEST BODY' : 'WEB / CLIENT PIPELINE', 54, 40);

  ctx.fillStyle = 'rgba(20,20,20,0.38)';
  ctx.font = `400 15px ${FONT_MONO}`;
  ctx.fillText(mode === 'api' ? 'POST /v1/chat/completions' : 'UI → MESSAGES → JSON → HTTPS', 54, 68);

  if (mode === 'api') {
    const lines = [
      { text: 'POST /v1/chat/completions HTTP/2', color: '#247c70' },
      { text: 'content-type: application/json', color: 'rgba(20,20,20,0.44)' },
      { text: 'authorization: Bearer ••••••', color: 'rgba(20,20,20,0.32)' },
      { text: '', color: '#141414' },
      { text: '{', color: '#141414' },
      { text: '  "model": "qwen2.5-7b-instruct",', color: '#141414' },
      { text: '  "messages": [', color: '#141414' },
      { text: '    { "role": "user",', color: '#141414' },
      { text: '      "content": "为什么天空是蓝色的？" }', color: '#141414' },
      { text: '  ],', color: '#141414' },
      { text: '  "stream": true,', color: '#e4572a' },
      { text: '  "temperature": 0.7,', color: '#e4572a' },
      { text: '  "max_tokens": 512', color: '#141414' },
      { text: '}', color: '#141414' },
    ];
    let y = 130;
    for (const line of lines) {
      ctx.font = `400 23px ${FONT_MONO}`;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, 58, y);
      y += 40;
    }
    ctx.fillStyle = 'rgba(20,20,20,0.28)';
    ctx.font = `400 15px ${FONT_MONO}`;
    ctx.fillText('IDENTITY · MODEL · MESSAGES · STREAM', 58, 770);
  } else {
    const steps = [
      { label: '01 / INPUT', value: '「为什么天空是蓝色的？」' },
      { label: '02 / MESSAGES', value: 'role: user · content: text' },
      { label: '03 / SERIALIZE', value: 'JSON.stringify(request)' },
      { label: '04 / HTTPS POST', value: '等待 text/event-stream' },
    ];
    let y = 145;
    for (const step of steps) {
      ctx.fillStyle = 'rgba(20,20,20,0.06)';
      ctx.fillRect(54, y, 1092, 104);
      ctx.fillStyle = '#e4572a';
      ctx.font = `500 17px ${FONT_MONO}`;
      ctx.fillText(step.label, 78, y + 24);
      ctx.fillStyle = '#141414';
      ctx.font = `400 25px ${FONT_SANS}`;
      ctx.fillText(step.value, 78, y + 56);
      if (y < 145 + 3 * 130) {
        ctx.fillStyle = 'rgba(228,87,42,0.3)';
        ctx.fillRect(78, y + 110, 1, 14);
      }
      y += 130;
    }
    ctx.fillStyle = 'rgba(20,20,20,0.3)';
    ctx.font = `400 15px ${FONT_MONO}`;
    ctx.fillText('THE BROWSER IS A REQUEST BUILDER, NOT THE MODEL', 54, 770);
  }

  ctx.strokeStyle = 'rgba(20,20,20,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeGlowTextureLocal(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(228,87,42,0.9)');
    gradient.addColorStop(0.25, 'rgba(228,87,42,0.3)');
    gradient.addColorStop(1, 'rgba(228,87,42,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
