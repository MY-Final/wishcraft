/**
 * StreamScene 的共享布局与句柄类型。
 *
 * 三个标尺（Token / SSE 事件 / 传输 Chunk）共用同一段横向范围，但边界
 * 分别由 Token 序号与字节数计算——错位是刻意的教学内容。
 */
import type {
  CanvasTexture,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Sprite,
} from 'three';
import type { DustField, FlowParticles } from '../../kit/particles';
import type { NetworkChunk, SseEvent } from '../../../data/request';
import { NETWORK_CHUNKS, SSE_EVENTS } from '../../../data/request';
import { OUTPUT_TOKEN_COUNT } from '../../../data/tokenization';
import type { BuildContext, CameraKey, SupportSpec } from './transitSupport';

export const RAIL_Y = 1.02;
export const RAIL_X_MODEL = 13.9;
export const RAIL_X_CLIENT = -12.7;

/** Token 标尺（模型侧语义）与传输标尺共用的横向范围。 */
export const TOKEN_X0 = 8.6;
export const TOKEN_X1 = -2.2;
export const TOKEN_TOTAL = OUTPUT_TOKEN_COUNT;
export const CHUNK_START_Y = 0.36;
export const CHUNK_CENTRE_Y = 1.78;
export const CHUNK_HEIGHT = 0.95;
export const CHUNK_DEPTH = 1.2;
export const EVENT_RAIL_Y = 2.95;

export const DETOK_X = 11.9;
export const MAST_X = 9.8;
export const TTFT_X = -2.7;
export const CLIENT_X = -11.4;

export const tokenX = (token: number): number =>
  TOKEN_X0 - (token / TOKEN_TOTAL) * (TOKEN_X0 - TOKEN_X1);

const parseBytes = (label: string): number => {
  const parsed = Number.parseInt(label, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export interface ChunkSpan {
  start: number;
  end: number;
  data: NetworkChunk;
}

export interface EventSpan {
  start: number;
  end: number;
  data: SseEvent;
}

/** 事件边界由 Token 序号决定。 */
export const EVENT_SPANS: EventSpan[] = SSE_EVENTS.map((event) => ({
  data: event,
  start: tokenX(event.tokenStart),
  end: tokenX(event.tokenEnd + 1),
}));

/** Chunk 边界由字节数决定——与事件边界并不重合。 */
const BYTE_TOTAL = NETWORK_CHUNKS.reduce((sum, chunk) => sum + parseBytes(chunk.byteLabel), 0);
export const CHUNK_SPANS: ChunkSpan[] = (() => {
  let cumulative = 0;
  return NETWORK_CHUNKS.map((chunk) => {
    const from = cumulative;
    cumulative += parseBytes(chunk.byteLabel);
    const start = TOKEN_X0 - (from / BYTE_TOTAL) * (TOKEN_X0 - TOKEN_X1);
    const end = TOKEN_X0 - (cumulative / BYTE_TOTAL) * (TOKEN_X0 - TOKEN_X1);
    return { data: chunk, start, end };
  });
})();

/** 相机沿返回链路滑向客户端（-X）。后撤到 ~14 单位，让 2–3 个 Chunk 舱
 * 组成一个完整装配，而不是贴脸看玻璃箱。 */
export const STREAM_CAMERA_KEYS: readonly CameraKey[] = [
  { at: 0.02, position: [18.4, 3.9, 11.2], target: [9.8, 1.8, 0], fov: 36 },
  { at: 0.25, position: [12.5, 3.7, 9.8], target: [4.8, 1.8, 0], fov: 36 },
  { at: 0.5, position: [7.3, 3.7, 9.4], target: [0.2, 1.8, 0], fov: 36 },
  { at: 0.75, position: [1.5, 3.8, 9.2], target: [-4.4, 1.8, 0], fov: 36 },
  { at: 1, position: [-2.3, 4.4, 11.9], target: [-11.0, 1.9, 0], fov: 37 },
];

export interface EventMarkerHandle {
  material: MeshBasicMaterial;
  label: Sprite;
  center: number;
  index: number;
}

/** 每帧会被改写的对象与 Canvas 贴图。 */
export interface StreamHandles {
  detokDrum: Group;
  detokRibbonMaterial: MeshBasicMaterial;
  previewCanvas: HTMLCanvasElement;
  previewTexture: CanvasTexture;
  eventMarkers: EventMarkerHandle[];
  chunkLamps: InstancedMesh;
  chunkMotes: InstancedMesh;
  chunkLabels: Sprite[];
  moteBase: Float32Array;
  moteChunk: Uint8Array;
  motePhase: Float32Array;
  ttftNeedle: Group;
  ttftBar: Mesh;
  portRingMaterial: MeshBasicMaterial;
  /** 延迟标尺上滑向客户端的那颗橙色读数珠。 */
  latencyMarker: Mesh;
  /** 客户端窗口标题，只在镜头接近回程终点时显示。 */
  clientLabel: Sprite;
  screenCanvas: HTMLCanvasElement;
  screenTexture: CanvasTexture;
  flow: FlowParticles;
  protocolFlow: FlowParticles;
  dust: DustField;
}

export interface StreamBuildContext extends BuildContext<StreamHandles> {}

export interface BuiltStream {
  group: Group;
  pickables: Object3D[];
  handles: StreamHandles;
  supports: SupportSpec[];
}
