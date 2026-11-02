import { CatmullRomCurve3, Vector3 } from 'three';
import type { SceneKey } from './types';

/**
 * The world is one continuous instrument, not six slides. Chapters sit on a
 * long, shallow arc; the return path loops above the model so the finale can
 * show the request and the answer as one closed circuit.
 */
export const SCENE_ANCHORS: Record<SceneKey, Vector3> = {
  client: new Vector3(0, 0, 0),
  network: new Vector3(27, 0, -12),
  tokenizer: new Vector3(46, 0, -24),
  embedding: new Vector3(63, 0, -24),
  model: new Vector3(86, 0, -8),
  stream: new Vector3(46, 11, 22),
};

export const STAGE_SCENE_KEYS: readonly SceneKey[] = [
  'client',
  'network',
  'tokenizer',
  'embedding',
  'model',
  'model',
  'model',
  'stream',
  'client',
];

export const JOURNEY_RAIL_POINTS: Vector3[] = [
  new Vector3(0, 0.48, 6.2),
  new Vector3(0, 0.48, 0),
  new Vector3(12, 0.48, -5.2),
  new Vector3(27, 0.48, -12),
  new Vector3(36, 0.48, -18),
  new Vector3(46, 0.48, -24),
  new Vector3(55, 0.48, -24),
  new Vector3(63, 0.48, -24),
  new Vector3(74, 0.48, -17),
  new Vector3(86, 0.48, -8),
  new Vector3(92, 2.2, -2),
  new Vector3(84, 7.2, 10),
  new Vector3(63, 10.4, 20),
  new Vector3(46, 11, 22),
  new Vector3(24, 12, 27),
  new Vector3(10, 8, 20),
  new Vector3(3, 3, 10),
  new Vector3(0, 1.2, 6.2),
];

export const JOURNEY_CURVE = new CatmullRomCurve3(JOURNEY_RAIL_POINTS, false, 'catmullrom', 0.28);

export const FINAL_OVERVIEW_POSITION = new Vector3(67, 27, 53);
export const FINAL_OVERVIEW_TARGET = new Vector3(43, 5, -3);

export const WORLD_FOG = { color: '#f4f3ef', near: 30, far: 148 };
