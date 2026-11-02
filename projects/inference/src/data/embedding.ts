import { QUESTION_TOKENS } from './tokenization';

/**
 * A deterministic, explicitly conceptual projection of each token into three
 * dimensions, plus a small "inspectable" slice of numbers. These are NOT real
 * Qwen embedding weights: the real vectors are thousands of dimensions and
 * would require the model checkpoint. They exist only to make the idea visible
 * and to keep the 3D scene and the HTML inspector in sync.
 */
export interface ConceptVector {
  tokenIndex: number;
  tokenId: number;
  text: string;
  position: [number, number, number];
  slice: number[];
}

function pseudoRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

const POSITIONS: Array<[number, number, number]> = [
  [1.7, -1.05, 0.38],
  [3.45, 0.7, -0.62],
  [5.1, -0.35, 0.74],
  [6.82, 1.12, -0.3],
  [8.36, -0.78, 0.52],
  [10.1, 0.42, -0.7],
];

export const CONCEPT_VECTORS: readonly ConceptVector[] = QUESTION_TOKENS.map((token, index) => {
  const random = pseudoRandom(token.id * 13 + index * 7);
  return {
    tokenIndex: index,
    tokenId: token.id,
    text: token.display,
    position: POSITIONS[index] ?? [index * 1.7, 0, 0],
    slice: Array.from({ length: 12 }, () => Number((random() * 2 - 1).toFixed(3))),
  };
});

export const EMBEDDING_DIMENSIONS = 4096;
export const CONCEPT_NOTE = '12 个数值为概念切片；真实 Qwen2.5-7B 的隐藏维度为 4096。';
