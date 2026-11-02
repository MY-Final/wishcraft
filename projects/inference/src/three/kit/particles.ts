import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Vector3,
  type Curve,
} from 'three';
import { PALETTE } from './palette';

let cachedDotTexture: CanvasTexture | null = null;

export function dotTexture(): CanvasTexture {
  if (cachedDotTexture) return cachedDotTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.72, 'rgba(255,255,255,0.18)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  cachedDotTexture = texture;
  return texture;
}

export interface FlowParticlesOptions {
  count: number;
  color?: string;
  size?: number;
  speed?: number;
  opacity?: number;
  additive?: boolean;
  jitter?: number;
  reverse?: boolean;
  phase?: number;
}

export interface FlowParticles {
  object: Points;
  update(time: number, progress?: number): void;
}

export function createFlowParticles(
  curve: Curve<Vector3>,
  options: FlowParticlesOptions,
): FlowParticles {
  const count = options.count;
  const positions = new Float32Array(count * 3);
  const offsets = new Float32Array(count);
  const jitter = new Float32Array(count * 2);
  const target = new Vector3();

  for (let index = 0; index < count; index += 1) {
    offsets[index] = (index / count + Math.random() * 0.02) % 1;
    jitter[index * 2] = (Math.random() - 0.5) * (options.jitter ?? 0.14);
    jitter[index * 2 + 1] = (Math.random() - 0.5) * (options.jitter ?? 0.14);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.boundingSphere = null;
  const material = new PointsMaterial({
    color: new Color(options.color ?? PALETTE.orange),
    size: options.size ?? 0.09,
    map: dotTexture(),
    transparent: true,
    opacity: options.opacity ?? 0.86,
    depthWrite: false,
    sizeAttenuation: true,
    blending: options.additive ? AdditiveBlending : undefined,
    toneMapped: false,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 4;

  const update = (time: number, progress?: number) => {
    const speed = options.speed ?? 0.08;
    for (let index = 0; index < count; index += 1) {
      let u = (offsets[index] + time * speed + (options.phase ?? 0)) % 1;
      if (u < 0) u += 1;
      if (options.reverse) u = 1 - u;
      if (progress !== undefined) {
        const visible = u <= progress ? 1 : 0;
        if (!visible) {
          // Park unrevealed motes slightly below the rail so a path draws itself on.
          positions[index * 3] = 0;
          positions[index * 3 + 1] = -999;
          positions[index * 3 + 2] = 0;
          continue;
        }
      }
      curve.getPointAt(u, target);
      positions[index * 3] = target.x + jitter[index * 2];
      positions[index * 3 + 1] = target.y + jitter[index * 2 + 1];
      positions[index * 3 + 2] = target.z + Math.sin(time * 0.7 + index) * 0.02;
    }
    (geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };

  update(0);
  return { object: points, update };
}

export interface DustFieldOptions {
  count: number;
  area: [number, number, number];
  center?: Vector3;
  color?: string;
  size?: number;
  opacity?: number;
  drift?: number;
}

export interface DustField {
  object: Points;
  update(time: number): void;
}

export function createDustField(options: DustFieldOptions): DustField {
  const count = options.count;
  const positions = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  const [ax, ay, az] = options.area;
  const center = options.center ?? new Vector3();
  const phase = new Float32Array(count * 2);

  for (let index = 0; index < count; index += 1) {
    const x = (Math.random() - 0.5) * ax;
    const y = (Math.random() - 0.5) * ay;
    const z = (Math.random() - 0.5) * az;
    base[index * 3] = x;
    base[index * 3 + 1] = y;
    base[index * 3 + 2] = z;
    positions[index * 3] = center.x + x;
    positions[index * 3 + 1] = center.y + y;
    positions[index * 3 + 2] = center.z + z;
    phase[index * 2] = Math.random() * Math.PI * 2;
    phase[index * 2 + 1] = 0.2 + Math.random() * 0.7;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.boundingSphere = null;
  const material = new PointsMaterial({
    color: new Color(options.color ?? PALETTE.muted),
    size: options.size ?? 0.04,
    map: dotTexture(),
    transparent: true,
    opacity: options.opacity ?? 0.26,
    depthWrite: false,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;

  const update = (time: number) => {
    const drift = options.drift ?? 0.05;
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = center.x + base[index * 3] + Math.sin(time * 0.13 + phase[index * 2]) * drift;
      positions[index * 3 + 1] =
        center.y + base[index * 3 + 1] + Math.sin(time * phase[index * 2 + 1] * 0.4 + phase[index * 2]) * drift;
      positions[index * 3 + 2] = center.z + base[index * 3 + 2] + Math.cos(time * 0.11 + phase[index * 2]) * drift;
    }
    (geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };

  update(0);
  return { object: points, update };
}
