import type { ReactNode } from 'react';
import { STAGES } from '../data/journey';
import { journeyStore, useJourney } from '../lib/journey-store';
import { useClockPosition } from '../lib/use-clock';
import { ArrowUpRightIcon } from './icons';

function ToggleGroup({
  label,
  value,
  options,
  onChange,
  note,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; sublabel?: string }>;
  onChange: (value: string) => void;
  note?: ReactNode;
}) {
  return (
    <div className="context-toggle">
      <div className="context-toggle__head">
        <span className="mono">{label}</span>
        {note ? <span className="context-toggle__note">{note}</span> : null}
      </div>
      <div className="segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`segmented__option ${value === option.value ? 'is-active' : ''}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            {option.sublabel ? <em>{option.sublabel}</em> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChapterPanel() {
  const snapshot = useJourney();
  const readout = useClockPosition(16);
  const stage = STAGES[snapshot.stageIndex] ?? STAGES[0];
  const stageCode = String(stage.index + 1).padStart(2, '0');

  const contextual = (() => {
    if (stage.index === 0) {
      return (
        <ToggleGroup
          label="ENTRY / 入口视角"
          value={snapshot.clientMode}
          note="同一动作 · 两种观察方式"
          options={[
            { value: 'web', label: 'Web 对话', sublabel: '界面' },
            { value: 'api', label: 'API 调用', sublabel: 'JSON' },
          ]}
          onChange={(value) => journeyStore.setClientMode(value as 'web' | 'api')}
        />
      );
    }
    if (stage.index >= 4 && stage.index <= 6) {
      return (
        <ToggleGroup
          label="ARCHITECTURE / 模型架构"
          value={snapshot.architecture}
          note={snapshot.architecture === 'moe' ? '概念化 MoE · 并非所有模型' : '标准 Dense Transformer'}
          options={[
            { value: 'dense', label: 'Dense', sublabel: '全参数' },
            { value: 'moe', label: 'MoE', sublabel: 'Top-K' },
          ]}
          onChange={(value) => journeyStore.setArchitecture(value as 'dense' | 'moe')}
        />
      );
    }
    if (stage.index === 2) {
      return (
        <div className="source-stamp">
          <span className="source-stamp__dot" aria-hidden="true" />
          <span>
            <em>Qwen2.5 tokenizer</em> · 实测 6 个内容 Token
          </span>
          <button
            className="source-stamp__link"
            type="button"
            onClick={() => journeyStore.openDeepDive(2)}
          >
            核对数据
          </button>
        </div>
      );
    }
    if (stage.index === 1) {
      return (
        <div className="source-stamp source-stamp--quiet">
          <span className="source-stamp__dot" aria-hidden="true" />
          <span>网关、认证与调度是常见职责拆分，不同厂商实现不同。</span>
        </div>
      );
    }
    return null;
  })();

  return (
    <article className="chapter-panel" aria-live="polite">
      <div className="chapter-panel__meta">
        <span className="chapter-panel__index">{stageCode}</span>
        <span className="chapter-panel__rule" aria-hidden="true" />
        <span className="chapter-panel__en mono">{stage.en}</span>
        <span className="chapter-panel__count mono">{stageCode} / 09</span>
      </div>

      <h2 className="chapter-panel__title">{stage.title}</h2>
      <p className="chapter-panel__subtitle mono">{stage.subtitle}</p>
      <p className="chapter-panel__summary">{stage.summary}</p>

      <div className="chapter-panel__lower">
        <p className="chapter-panel__hint">
          <span className="chapter-panel__hint-mark" aria-hidden="true">
            +
          </span>
          {stage.hint}
        </p>

        <button
          className="deep-link"
          type="button"
          onClick={() => journeyStore.openDeepDive(stage.index)}
        >
          <span>深入了解</span>
          <span className="deep-link__en mono">DEEP DIVE</span>
          <ArrowUpRightIcon width="13" height="13" />
        </button>
      </div>

      {contextual ? <div className="chapter-panel__context">{contextual}</div> : null}

      <div className="chapter-panel__progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${readout.localProgress})` }} />
      </div>
    </article>
  );
}
