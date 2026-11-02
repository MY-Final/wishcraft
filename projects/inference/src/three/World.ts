import {
  ACESFilmicToneMapping,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  GridHelper,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  RingGeometry,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { generatedTokensAt } from '../data/metrics';
import { STAGES } from '../data/journey';
import { CameraDirector } from './CameraDirector';
import { JOURNEY_CURVE, SCENE_ANCHORS, STAGE_SCENE_KEYS, WORLD_FOG } from './layout';
import { createDustField, createFlowParticles } from './kit/particles';
import { lineFromPoints, tickStrip, tubeAlong } from './kit/geometry';
import { makeSpriteLabel } from './kit/textures';
import { PALETTE } from './kit/palette';
import type { CameraPose, QualityInfo, SceneFrame, SceneKey, StageScene } from './types';
import { ClientScene } from './scenes/client/ClientScene';
import { ModelScene } from './scenes/model/ModelScene';
import { NetworkScene } from './scenes/transit/NetworkScene';
import { StreamScene } from './scenes/transit/StreamScene';
import { TokenizerScene } from './scenes/language/TokenizerScene';
import { EmbeddingScene } from './scenes/language/EmbeddingScene';

export interface WorldInput extends SceneFrame {
  explore: boolean;
  cameraNonce: number;
}

export interface WorldOptions {
  quality: QualityInfo;
  onPick: (infoId: string, tokenIndex?: number) => void;
}

interface SceneEntry {
  key: SceneKey;
  scene: StageScene;
}

const STAGE_GROUPS: Record<SceneKey, { label: string; radius: number; offset: Vector3 }> = {
  client: { label: 'CLIENT / 客户端', radius: 4.7, offset: new Vector3(0, 0, 0) },
  network: { label: 'NETWORK / 网络', radius: 4.2, offset: new Vector3(0, 0, 0) },
  tokenizer: { label: 'TOKENIZER / 分词', radius: 3.8, offset: new Vector3(0, 0, 0) },
  embedding: { label: 'EMBEDDING / 嵌入', radius: 4.5, offset: new Vector3(0, 0, 0) },
  model: { label: 'TRANSFORMER / 计算', radius: 13.5, offset: new Vector3(0, 0, 0) },
  stream: { label: 'STREAM / 返回', radius: 4.4, offset: new Vector3(0, 0, 0) },
};

const SCENE_KEYS: SceneKey[] = ['network', 'tokenizer', 'embedding', 'model', 'stream', 'client'];

export class World {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private readonly canvas: HTMLCanvasElement;
  private readonly quality: QualityInfo;
  private readonly onPick: WorldOptions['onPick'];
  private readonly director: CameraDirector;
  private readonly scenes: Record<SceneKey, SceneEntry>;
  private readonly raycaster = new Raycaster();
  private readonly pointerNdc = new Vector2();
  private readonly ground: Mesh;
  private readonly keyLight: DirectionalLight;
  private readonly fillLight: DirectionalLight;
  private readonly ambientDust: ReturnType<typeof createDustField>;
  private readonly railParticles: ReturnType<typeof createFlowParticles>;
  private readonly railGroup = new Group();
  private readonly landmarks = new Group();
  private readonly environmentTarget: WebGLRenderTarget;
  private readonly resizeHandler: () => void;
  private readonly pointerHandlers: {
    down: (event: PointerEvent) => void;
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
    wheel: (event: WheelEvent) => void;
    leave: (event: PointerEvent) => void;
  };
  private readonly activePointers = new Map<number, { x: number; y: number }>();
  private lastPointer = { x: 0, y: 0 };
  private gestureDistance = 0;
  private pointerMoved = 0;
  private primaryPointer: number | null = null;
  private pinched = false;
  private lastHoverCheck = 0;
  private lastCameraNonce: number;
  private currentStage = 0;
  private activeKey: SceneKey = 'client';
  private aspect = 1;
  private disposed = false;
  private fps = 0;
  private drawCalls = 0;
  private triangles = 0;

  constructor(canvas: HTMLCanvasElement, options: WorldOptions) {
    this.canvas = canvas;
    this.quality = options.quality;
    this.onPick = options.onPick;
    this.aspect = canvas.clientWidth > 0 ? canvas.clientWidth / Math.max(1, canvas.clientHeight) : 1;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    });
    this.renderer.setClearColor(new Color(PALETTE.paper), 1);
    this.renderer.setPixelRatio(options.quality.dpr);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.camera = new PerspectiveCamera(42, this.aspect, 0.1, 360);
    this.camera.position.set(9, 6, 18);
    this.scene.background = new Color(PALETTE.paper);
    this.scene.fog = new Fog(WORLD_FOG.color, WORLD_FOG.near, WORLD_FOG.far);

    this.director = new CameraDirector(this.camera);

    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentTarget = pmrem.fromScene(room, 0.035);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.58;
    pmrem.dispose();

    const hemisphere = new HemisphereLight(0xffffff, 0xdedbd2, 1.08);
    this.scene.add(hemisphere);

    this.keyLight = new DirectionalLight(0xfffdf6, 2.35);
    this.keyLight.position.set(20, 34, 28);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(
      options.quality.isMobile ? 1024 : 2048,
      options.quality.isMobile ? 1024 : 2048,
    );
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 110;
    this.keyLight.shadow.camera.left = -32;
    this.keyLight.shadow.camera.right = 32;
    this.keyLight.shadow.camera.top = 32;
    this.keyLight.shadow.camera.bottom = -32;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.fillLight = new DirectionalLight(0xf0f4f2, 0.62);
    this.fillLight.position.set(-24, 18, 20);
    this.scene.add(this.fillLight);

    this.ground = new Mesh(
      new PlaneGeometry(430, 430),
      new ShadowMaterial({ color: 0x1b1a17, opacity: 0.2, transparent: true }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0.001;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.buildFloor();
    this.buildJourney();

    this.scenes = {
      client: { key: 'client', scene: new ClientScene(options.quality) },
      network: { key: 'network', scene: new NetworkScene(options.quality) },
      tokenizer: { key: 'tokenizer', scene: new TokenizerScene(options.quality) },
      embedding: { key: 'embedding', scene: new EmbeddingScene(options.quality) },
      model: { key: 'model', scene: new ModelScene(options.quality) },
      stream: { key: 'stream', scene: new StreamScene(options.quality) },
    };

    Object.values(this.scenes).forEach((entry) => {
      entry.scene.group.position.copy(SCENE_ANCHORS[entry.key]);
      this.scene.add(entry.scene.group);
    });

    this.buildStageRings();
    this.buildLandmarks();
    this.scene.add(this.landmarks);
    this.landmarks.visible = false;
    this.ambientDust = createDustField({
      count: Math.round((options.quality.isMobile ? 170 : 390) * Math.max(0.55, options.quality.nodeScale)),
      area: [126, 32, 78],
      center: new Vector3(48, 14, -5),
      color: PALETTE.muted,
      size: options.quality.isMobile ? 0.055 : 0.045,
      opacity: 0.16,
      drift: 0.1,
    });
    this.scene.add(this.ambientDust.object);

    this.railParticles = createFlowParticles(JOURNEY_CURVE, {
      count: Math.round((options.quality.isMobile ? 58 : 130) * Math.max(0.6, options.quality.nodeScale)),
      color: PALETTE.orange,
      size: options.quality.isMobile ? 0.095 : 0.068,
      speed: 0.014,
      opacity: 0.55,
      jitter: 0.14,
    });
    this.scene.add(this.railParticles.object);

    this.lastCameraNonce = -1;
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler, { passive: true });

    this.pointerHandlers = {
      down: (event) => this.handlePointerDown(event),
      move: (event) => this.handlePointerMove(event),
      up: (event) => this.handlePointerUp(event),
      wheel: (event) => this.handleWheel(event),
      leave: (event) => this.handlePointerLeave(event),
    };
    canvas.addEventListener('pointerdown', this.pointerHandlers.down);
    canvas.addEventListener('pointermove', this.pointerHandlers.move);
    canvas.addEventListener('pointerup', this.pointerHandlers.up);
    canvas.addEventListener('pointercancel', this.pointerHandlers.up);
    canvas.addEventListener('pointerleave', this.pointerHandlers.leave);
    canvas.addEventListener('wheel', this.pointerHandlers.wheel, { passive: false });
  }

  private buildFloor(): void {
    const grid = new GridHelper(340, 170, new Color('#d7d4cb'), new Color('#e5e2da'));
    grid.position.y = 0.006;
    const gridMaterial = grid.material as LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.26;
    gridMaterial.depthWrite = false;
    this.scene.add(grid);

    const horizonPoints: Vector3[] = [];
    for (let index = 0; index <= 160; index += 1) {
      const angle = (index / 160) * Math.PI * 2;
      horizonPoints.push(new Vector3(Math.cos(angle) * 82, 0.015, Math.sin(angle) * 82));
    }
    this.scene.add(lineFromPoints(horizonPoints, PALETTE.graphite, 0.16));

    const crosshairA = lineFromPoints(
      [
        [-60, 0.018, 0],
        [60, 0.018, 0],
      ],
      PALETTE.graphite,
      0.08,
    );
    const crosshairB = lineFromPoints(
      [
        [0, 0.018, -60],
        [0, 0.018, 60],
      ],
      PALETTE.graphite,
      0.08,
    );
    this.scene.add(crosshairA, crosshairB);
  }

  private buildJourney(): void {
    const rail = tubeAlong(
      JOURNEY_CURVE,
      0.024,
      new MeshBasicMaterial({ color: PALETTE.graphite, transparent: true, opacity: 0.38 }),
      260,
      4,
    );
    this.railGroup.add(rail);

    const accent = tubeAlong(
      JOURNEY_CURVE,
      0.011,
      new MeshBasicMaterial({ color: PALETTE.orange, transparent: true, opacity: 0.62, toneMapped: false }),
      260,
      3,
    );
    accent.position.y = 0.025;
    this.railGroup.add(accent);
    this.scene.add(this.railGroup);
    this.railGroup.visible = false;

    for (let index = 0; index < SCENE_KEYS.length; index += 1) {
      const key = SCENE_KEYS[index];
      const anchor = SCENE_ANCHORS[key];
      const radius = STAGE_GROUPS[key].radius;
      const ring = new Mesh(
        new RingGeometry(radius - 0.018, radius + 0.018, 128),
        new MeshBasicMaterial({
          color: PALETTE.graphite,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(anchor.x, 0.014, anchor.z);
      this.scene.add(ring);

      const ticks = tickStrip(radius * 2, 20, {
        axis: 'x',
        color: PALETTE.graphite,
        opacity: 0.12,
        tickSize: 0.12,
        majorEvery: 5,
        origin: new Vector3(anchor.x - radius, 0.02, anchor.z + radius + 0.2),
      });
      this.scene.add(ticks);
    }
  }

  private buildStageRings(): void {
    const positions: Array<{ key: SceneKey; stage: number }> = [
      { key: 'network', stage: 1 },
      { key: 'tokenizer', stage: 2 },
      { key: 'embedding', stage: 3 },
      { key: 'model', stage: 4 },
      { key: 'stream', stage: 7 },
    ];

    for (const entry of positions) {
      const anchor = SCENE_ANCHORS[entry.key];
      const stage = STAGES[entry.stage];
      const label = makeSpriteLabel(
        `${String(entry.stage + 1).padStart(2, '0')} / ${stage.nav}`,
        stage.en,
        {
          height: 0.22,
          color: PALETTE.muted,
          subColor: PALETTE.muted,
          fontSize: 28,
          subFontSize: 13,
          paddingX: 10,
          paddingY: 6,
        },
      );
      label.position.set(
        anchor.x - STAGE_GROUPS[entry.key].radius - 1.4,
        0.55,
        anchor.z + STAGE_GROUPS[entry.key].radius * 0.65,
      );
      this.landmarks.add(label);
    }

    const clientAnchor = SCENE_ANCHORS.client;
    const clientStage = STAGES[0];
    const clientLabel = makeSpriteLabel(`01 / ${clientStage.nav}`, clientStage.en, {
      height: 0.22,
      color: PALETTE.muted,
      subColor: PALETTE.muted,
      fontSize: 28,
      subFontSize: 13,
      paddingX: 10,
      paddingY: 6,
    });
    clientLabel.position.set(clientAnchor.x - 6.0, 0.55, clientAnchor.z + 5.0);
    this.landmarks.add(clientLabel);
  }

  private buildLandmarks(): void {
    const entries: Array<{ key: SceneKey; stage: number; offset: Vector3; height: number }> = [
      { key: 'client', stage: 0, offset: new Vector3(-7.2, 0, 4.4), height: 7.2 },
      { key: 'network', stage: 1, offset: new Vector3(-6.2, 0, -7.2), height: 8.4 },
      { key: 'tokenizer', stage: 2, offset: new Vector3(-5.0, 0, -4.6), height: 8.4 },
      { key: 'embedding', stage: 3, offset: new Vector3(-6.4, 0, 0.5), height: 8.4 },
      { key: 'model', stage: 4, offset: new Vector3(-16.4, 0, -10.1), height: 27 },
    ];

    for (const entry of entries) {
      const anchor = SCENE_ANCHORS[entry.key];
      const x = anchor.x + entry.offset.x;
      const z = anchor.z + entry.offset.z;
      const pole = new Mesh(
        new CylinderGeometry(0.028, 0.028, entry.height, 6),
        new MeshBasicMaterial({ color: PALETTE.graphite, transparent: true, opacity: 0.55 }),
      );
      pole.position.set(x, entry.height / 2, z);
      this.landmarks.add(pole);
      const beacon = new Mesh(
        new SphereGeometry(0.14, 10, 8),
        new MeshBasicMaterial({ color: PALETTE.orange, toneMapped: false }),
      );
      beacon.position.set(x, entry.height + 0.1, z);
      this.landmarks.add(beacon);
      const stage = STAGES[entry.stage];
      const label = makeSpriteLabel(`${String(entry.stage + 1).padStart(2, '0')} / ${stage.nav}`, stage.en, {
        height: 0.4,
        color: PALETTE.ink,
        subColor: PALETTE.muted,
        fontSize: 40,
        subFontSize: 18,
        paddingX: 16,
        paddingY: 9,
      });
      label.position.set(x, entry.height + 0.9, z);
      this.landmarks.add(label);
    }

    const streamAnchor = SCENE_ANCHORS.stream;
    const streamLabel = makeSpriteLabel('08 / 返回', 'THE STREAM', {
      height: 0.38,
      color: PALETTE.teal,
      subColor: PALETTE.muted,
      fontSize: 38,
      subFontSize: 17,
      paddingX: 15,
      paddingY: 8,
    });
    streamLabel.position.set(streamAnchor.x, streamAnchor.y + 5.6, streamAnchor.z);
    this.landmarks.add(streamLabel);
  }

  update(input: WorldInput, deltaSeconds: number): void {
    if (this.disposed) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = Math.min(0.08, Math.max(0.001, deltaSeconds));

    if (input.cameraNonce !== this.lastCameraNonce) {
      this.lastCameraNonce = input.cameraNonce;
      this.director.reset(now);
    }

    const activeKey = this.resolveActiveKey(input);
    this.activeKey = activeKey;
    this.currentStage = input.stageIndex;

    const activeEntry = this.scenes[activeKey];
    const sceneFrame = this.makeSceneFrame(input, activeKey);
    activeEntry.scene.update(sceneFrame);

    if (input.phase === 'ended' || (input.stageIndex === 8 && input.stageProgress > 0.52)) {
      this.updateFinaleScenes(input, activeKey);
    }

    const localPose = activeEntry.scene.cameraPose(sceneFrame, this.aspect);
    const anchor = SCENE_ANCHORS[activeKey];
    const desired: CameraPose = {
      position: localPose.position.clone().add(anchor),
      target: localPose.target.clone().add(anchor),
      fov: localPose.fov,
    };
    if (this.quality.isMobile && this.aspect < 0.95 && input.phase === 'journey') {
      const panorama = input.stageIndex === 8 && input.stageProgress > 0.45;
      if (!panorama) {
        const distance = desired.position.distanceTo(desired.target);
        const viewHeight = 2 * distance * Math.tan((desired.fov * Math.PI) / 360);
        desired.target.y -= viewHeight * 0.105;
      }
    }
    this.director.update(desired, dt, this.aspect, input.explore, now);

    this.updateVisibility(input, activeKey);
    this.updateLighting(anchor, input);
    this.railParticles.update(input.time);
    this.ambientDust.update(input.time);
    this.railParticles.object.position.y = 0;

    this.renderer.render(this.scene, this.camera);
    this.updateStats(dt);
  }

  private resolveActiveKey(input: WorldInput): SceneKey {
    if (input.phase === 'landing' || input.phase === 'ended' || input.stageIndex === 8) return 'client';
    return STAGE_SCENE_KEYS[input.stageIndex] ?? 'client';
  }

  private makeSceneFrame(input: WorldInput, _key: SceneKey): SceneFrame {
    return {
      phase: input.phase,
      stageIndex: input.stageIndex,
      stageProgress: input.stageProgress,
      globalProgress: input.globalProgress,
      time: input.time,
      stageElapsed: input.stageElapsed,
      speed: input.speed,
      playing: input.playing,
      architecture: input.architecture,
      clientMode: input.clientMode,
      temperature: input.temperature,
      reducedMotion: input.reducedMotion || this.quality.reducedMotion,
      quality: this.quality,
      generatedTokenCount: generatedTokensAt(input.stageIndex, input.stageProgress),
    };
  }

  private finalFrame(stageIndex: number, input: WorldInput): SceneFrame {
    return {
      phase: 'journey',
      stageIndex,
      stageProgress: 1,
      globalProgress: 1,
      time: input.time,
      stageElapsed: STAGES[stageIndex]?.duration ?? 1,
      speed: 1,
      playing: false,
      architecture: input.architecture,
      clientMode: input.clientMode,
      temperature: input.temperature,
      reducedMotion: input.reducedMotion || this.quality.reducedMotion,
      quality: this.quality,
      generatedTokenCount: 55,
    };
  }

  private updateFinaleScenes(input: WorldInput, activeKey: SceneKey): void {
    const stageByKey: Record<SceneKey, number> = {
      client: 8,
      network: 1,
      tokenizer: 2,
      embedding: 3,
      model: 6,
      stream: 7,
    };
    for (const entry of Object.values(this.scenes)) {
      if (entry.key === activeKey) continue;
      const frame = this.finalFrame(stageByKey[entry.key], input);
      if (entry.key === 'client') frame.phase = 'ended';
      entry.scene.update(frame);
    }
    if (activeKey === 'client') {
      const clientFrame = this.finalFrame(8, input);
      clientFrame.phase = 'ended';
      this.scenes.client.scene.update(clientFrame);
    }
  }

  private updateVisibility(input: WorldInput, activeKey: SceneKey): void {
    const panorama = input.phase === 'ended' || (input.stageIndex === 8 && input.stageProgress > 0.45);
    this.landmarks.visible = panorama;
    this.railGroup.visible = panorama;
    this.railParticles.object.visible = panorama;
    for (const entry of Object.values(this.scenes)) {
      entry.scene.group.visible = panorama || entry.key === activeKey;
    }
    void input;
  }

  private updateLighting(anchor: Vector3, input: WorldInput): void {
    const panorama = input.phase === 'ended' || (input.stageIndex === 8 && input.stageProgress > 0.6);
    if (panorama) {
      const center = new Vector3(44, 2, 0);
      this.keyLight.position.set(center.x + 26, 44, center.z + 32);
      this.keyLight.target.position.copy(center);
      this.fillLight.position.set(center.x - 38, 26, center.z + 20);
      this.keyLight.shadow.camera.left = -70;
      this.keyLight.shadow.camera.right = 70;
      this.keyLight.shadow.camera.top = 70;
      this.keyLight.shadow.camera.bottom = -70;
      this.keyLight.shadow.camera.updateProjectionMatrix();
    } else {
      this.keyLight.position.set(anchor.x + 22, 36, anchor.z + 28);
      this.keyLight.target.position.copy(anchor);
      this.fillLight.position.set(anchor.x - 26, 20, anchor.z + 22);
      this.keyLight.shadow.camera.left = -36;
      this.keyLight.shadow.camera.right = 36;
      this.keyLight.shadow.camera.top = 36;
      this.keyLight.shadow.camera.bottom = -36;
      this.keyLight.shadow.camera.updateProjectionMatrix();
    }
    this.keyLight.target.updateMatrixWorld();
  }

  private updateStats(dt: number): void {
    const instant = 1 / dt;
    this.fps = this.fps === 0 ? instant : this.fps * 0.92 + instant * 0.08;
    this.drawCalls = this.renderer.info.render.calls;
    this.triangles = this.renderer.info.render.triangles;
  }

  private resize(): void {
    if (this.disposed) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.aspect = width / height;
    this.renderer.setPixelRatio(this.quality.dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  getDebugInfo(): {
    fps: number;
    drawCalls: number;
    triangles: number;
    stage: number;
    activeScene: SceneKey;
    camera: [number, number, number];
  } {
    return {
      fps: Math.round(this.fps),
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      stage: this.currentStage,
      activeScene: this.activeKey,
      camera: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
    };
  }

  /* ---- pointer & pick -------------------------------------------------- */

  private setNdc(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private raycastPick(event: PointerEvent): { infoId: string; tokenIndex?: number } | null {
    this.setNdc(event);
    return this.raycastNdc();
  }

  /** Public for the automated browser suite — same raycast path as a real click. */
  pickAtScreen(clientX: number, clientY: number): { infoId: string; tokenIndex?: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    return this.raycastNdc();
  }

  private raycastNdc(): { infoId: string; tokenIndex?: number } | null {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const pickables = Object.values(this.scenes)
      .filter((entry) => entry.scene.group.visible)
      .flatMap((entry) => entry.scene.pickables);
    if (pickables.length === 0) return null;
    const hits = this.raycaster.intersectObjects(pickables, true);
    for (const hit of hits) {
      if (!isEffectivelyVisible(hit.object)) continue;
      let current: Object3D | null = hit.object;
      let tokenIndex: number | undefined;
      while (current) {
        if (typeof current.userData.tokenIndex === 'number' && tokenIndex === undefined) {
          tokenIndex = current.userData.tokenIndex as number;
        }
        if (typeof current.userData.infoId === 'string') {
          return { infoId: current.userData.infoId as string, tokenIndex };
        }
        current = current.parent;
      }
    }
    return null;
  }

  private handlePointerDown(event: PointerEvent): void {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.activePointers.size === 1) {
      this.primaryPointer = event.pointerId;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.pointerMoved = 0;
      this.pinched = false;
      this.canvas.setPointerCapture?.(event.pointerId);
      this.canvas.classList.add('is-dragging');
    } else if (this.activePointers.size === 2) {
      this.pinched = true;
      const [first, second] = [...this.activePointers.values()];
      this.gestureDistance = Math.hypot(first.x - second.x, first.y - second.y);
    }
    this.director.markInteraction(performance.now());
  }

  private handlePointerMove(event: PointerEvent): void {
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (this.activePointers.size >= 2) {
      const [first, second] = [...this.activePointers.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (this.gestureDistance > 0) {
        this.director.zoomBy(-(distance - this.gestureDistance) * 1.5, performance.now());
      }
      this.gestureDistance = distance;
      this.canvas.classList.remove('is-dragging');
      return;
    }

    if (this.activePointers.size === 1 && this.primaryPointer === event.pointerId) {
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.pointerMoved += Math.abs(dx) + Math.abs(dy);
      if (this.pointerMoved > 3) {
        this.director.orbit(dx, dy, performance.now());
        this.canvas.classList.add('is-dragging');
      }
      return;
    }

    const now = performance.now();
    if (now - this.lastHoverCheck < 70) return;
    this.lastHoverCheck = now;
    const pick = this.raycastPick(event);
    this.canvas.classList.toggle('is-pickable', Boolean(pick));
  }

  private handlePointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    this.canvas.classList.remove('is-dragging');
    if (this.canvas.hasPointerCapture?.(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    const wasPrimary = this.primaryPointer === event.pointerId;
    const isTap = wasPrimary && this.pointerMoved < 5 && !this.pinched;
    if (this.activePointers.size === 0) {
      this.primaryPointer = null;
      this.gestureDistance = 0;
      this.pinched = false;
    }
    if (!isTap) return;

    const pick = this.raycastPick(event);
    if (pick) {
      this.onPick(pick.infoId, pick.tokenIndex);
      this.canvas.classList.remove('is-pickable');
    }
  }

  private handlePointerLeave(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) this.canvas.classList.remove('is-pickable');
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    this.director.zoomBy(event.deltaY, performance.now());
    this.canvas.classList.remove('is-pickable');
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('resize', this.resizeHandler);
    this.canvas.removeEventListener('pointerdown', this.pointerHandlers.down);
    this.canvas.removeEventListener('pointermove', this.pointerHandlers.move);
    this.canvas.removeEventListener('pointerup', this.pointerHandlers.up);
    this.canvas.removeEventListener('pointercancel', this.pointerHandlers.up);
    this.canvas.removeEventListener('pointerleave', this.pointerHandlers.leave);
    this.canvas.removeEventListener('wheel', this.pointerHandlers.wheel);
    Object.values(this.scenes).forEach((entry) => entry.scene.dispose());
    this.ambientDust.object.geometry.dispose();
    (this.ambientDust.object.material as MeshBasicMaterial).dispose();
    this.railParticles.object.geometry.dispose();
    (this.railParticles.object.material as MeshBasicMaterial).dispose();
    this.environmentTarget.dispose();
    this.renderer.dispose();
    this.ground.geometry.dispose();
    (this.ground.material as ShadowMaterial).dispose();
  }
}

function isEffectivelyVisible(object: Object3D): boolean {
  let current: Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}
