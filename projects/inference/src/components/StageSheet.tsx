import { STAGES } from '../data/journey';
import { journeyStore, useJourney } from '../lib/journey-store';
import ModalDialog from './ModalDialog';

interface StageSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function StageSheet({ open, onClose }: StageSheetProps) {
  const snapshot = useJourney();

  return (
    <ModalDialog open={open} onClose={onClose} labelledBy="stage-sheet-title" variant="sheet">
      <div className="stage-sheet">
        <p className="mono stage-sheet__kicker">STAGE NAVIGATOR / 09</p>
        <h2 id="stage-sheet-title">跳到任一章节</h2>
        <ol className="stage-sheet__list">
          {STAGES.map((stage, index) => (
            <li key={stage.id}>
              <button
                type="button"
                className={index === snapshot.stageIndex ? 'is-active' : ''}
                onClick={() => {
                  journeyStore.seekStage(index);
                  onClose();
                }}
                aria-current={index === snapshot.stageIndex ? 'step' : undefined}
              >
                <span className="mono">{String(index + 1).padStart(2, '0')}</span>
                <span>{stage.nav}</span>
                <em>{stage.en}</em>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </ModalDialog>
  );
}
