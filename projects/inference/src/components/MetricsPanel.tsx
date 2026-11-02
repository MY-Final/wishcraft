import { DEMO_MODEL, formatMs, metricsAt } from '../data/metrics';
import { journeyStore, useJourney } from '../lib/journey-store';
import { useClockPosition } from '../lib/use-clock';

function valueOrDash(value: string, active: boolean): string {
  return active ? value : '—';
}

export default function MetricsPanel() {
  const snapshot = useJourney();
  const readout = useClockPosition(12);
  const metrics = metricsAt(snapshot.stageIndex, readout.localProgress);
  const stage = snapshot.stageIndex;

  const generatedActive = stage >= 6;
  const prefillActive = stage >= 5;
  const decodeActive = stage >= 6 && metrics.decodeSpeed > 0;
  const kvActive = stage >= 5;

  return (
    <aside className={`metrics-panel ${snapshot.metricsOpen ? '' : 'is-collapsed'}`} aria-label="模拟性能指标">
      <button
        className="metrics-panel__head"
        type="button"
        onClick={() => journeyStore.toggleMetrics()}
        aria-expanded={snapshot.metricsOpen}
      >
        <span className="metrics-panel__label">
          <span className="metrics-panel__pulse" aria-hidden="true" />
          TELEMETRY
          <em>模拟指标</em>
        </span>
        <span className="metrics-panel__toggle mono" aria-hidden="true">
          {snapshot.metricsOpen ? '−' : '+'}
        </span>
      </button>

      <div className="metrics-panel__body">
        <dl className="metrics-grid">
          <div>
            <dt>输入 TOKEN</dt>
            <dd>{valueOrDash(String(metrics.inputTokens).padStart(2, '0'), stage >= 2)}</dd>
          </div>
          <div>
            <dt>已生成</dt>
            <dd className={generatedActive && metrics.generatedTokens > 0 ? 'is-live' : ''}>
              {valueOrDash(String(metrics.generatedTokens).padStart(2, '0'), generatedActive)}
            </dd>
          </div>
          <div>
            <dt>PREFILL</dt>
            <dd>{valueOrDash(formatMs(metrics.prefillMs || null), prefillActive)}</dd>
          </div>
          <div>
            <dt>TTFT</dt>
            <dd className={metrics.ttftMs !== null ? 'is-emphasis' : ''}>
              {valueOrDash(formatMs(metrics.ttftMs), metrics.ttftMs !== null)}
            </dd>
          </div>
          <div>
            <dt>DECODE</dt>
            <dd>{valueOrDash(`${metrics.decodeSpeed.toFixed(1)} tok/s`, decodeActive)}</dd>
          </div>
          <div>
            <dt>总耗时</dt>
            <dd>{valueOrDash(formatMs(metrics.totalMs || null), stage >= 4 && metrics.totalMs > 0)}</dd>
          </div>
        </dl>

        <div className={`kv-meter ${kvActive ? 'is-live' : ''}`}>
          <div className="kv-meter__head">
            <span>KV CACHE</span>
            <span className="mono">
              {kvActive ? `${metrics.kvUsedMiB.toFixed(1)} / ${DEMO_MODEL.kvCacheCapacityMiB} MiB` : '—'}
            </span>
          </div>
          <div className="kv-meter__track" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.min(1, metrics.kvPercent / 100)})` }} />
            <i style={{ left: '25%' }} />
            <i style={{ left: '50%' }} />
            <i style={{ left: '75%' }} />
          </div>
          <div className="kv-meter__foot mono">
            <span>{DEMO_MODEL.name}</span>
            <span>{DEMO_MODEL.layers}L · {DEMO_MODEL.dtype}</span>
          </div>
        </div>

        <p className="metrics-panel__note">
          SIMULATED VALUES <span>·</span> 时间轴已压缩
        </p>
      </div>
    </aside>
  );
}
