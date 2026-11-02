import {
  BufferGeometry,
  CatmullRomCurve3,
  type Curve,
  type Material,
  Mesh,
  Object3D,
  TubeGeometry,
  Vector3,
  Line,
  LineSegments,
  BufferAttribute,
  LineBasicMaterial,
  Group,
  SphereGeometry,
  MeshBasicMaterial,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PALETTE } from './palette';

export function roundedBox(width: number, height: number, depth: number, radius = 0.06): RoundedBoxGeometry {
  const r = Math.min(radius, width / 2 - 0.001, height / 2 - 0.001, depth / 2 - 0.001);
  return new RoundedBoxGeometry(width, height, depth, 3, Math.max(0.001, r));
}

export function lineFromPoints(
  points: Array<Vector3 | [number, number, number]>,
  color: string = PALETTE.graphite,
  opacity = 0.5,
): Line {
  const vectors = points.map((point) => (point instanceof Vector3 ? point : new Vector3(...point)));
  const geometry = new BufferGeometry().setFromPoints(vectors);
  const material = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new Line(geometry, material);
  line.renderOrder = 1;
  return line;
}

export function curveFromPoints(points: Array<Vector3 | [number, number, number]>): CatmullRomCurve3 {
  const vectors = points.map((point) => (point instanceof Vector3 ? point : new Vector3(...point)));
  return new CatmullRomCurve3(vectors, false, 'catmullrom', 0.3);
}

export function tubeAlong(
  curve: Curve<Vector3>,
  radius = 0.02,
  material: Material,
  tubularSegments = 96,
  radialSegments = 5,
): Mesh {
  const geometry = new TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function hairlineCurve(
  points: Array<Vector3 | [number, number, number]>,
  color: string = PALETTE.graphite,
  opacity = 0.26,
): Line {
  return lineFromPoints(points, color, opacity);
}

export function tickStrip(
  length: number,
  count: number,
  options: {
    color?: string;
    opacity?: number;
    axis?: 'x' | 'y' | 'z';
    tickSize?: number;
    majorEvery?: number;
    origin?: Vector3;
  } = {},
): Group {
  const group = new Group();
  const color = options.color ?? PALETTE.graphite;
  const opacity = options.opacity ?? 0.25;
  const axis = options.axis ?? 'x';
  const tickSize = options.tickSize ?? 0.08;
  const origin = options.origin ?? new Vector3();
  const majorEvery = options.majorEvery ?? 5;
  const start = -length / 2;

  const mainGeometry = new BufferGeometry().setFromPoints([
    axis === 'x' ? new Vector3(start, 0, 0) : axis === 'y' ? new Vector3(0, start, 0) : new Vector3(0, 0, start),
    axis === 'x' ? new Vector3(length / 2, 0, 0) : axis === 'y' ? new Vector3(0, length / 2, 0) : new Vector3(0, 0, length / 2),
  ]);
  const main = new Line(
    mainGeometry,
    new LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  main.position.copy(origin);
  group.add(main);

  const positions: number[] = [];
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const value = start + t * length;
    const size = index % majorEvery === 0 ? tickSize * 2.1 : tickSize;
    if (axis === 'x') {
      positions.push(value, -size, 0, value, size, 0);
    } else if (axis === 'y') {
      positions.push(-size, value, 0, size, value, 0);
    } else {
      positions.push(0, -size, value, 0, size, value);
    }
  }
  const tickGeometry = new BufferGeometry();
  tickGeometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  const ticks = new LineSegments(
    tickGeometry,
    new LineBasicMaterial({ color, transparent: true, opacity: Math.min(1, opacity + 0.12), depthWrite: false }),
  );
  ticks.position.copy(origin);
  group.add(ticks);
  return group;
}

export function smallSphere(radius = 0.04, color: string = PALETTE.orange): Mesh {
  return new Mesh(
    new SphereGeometry(radius, 10, 8),
    new MeshBasicMaterial({ color, toneMapped: false }),
  );
}

export function setShadows(object: Object3D, cast = true, receive = false): void {
  object.traverse((child) => {
    if ((child as Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

export function disposeObject(root: Object3D): void {
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (mesh as Mesh).material;
    if (Array.isArray(material)) {
      material.forEach((entry) => disposeMaterial(entry));
    } else if (material) {
      disposeMaterial(material);
    }
  });
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && typeof value === 'object' && 'isTexture' in value) {
      (value as { isTexture: boolean; dispose: () => void }).dispose();
    }
  }
  material.dispose();
}
