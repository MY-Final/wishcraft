import type * as THREE from 'three';

export type Phase = 'landing' | 'journey' | 'ended';
export type ArchitectureMode = 'dense' | 'moe';
export type ClientMode = 'web' | 'api';
export type SceneKey = 'client' | 'network' | 'tokenizer' | 'embedding' | 'model' | 'stream';

export interface QualityInfo {
  dpr: number;
  isMobile: boolean;
  nodeScale: number;
  reducedMotion: boolean;
  tier: 'high' | 'balanced' | 'lite';
}

export interface SceneFrame {
  phase: Phase;
  stageIndex: number;
  stageProgress: number;
  globalProgress: number;
  /** Wall-clock seconds since this browser session opened. */
  time: number;
  /** Seconds spent inside the current chapter (already multiplied by play speed). */
  stageElapsed: number;
  speed: number;
  playing: boolean;
  architecture: ArchitectureMode;
  clientMode: ClientMode;
  temperature: number;
  reducedMotion: boolean;
  quality: QualityInfo;
  generatedTokenCount: number;
}

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

/**
 * Every chapter owns one container in the shared world. Local coordinates are
 * relative to its anchor; the camera pose returned here is also local.
 */
export interface StageScene {
  readonly group: THREE.Group;
  readonly pickables: THREE.Object3D[];
  update(frame: SceneFrame): void;
  cameraPose(frame: SceneFrame, aspect: number): CameraPose;
  dispose(): void;
}

export interface JourneyTick {
  phase: Phase;
  stageIndex: number;
  stageProgress: number;
  globalProgress: number;
  architecture: ArchitectureMode;
  clientMode: ClientMode;
  temperature: number;
  generatedTokenCount: number;
  time: number;
  stageElapsed: number;
}

export type InfoId = string;
