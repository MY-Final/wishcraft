import { journeyStore, useJourney } from '../lib/journey-store';
import { MenuIcon } from './icons';

interface TopBarProps {
  onOpenStages: () => void;
}

export default function TopBar({ onOpenStages }: TopBarProps) {
  const snapshot = useJourney();
  const journey = snapshot.phase !== 'landing';

  return (
    <header className={`topbar ${journey ? 'topbar--journey' : 'topbar--landing'}`}>
      <div className="topbar__left">
        <a className="topbar__index mono" href="../../" aria-label="返回 WISHCRAFT 作品集">
          <span aria-hidden="true">←</span>
          <span className="topbar__index-label">INDEX</span>
        </a>
        <a className="brand" href="./" aria-label="THE INFERENCE 推理现场 — 返回作品首页">
          <span className="brand__glyph" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="brand__name">THE INFERENCE</span>
          <span className="brand__cn">推理现场</span>
        </a>
      </div>

      <div className="topbar__meta" aria-hidden="true">
        <span>ANATOMY OF ONE REQUEST</span>
        <span className="topbar__rule" />
        <span>2026</span>
      </div>

      <div className="topbar__actions">
        {journey ? (
          <>
            <span className="sim-badge" title="页面中的性能指标与概率均为教学模拟">
              <i aria-hidden="true" />
              <span>SIMULATED</span>
              <em>模拟数据</em>
            </span>
            <button className="chrome-button" type="button" onClick={() => journeyStore.openNotes()}>
              技术档案
              <span className="chrome-button__hint" aria-hidden="true">
                10Q
              </span>
            </button>
            <button
              className="chrome-button chrome-button--menu"
              type="button"
              onClick={onOpenStages}
              aria-label="打开阶段导航"
            >
              <MenuIcon width="15" height="15" />
              <span>章节</span>
            </button>
          </>
        ) : (
          <span className="topbar__edition mono">THREE.JS FIELD STUDY · NO. 02</span>
        )}
      </div>
    </header>
  );
}
