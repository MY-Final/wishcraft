import { ANSWER_TOKENS, QUESTION_TOKENS } from './tokenization';

export interface CandidateToken {
  id: number;
  text: string;
  logit: number;
}

export interface ScoredCandidate extends CandidateToken {
  probability: number;
}

/**
 * All candidates below are real Qwen2.5 tokens (taken from the verified
 * question / answer payload), but the logits attached to them are simulated.
 */
const DISTRACTORS: CandidateToken[] = [
  { id: QUESTION_TOKENS[0].id, text: QUESTION_TOKENS[0].display, logit: 2.1 },
  { id: QUESTION_TOKENS[1].id, text: QUESTION_TOKENS[1].display, logit: 2.6 },
  { id: 101281, text: '太阳', logit: 2.9 },
  { id: 99519, text: '因为', logit: 2.5 },
  { id: 99999, text: '所以', logit: 2.2 },
  { id: 100819, text: '空气', logit: 1.8 },
  { id: 99804, text: '波', logit: 2.0 },
  { id: 45861, text: '长', logit: 1.7 },
  { id: 99225, text: '光', logit: 2.8 },
  { id: 20412, text: '是', logit: 1.6 },
  { id: 9370, text: '的', logit: 1.4 },
  { id: 3837, text: '，', logit: 2.3 },
  { id: 1773, text: '。', logit: 1.9 },
  { id: 104544, text: '看起来', logit: 1.5 },
];

function hash(index: number): number {
  let value = (index + 1) * 2654435761;
  value ^= value >>> 13;
  value *= 1274126177;
  return (value >>> 0) / 0xffffffff;
}

/** Build a plausible five-candidate distribution for the current answer step. */
export function candidatesFor(answerIndex: number): CandidateToken[] {
  const actual = ANSWER_TOKENS[Math.max(0, Math.min(ANSWER_TOKENS.length - 1, answerIndex))];
  const seed = hash(answerIndex);
  const chosenLogit = 4.6 + seed * 2.1;
  const candidates: CandidateToken[] = [
    { id: actual.id, text: actual.display, logit: chosenLogit },
  ];

  const used = new Set<number>([actual.id]);
  let cursor = Math.floor(seed * DISTRACTORS.length);
  for (let step = 0; step < 4; step += 1) {
    let candidate = DISTRACTORS[cursor % DISTRACTORS.length];
    let attempts = 0;
    while (used.has(candidate.id) && attempts < DISTRACTORS.length) {
      cursor += 1;
      candidate = DISTRACTORS[cursor % DISTRACTORS.length];
      attempts += 1;
    }
    if (!used.has(candidate.id)) {
      used.add(candidate.id);
      candidates.push({
        ...candidate,
        logit: candidate.logit + hash(answerIndex * 7 + step) * 0.9,
      });
    }
    cursor += 3;
  }

  return candidates.sort((a, b) => b.logit - a.logit);
}

export function softmaxWithTemperature(candidates: readonly CandidateToken[], temperature: number): ScoredCandidate[] {
  const safeTemperature = Math.max(0.05, temperature);
  const maxLogit = Math.max(...candidates.map((candidate) => candidate.logit));
  const exps = candidates.map((candidate) => Math.exp((candidate.logit - maxLogit) / safeTemperature));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return candidates.map((candidate, index) => ({
    ...candidate,
    probability: exps[index] / total,
  }));
}

/** Deterministic sampler: the same temperature + seed gives the same result. */
export function sampleCandidate(
  candidates: readonly ScoredCandidate[],
  seed: number,
): ScoredCandidate {
  const value = hash(seed * 13 + 5);
  let cursor = 0;
  let chosen = candidates[0];
  for (const candidate of candidates) {
    cursor += candidate.probability;
    if (value <= cursor) {
      chosen = candidate;
      break;
    }
  }
  return chosen;
}

export function distributionStats(candidates: readonly ScoredCandidate[]): {
  top: ScoredCandidate;
  entropy: number;
} {
  const top = candidates.reduce((best, candidate) => (candidate.probability > best.probability ? candidate : best));
  const entropy = -candidates.reduce(
    (sum, candidate) => sum + (candidate.probability > 0 ? candidate.probability * Math.log2(candidate.probability) : 0),
    0,
  );
  return { top, entropy };
}
