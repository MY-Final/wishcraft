import type { CSSProperties } from 'react';
import { getModel, type Model } from '../../data';

/** 2025 年的发布刻度：每一条都是 data/models.json 里的真实条目。 */
const TICK_IDS = [
  'deepseek-r1',
  'openai-o3-mini',
  'glm-4-5',
  'openai-o3',
  'qwen3-235b-a22b',
  'claude-opus-4',
  'kimi-k2',
  'gpt-oss-120b',
  'deepseek-v3-1',
  'qwen3-next',
  'minimax-m2',
  'kimi-k2-thinking',
  'gemini-3-pro',
  'deepseek-v3-2',
];

const YEAR_START = Date.UTC(2025, 0, 1);
const YEAR_END = Date.UTC(2026, 0, 1);
const MIN_GAP = 5.4;

function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

function ratioOf(model: Model): number {
  const parsed = Date.parse(model.announcementDate);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(1, Math.max(0, (parsed - YEAR_START) / (YEAR_END - YEAR_START)));
}

const TICKS = TICK_IDS.map((id) => getModel(id))
  .filter((model): model is Model => Boolean(model))
  .sort((a, b) => a.announcementDate.localeCompare(b.announcementDate))
  .reduce<Array<{ model: Model; y: number; reveal: number }>>((list, model) => {
    const raw = 4 + ratioOf(model) * 90;
    const previous = list.at(-1)?.y ?? 0;
    const y = Math.max(raw, previous + MIN_GAP);
    list.push({ model, y, reveal: 0.03 + (y / 100) * 0.9 });
    return list;
  }, []);

export default function ModelTicks() {
  return (
    <div className="ch06__ticks">
      <p className="ch06__ticks-head u-meta">
        2025
        <span>RELEASE SCALE</span>
      </p>
      <div className="ch06__ticks-axis">
        <span className="ch06__ticks-line" aria-hidden="true" />
        <span className="ch06__ticks-fill" aria-hidden="true" />
        {TICKS.map(({ model, y, reveal }) => (
          <p
            key={model.id}
            className="ch06__tick"
            style={vars({ '--y': `${y}%`, '--t': reveal })}
          >
            <span className="ch06__tick-date u-mono">{model.displayDate}</span>
            <span className="ch06__tick-name">{model.name}</span>
          </p>
        ))}
      </div>
      <p className="ch06__ticks-foot u-mono">2025.01 — 2025.12 · 按发布日期</p>
    </div>
  );
}
