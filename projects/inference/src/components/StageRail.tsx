import { STAGES } from '../data/journey';
import { journeyStore, useJourney } from '../lib/journey-store';
import { useClockPosition } from '../lib/use-clock';

export default function StageRail() {
  const snapshot = useJourney();
  const readout = useClockPosition(20);

  return (
    <nav className="stage-rail" aria-label="章节导航">
      <div className="stage-rail__cap">
        <span className="mono">CHAPTERS</span>
        <span className="mono">{String(snapshot.stageIndex + 1).padStart(2, '0')} / 09</span>
      </div>

      <ol className="stage-rail__list">
        {STAGES.map((stage, index) => {
          const active = index === snapshot.stageIndex;
          const complete = index < snapshot.stageIndex || readout.globalProgress >= 1;
          return (
            <li key={stage.id} className={`stage-rail__item ${active ? 'is-active' : ''} ${complete ? 'is-past' : ''}`}>
              <button
                type="button"
                className="stage-rail__button"
                onClick={() => journeyStore.seekStage(index)}
                aria-current={active ? 'step' : undefined}
                aria-label={`第 ${String(index + 1).padStart(2, '0')} 章，${stage.nav}：${stage.title}`}
              >
                <span className="stage-rail__index mono">{String(index + 1).padStart(2, '0')}</span>
                <span className="stage-rail__nav">{stage.nav}</span>
                <span className="stage-rail__en mono" aria-hidden="true">
                  {stage.en}
                </span>
              </button>
              {active && (
                <span className="stage-rail__progress" aria-hidden="true">
                  <span style={{ transform: `scaleY(${readout.localProgress})` }} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
