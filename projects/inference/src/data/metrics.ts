import { ANSWER_TOKENS, INPUT_TOKEN_COUNT, OUTPUT_TOKEN_COUNT } from './tokenization';

/**
 * A single, clearly-labelled simulation profile. These numbers are designed to
 * be internally coherent, not to imitate any provider's telemetry.
 */
export const DEMO_MODEL = {
  name: 'DEMO-7B-INSTRUCT',
  layers: 28,
  attentionHeads: 32,
  headDim: 128,
  hiddenSize: 4096,
  dtype: 'FP16',
  bytesPerElement: 2,
  kvCacheCapacityMiB: 128,
} as const;

const KV_BYTES_PER_TOKEN =
  2 * DEMO_MODEL.layers * DEMO_MODEL.attentionHeads * DEMO_MODEL.headDim * DEMO_MODEL.bytesPerElement;
export const KV_MIB_PER_TOKEN = KV_BYTES_PER_TOKEN / (1024 * 1024);

export const SIMULATED = {
  inputTokens: INPUT_TOKEN_COUNT,
  outputTokens: OUTPUT_TOKEN_COUNT,
  prefillMs: 263,
  ttftMs: 418,
  decodeTokPerSec: 39.8,
  networkMs: 84,
  queueMs: 71,
} as const;

export interface MetricSnapshot {
  inputTokens: number;
  generatedTokens: number;
  prefillMs: number;
  ttftMs: number | null;
  decodeSpeed: number;
  kvUsedMiB: number;
  kvCapacityMiB: number;
  kvPercent: number;
  totalMs: number;
  visibleChunks: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/** The scripted answer becomes visible across Decode / Stream / Arrival. */
export function generatedTokensAt(stageIndex: number, stageProgress: number): number {
  if (stageIndex < 6) return 0;
  if (stageIndex > 6) return OUTPUT_TOKEN_COUNT;
  const t = clamp01((stageProgress - 0.1) / 0.82);
  return Math.min(OUTPUT_TOKEN_COUNT, Math.floor(t * OUTPUT_TOKEN_COUNT));
}

export function visibleAnswerTokensAt(stageIndex: number, stageProgress: number): number {
  if (stageIndex < 6) return 0;
  if (stageIndex === 6) return generatedTokensAt(stageIndex, stageProgress);
  if (stageIndex === 7) {
    const t = clamp01((stageProgress - 0.08) / 0.78);
    return Math.floor(t * OUTPUT_TOKEN_COUNT);
  }
  return OUTPUT_TOKEN_COUNT;
}

export function metricsAt(stageIndex: number, stageProgress: number): MetricSnapshot {
  const generated = generatedTokensAt(stageIndex, stageProgress);
  const inputTokens = stageIndex >= 2 ? INPUT_TOKEN_COUNT : stageIndex >= 0 ? 0 : 0;

  let prefillProgress = 0;
  if (stageIndex === 5) prefillProgress = smooth((stageProgress - 0.12) / 0.72);
  else if (stageIndex > 5) prefillProgress = 1;
  const prefillMs = Math.round(prefillProgress * SIMULATED.prefillMs);

  const ttft = stageIndex > 5 || (stageIndex === 5 && stageProgress > 0.86) ? SIMULATED.ttftMs : null;

  let decodeSpeed = 0;
  if (stageIndex === 6) {
    decodeSpeed = generated > 0 ? SIMULATED.decodeTokPerSec * (0.72 + 0.28 * smooth(stageProgress)) : 0;
  } else if (stageIndex > 6) {
    decodeSpeed = SIMULATED.decodeTokPerSec;
  }

  const contextTokens = stageIndex >= 5 ? INPUT_TOKEN_COUNT + generated : 0;
  const kvUsedMiB = contextTokens * KV_MIB_PER_TOKEN;
  const totalMs =
    stageIndex < 4
      ? 0
      : stageIndex === 4
        ? Math.round(50 + smooth(stageProgress) * 36)
        : Math.round(
            SIMULATED.networkMs +
              SIMULATED.queueMs +
              (ttft ?? 0) +
              (generated > 0 ? generated * (1000 / SIMULATED.decodeTokPerSec) : 0),
          );

  let visibleChunks = 0;
  if (stageIndex === 7) visibleChunks = Math.floor(clamp01((stageProgress - 0.1) / 0.74) * 9);
  else if (stageIndex > 7) visibleChunks = 9;

  return {
    inputTokens,
    generatedTokens: generated,
    prefillMs,
    ttftMs: ttft,
    decodeSpeed,
    kvUsedMiB,
    kvCapacityMiB: DEMO_MODEL.kvCacheCapacityMiB,
    kvPercent: (kvUsedMiB / DEMO_MODEL.kvCacheCapacityMiB) * 100,
    totalMs,
    visibleChunks,
  };
}

export function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function answerTextThrough(count: number): string {
  return ANSWER_TOKENS.slice(0, Math.max(0, Math.min(ANSWER_TOKENS.length, count)))
    .map((token) => token.display)
    .join('');
}
