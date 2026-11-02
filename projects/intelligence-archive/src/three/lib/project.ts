/**
 * OWNER: three
 * 3D → 屏幕像素投影。所有二维 DOM 标签都走这里，
 * 避免在 3D 里绘制文字纹理。
 */
import * as THREE from 'three';

const scratch = new THREE.Vector3();

export interface ScreenPoint {
  x: number;
  y: number;
  /** false = 在相机背后 / 视锥外，DOM 标签应隐藏 */
  visible: boolean;
}

export function projectToScreen(
  position: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
  out: ScreenPoint,
): ScreenPoint {
  scratch.copy(position).project(camera);
  const z = scratch.z;
  out.x = (scratch.x * 0.5 + 0.5) * width;
  out.y = (-scratch.y * 0.5 + 0.5) * height;
  out.visible = z > -1 && z < 1;
  return out;
}

export function createScreenPoint(): ScreenPoint {
  return { x: 0, y: 0, visible: false };
}
