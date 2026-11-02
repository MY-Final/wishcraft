import { STAGES } from '../data/journey';
import { formatMs, metricsAt } from '../data/metrics';
import { journeyStore, useJourney } from '../lib/journey-store';
import { ArrowUpRightIcon, ReplayIcon } from './icons';

export default function FinaleOverlay() {
  const snapshot = useJourney();
  const visible =
    snapshot.phase === 'ended' &&
    !snapshot.finaleDismissed &&
    !snapshot.notesOpen &&
    snapshot.deepDiveStage === null &&
    snapshot.infoId === null &&
    snapshot.tokenInspect === null;

  if (!visible) return null;

  const stage = STAGES[8];
  const metrics = metricsAt(8, 1);

  return (
    <section className="finale" aria-labelledby="finale-title">
      <div className="finale__glow" aria-hidden="true" />
      <div className="finale__content">
        <p className="eyebrow finale__eyebrow">
          <span className="eyebrow__tick" aria-hidden="true" />
          END OF JOURNEY · {stage.en}
        </p>
        <h2 className="finale__title" id="finale-title">
          你看到的是一段回答，
          <br />
          <em>
            <span className="finale__title-lead">它经历的</span>
            <span className="finale__title-rest">却是一场复杂的计算旅程。</span>
          </em>
        </h2>
        <p className="finale__lede">
          从 10 个字符的输入，到 55 个内容 Token 的自回归生成，再到逐段抵达屏幕的流式文本——
          中间没有任何一个瞬间是“魔法”。
        </p>

        <div className="finale__stats">
          <div>
            <span className="mono">INPUT TOKENS</span>
            <strong>{String(metrics.inputTokens).padStart(2, '0')}</strong>
            <small>Qwen2.5 实测</small>
          </div>
          <div>
            <span className="mono">OUTPUT TOKENS</span>
            <strong>{metrics.generatedTokens}</strong>
            <small>固定演示序列</small>
          </div>
          <div>
            <span className="mono">REQUEST TIME</span>
            <strong>{formatMs(metrics.totalMs)}</strong>
            <small>模拟值</small>
          </div>
          <div>
            <span className="mono">TTFT</span>
            <strong>{formatMs(metrics.ttftMs)}</strong>
            <small>模拟值</small>
          </div>
        </div>

        <div className="finale__actions">
          <button className="finale__primary" type="button" onClick={() => journeyStore.restart()}>
            <ReplayIcon width="15" height="15" />
            重新播放
          </button>
          <button className="finale__secondary" type="button" onClick={() => journeyStore.dismissFinale()}>
            自由观察全景
          </button>
          <button className="finale__link" type="button" onClick={() => journeyStore.openNotes()}>
            技术档案
            <ArrowUpRightIcon width="13" height="13" />
          </button>
        </div>

        <p className="finale__credits mono">
          THE INFERENCE / 推理现场 · WISHCRAFT 2026 · ALL NUMBERS SIMULATED UNLESS MARKED REAL
        </p>
      </div>
    </section>
  );
}
