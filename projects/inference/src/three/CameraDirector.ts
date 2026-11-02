import { PerspectiveCamera, Spherical, Vector3 } from 'three';
import type { CameraPose } from './types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * A small cinematic rig. The chapter scene proposes a pose each frame; the
 * director interpolates toward it and layers a bounded user orbit on top.
 */
export class CameraDirector {
  private readonly camera: PerspectiveCamera;
  private readonly currentPosition = new Vector3();
  private readonly currentTarget = new Vector3();
  private readonly desiredPosition = new Vector3();
  private readonly desiredTarget = new Vector3();
  private readonly offset = new Vector3();
  private readonly spherical = new Spherical();
  private currentFov = 42;
  private yaw = 0;
  private pitch = 0;
  private zoom = 1;
  private initialized = false;
  private lastInteraction = -1000;
  private snapRequested = false;

  constructor(camera: PerspectiveCamera) {
    this.camera = camera;
  }

  orbit(deltaX: number, deltaY: number, now: number): void {
    this.yaw -= deltaX * 0.0042;
    this.pitch = clamp(this.pitch + deltaY * 0.003, -0.5, 0.42);
    this.lastInteraction = now;
  }

  zoomBy(delta: number, now: number): void {
    const factor = Math.exp(clamp(delta, -160, 160) * 0.0012);
    this.zoom = clamp(this.zoom * factor, 0.58, 2.15);
    this.lastInteraction = now;
  }

  reset(now: number): void {
    this.yaw = 0;
    this.pitch = 0;
    this.zoom = 1;
    this.lastInteraction = now;
    this.snapRequested = false;
  }

  markInteraction(now: number): void {
    this.lastInteraction = now;
  }

  update(pose: CameraPose, deltaSeconds: number, aspect: number, explore: boolean, now: number): void {
    const dt = Math.min(0.08, Math.max(0.001, deltaSeconds));
    this.desiredTarget.copy(pose.target);
    this.offset.copy(pose.position).sub(pose.target);
    this.spherical.setFromVector3(this.offset);
    this.spherical.theta += this.yaw;
    this.spherical.phi = clamp(this.spherical.phi + this.pitch, 0.11, Math.PI - 0.11);
    this.spherical.radius *= this.zoom;

    this.offset.setFromSpherical(this.spherical);
    this.desiredPosition.copy(this.desiredTarget).add(this.offset);

    if (!explore && now - this.lastInteraction > 4200) {
      const relax = 1 - Math.exp(-dt * 1.4);
      this.yaw += (0 - this.yaw) * relax;
      this.pitch += (0 - this.pitch) * relax;
      this.zoom += (1 - this.zoom) * relax;
    }

    if (!this.initialized || this.snapRequested) {
      this.currentPosition.copy(this.desiredPosition);
      this.currentTarget.copy(this.desiredTarget);
      this.currentFov = pose.fov;
      this.initialized = true;
      this.snapRequested = false;
    } else {
      const positionEase = 1 - Math.exp(-dt * (pose.fov > 46 ? 2.1 : 2.7));
      const targetEase = 1 - Math.exp(-dt * 3.2);
      const fovEase = 1 - Math.exp(-dt * 2.6);
      this.currentPosition.lerp(this.desiredPosition, positionEase);
      this.currentTarget.lerp(this.desiredTarget, targetEase);
      this.currentFov += (pose.fov - this.currentFov) * fovEase;
    }

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
    this.camera.fov = this.currentFov;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  snap(pose: CameraPose, aspect: number): void {
    this.currentPosition.copy(pose.position);
    this.currentTarget.copy(pose.target);
    this.currentFov = pose.fov;
    this.camera.position.copy(pose.position);
    this.camera.lookAt(pose.target);
    this.camera.fov = pose.fov;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.initialized = true;
    this.snapRequested = false;
  }

  get position(): Vector3 {
    return this.currentPosition;
  }

  get target(): Vector3 {
    return this.currentTarget;
  }
}
