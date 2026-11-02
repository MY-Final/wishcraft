import {
  AdditiveBlending,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import type { TokenDatum } from '../../data/tokenization';
import { PALETTE } from './palette';
import { accentMaterial, glassMaterial, graphiteMaterial } from './materials';
import { lineFromPoints, roundedBox } from './geometry';
import { makeGlowTexture, makeTokenTexture, makeTextTexture } from './textures';

export interface TokenSlab {
  group: Group;
  width: number;
  height: number;
  label: Mesh;
}

export function createTokenSlab(token: TokenDatum): TokenSlab {
  const group = new Group();
  const labelTexture = makeTokenTexture(token.display, token.id, token.index);
  const labelHeight = 1.16;
  const labelWidth = labelHeight * labelTexture.aspect;
  const width = Math.max(0.95, labelWidth * 0.82);
  const height = 1.62;
  const depth = 0.38;

  const shell = new Mesh(roundedBox(width, height, depth, 0.08), glassMaterial({ opacity: 0.34 }));
  shell.castShadow = true;
  group.add(shell);

  const edgeGeometry = new EdgesGeometry(shell.geometry, 24);
  const edges = new LineSegments(
    edgeGeometry,
    new LineBasicMaterial({ color: PALETTE.graphite, transparent: true, opacity: 0.24 }),
  );
  group.add(edges);

  const label = new Mesh(
    new PlaneGeometry(labelWidth, labelHeight),
    new MeshBasicMaterial({
      map: labelTexture.texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  label.position.z = depth / 2 + 0.006;
  label.renderOrder = 3;
  group.add(label);

  const base = new Mesh(
    roundedBox(width * 0.84, 0.06, depth * 0.75, 0.02),
    accentMaterial(token.index % 3 === 0 ? PALETTE.orange : PALETTE.graphiteSoft),
  );
  base.position.y = -height / 2 - 0.04;
  group.add(base);

  group.userData.infoId = 'tokenizer';
  group.userData.token = token;
  return { group, width, height, label };
}

export interface CapsuleOptions {
  color?: string;
  length?: number;
  radius?: number;
  infoId?: string;
  label?: string;
}

export function createDataCapsule(options: CapsuleOptions = {}): Group {
  const group = new Group();
  const radius = options.radius ?? 0.32;
  const length = options.length ?? 1.7;
  const color = options.color ?? PALETTE.orange;

  const shell = new Mesh(roundedBox(length, radius * 2.3, radius * 2.3, radius), glassMaterial({
    color: '#ffffff',
    opacity: 0.36,
    roughness: 0.04,
  }));
  group.add(shell);

  const core = new Mesh(
    new CylinderGeometry(radius * 0.27, radius * 0.27, length * 0.72, 12, 1, true),
    new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false }),
  );
  core.rotation.z = Math.PI / 2;
  group.add(core);

  const glowTexture = makeGlowTexture(color);
  const glow = new Sprite(
    new SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  glow.scale.setScalar(2.4);
  group.add(glow);

  for (let index = 0; index < 2; index += 1) {
    const ring = new Mesh(
      new TorusGeometry(radius * 1.45, 0.022, 6, 32),
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.7, toneMapped: false }),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.x = index === 0 ? -length * 0.22 : length * 0.22;
    group.add(ring);
  }

  if (options.label) {
    const texture = makeTextTexture(options.label, 'HTTPS · APPLICATION/JSON', {
      color: PALETTE.ink,
      subColor: PALETTE.teal,
      fontSize: 54,
      subFontSize: 24,
      paddingX: 28,
      paddingY: 22,
    });
    const label = new Sprite(
      new SpriteMaterial({ map: texture.texture, transparent: true, depthWrite: false, toneMapped: false }),
    );
    const height = 0.28;
    label.scale.set(height * texture.aspect, height, 1);
    label.position.set(0, 0.62, 0.2);
    group.add(label);
  }

  group.userData.infoId = options.infoId ?? 'request-capsule';
  return group;
}

export interface NodePostOptions {
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  accent?: string;
  label?: string;
  sublabel?: string;
  infoId?: string;
}

/**
 * A precision instrument post: graphite base, glass body, orange measurement tick.
 * Scenes use it for gateways, servers and standalone explanatory nodes.
 */
export function createNodePost(options: NodePostOptions = {}): Group {
  const group = new Group();
  const width = options.width ?? 1.6;
  const height = options.height ?? 2.4;
  const depth = options.depth ?? 1.6;
  const accent = options.accent ?? PALETTE.orange;

  const base = new Mesh(roundedBox(width * 1.1, 0.12, depth * 1.1, 0.02), graphiteMaterial());
  base.position.y = -height / 2;
  base.castShadow = true;
  group.add(base);

  const glass = new Mesh(roundedBox(width, height, depth, 0.08), glassMaterial({ opacity: 0.24 }));
  glass.castShadow = true;
  group.add(glass);

  const edges = new LineSegments(
    new EdgesGeometry(glass.geometry, 24),
    new LineBasicMaterial({ color: PALETTE.graphite, transparent: true, opacity: 0.32 }),
  );
  group.add(edges);

  const spine = new Mesh(
    roundedBox(0.035, height * 0.78, 0.035, 0.01),
    accentMaterial(accent),
  );
  spine.position.z = depth / 2 + 0.01;
  group.add(spine);

  for (let index = 0; index < 4; index += 1) {
    const tick = new Mesh(
      roundedBox(width * 0.34, 0.018, 0.018, 0.005),
      new MeshBasicMaterial({ color: PALETTE.graphiteSoft, transparent: true, opacity: 0.48 }),
    );
    tick.position.set(-width * 0.26, -height * 0.25 + index * height * 0.15, depth / 2 + 0.02);
    group.add(tick);
  }

  const top = new Mesh(new SphereGeometry(0.07, 12, 10), accentMaterial(accent));
  top.position.y = height / 2 + 0.08;
  group.add(top);

  if (options.label) {
    const texture = makeTextTexture(options.label, options.sublabel, {
      fontSize: 48,
      subFontSize: 22,
      color: PALETTE.ink,
      subColor: PALETTE.muted,
    });
    const label = new Sprite(
      new SpriteMaterial({ map: texture.texture, transparent: true, depthWrite: false, toneMapped: false }),
    );
    const labelHeight = 0.26;
    label.scale.set(labelHeight * texture.aspect, labelHeight, 1);
    label.position.set(0, height / 2 + 0.42, 0);
    label.renderOrder = 12;
    group.add(label);
  }

  if (options.infoId) group.userData.infoId = options.infoId;
  return group;
}

export function createMeasureLine(
  from: Vector3 | [number, number, number],
  to: Vector3 | [number, number, number],
  color = PALETTE.graphiteSoft,
  opacity = 0.32,
): Group {
  const group = new Group();
  const a = from instanceof Vector3 ? from : new Vector3(...from);
  const b = to instanceof Vector3 ? to : new Vector3(...to);
  const line = lineFromPoints([a, b], color, opacity);
  group.add(line);
  const headGeometry = new SphereGeometry(0.025, 8, 6);
  const headMaterial = new MeshBasicMaterial({ color, transparent: true, opacity: opacity + 0.2 });
  const headA = new Mesh(headGeometry, headMaterial);
  const headB = new Mesh(headGeometry, headMaterial);
  headA.position.copy(a);
  headB.position.copy(b);
  group.add(headA, headB);
  return group;
}
