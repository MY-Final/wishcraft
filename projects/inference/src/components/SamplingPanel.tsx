import { useMemo, useState } from 'react';
import { generatedTokensAt } from '../data/metrics';
import {
  candidatesFor,
  distributionStats,
  sampleCandidate,
  softmaxWithTemperature,
} from '../data/sampling';
import { ANSWER_TOKENS } from '../data/tokenization';
import { journeyStore, useJourney } from '../lib/journey-store';
import { useClockPosition } from '../lib/use-clock';

export default function SamplingPanel() {
  const snapshot = useJourney();
  const readout = useClockPosition(18);
  const [seed, setSeed] = useState(0);

  const generated = generatedTokensAt(readout.index, readout.localProgress);
  const answerIndex = Math.max(0, Math.min(ANSWER_TOKENS.length - 1, generated - 1));
  const actual = ANSWER_TOKENS[answerIndex];

  const candidates = useMemo(() => candidatesFor(answerIndex), [answerIndex]);
  const scored = useMemo(
    () => softmaxWithTemperature(candidates, snapshot.temperature).sort((a, b) => b.probability - a.probability),
    [candidates, snapshot.temperature],
  );
  const sampled = useMemo(() => sampleCandidate(scored, seed + answerIndex), [scored, seed, answerIndex]);
  const { entropy } = distributionStats(scored);
  const actualCandidate = scored.find((candidate) => candidate.id === actual.id) ?? scored[0];

  return (
    <aside className="sampling-panel" aria-label="下一个 Token 的模拟采样">
      <header className="sampling-panel__head">
        <div>
          <span className="mono">NEXT TOKEN</span>
          <h3>概率分布</h3>
        </div>
        <div className="sampling-panel__step mono">
          STEP {String(Math.min(generated + 1, ANSWER_TOKENS.length)).padStart(2, '0')} / 55
        </div>
      </header>

      <div className="sampling-panel__chosen">
        <span className="sampling-panel__chosen-label mono">DEMO OUTPUT</span>
        <strong>{actual.display}</strong>
        <code>#{actual.id}</code>
      </div>

      <ol className="probability-list" aria-label="候选 Token 概率">
        {scored.map((candidate) => (
          <li
            key={`${candidate.id}-${candidate.text}`}
            className={candidate.id === actual.id ? 'is-chosen' : ''}
          >
            <span className="probability-list__token">{candidate.text === ' ' ? '␠' : candidate.text}</span>
            <span className="probability-list__bar" aria-hidden="true">
              <i style={{ width: `${Math.max(3, candidate.probability * 100)}%` }} />
            </span>
            <span className="probability-list__value mono">{(candidate.probability * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ol>

      <label className="temperature-control" htmlFor="temperature-range">
        <span className="temperature-control__head">
          <span className="mono">TEMPERATURE</span>
          <span className="temperature-control__value">{snapshot.temperature.toFixed(2)}</span>
        </span>
        <input
          id="temperature-range"
          type="range"
          min={0.1}
          max={1.5}
          step={0.05}
          value={snapshot.temperature}
          onChange={(event) => journeyStore.setTemperature(Number(event.currentTarget.value))}
        />
        <span className="temperature-control__scale mono" aria-hidden="true">
          <span>0.1 · 尖锐</span>
          <span>1.5 · 平坦</span>
        </span>
      </label>

      <div className="sampler-readout">
        <div>
          <span className="mono">如果现在采样</span>
          <strong>{sampled.text === ' ' ? '␠' : sampled.text}</strong>
          <code>{(sampled.probability * 100).toFixed(1)}%</code>
        </div>
        <button type="button" onClick={() => setSeed((value) => value + 1)}>
          重新采样
        </button>
      </div>

      <div className="sampling-panel__foot mono">
        <span>ENTROPY {entropy.toFixed(2)} BIT</span>
        <span>{actualCandidate ? `CHOSEN ${(actualCandidate.probability * 100).toFixed(1)}%` : ''}</span>
      </div>

      <p className="sampling-panel__note">
        主回答为固定演示序列；温度实验使用同一组<em>模拟 logits</em>，只改变概率与采样结果。
      </p>
    </aside>
  );
}
