import { useEffect } from 'react';
import type { HistoryEvent } from '../../data';
import Provenance from '../../components/common/Provenance';

interface DetailPanelProps {
  event: HistoryEvent | null;
  onClose: () => void;
}

/**
 * 点击网络节点或编年史条目标题后出现的详情面板。
 * Esc 关闭；关闭按钮可达；面板本身不是模态，不劫持滚动。
 */
export default function DetailPanel({ event, onClose }: DetailPanelProps) {
  useEffect(() => {
    if (!event) return;
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [event, onClose]);

  return (
    <aside
      id="ch02-detail"
      className={`ch02__detail${event ? ' is-open' : ''}`}
      aria-live="polite"
      aria-label="事件详情"
      aria-hidden={!event}
    >
      {event && (
        <>
          <div className="ch02__detail-head u-mono">
            <span className="ch02__detail-index">RECORD · {event.displayDate}</span>
            <span className="ch02__detail-hint" aria-hidden="true">
              ESC
            </span>
            <button
              type="button"
              className="ch02__detail-close"
              onClick={onClose}
              aria-label="关闭事件详情"
            >
              ×
            </button>
          </div>

          <h4 className="ch02__detail-title u-cn">{event.title}</h4>
          {event.titleEn && <p className="ch02__detail-en u-mono">{event.titleEn}</p>}

          <p className="ch02__detail-text u-cn">{event.summary}</p>

          <div className="ch02__detail-why">
            <p className="ch02__detail-why-tag u-meta">为什么重要 · WHY IT MATTERS</p>
            <p className="ch02__detail-why-text u-cn">{event.significance}</p>
          </div>

          <Provenance
            source={event.sources[0]}
            status={event.verificationStatus}
            date={event.displayDate}
          />
        </>
      )}
    </aside>
  );
}
