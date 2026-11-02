import { STAGES } from '../data/journey';
import { getNodeInfo } from '../data/nodes';
import { journeyStore } from '../lib/journey-store';
import { ArrowUpRightIcon, InfoIcon } from './icons';
import ModalDialog from './ModalDialog';

interface InfoDialogProps {
  infoId: string | null;
}

export default function InfoDialog({ infoId }: InfoDialogProps) {
  const node = infoId ? getNodeInfo(infoId) : undefined;
  const open = Boolean(node);
  if (!node) return null;

  const stage = STAGES[node.stage] ?? STAGES[0];

  return (
    <ModalDialog
      open={open}
      onClose={() => journeyStore.closeOverlay()}
      labelledBy="node-drawer-title"
      variant="drawer"
    >
      <div className="drawer">
        <p className="drawer__eyebrow mono">
          <InfoIcon width="12" height="12" />
          NODE / CH {String(stage.index + 1).padStart(2, '0')} · {stage.en}
        </p>
        <h2 className="drawer__title" id="node-drawer-title">
          {node.name}
        </h2>
        <p className="drawer__en">{node.en}</p>
        <p className="drawer__role">{node.role}</p>

        <div className="drawer__rule" aria-hidden="true" />

        <div className="drawer__body">
          {node.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {node.formula ? (
          <div className="drawer__formula">
            <span className="mono">SIGNAL</span>
            <code>{node.formula}</code>
          </div>
        ) : null}

        <dl className="drawer__meta">
          {node.tag ? (
            <div>
              <dt>TYPE</dt>
              <dd>{node.tag}</dd>
            </div>
          ) : null}
          {node.stat ? (
            <div>
              <dt>VALUE</dt>
              <dd>{node.stat}</dd>
            </div>
          ) : null}
          <div>
            <dt>SOURCE</dt>
            <dd>{node.stage === 2 ? '真实 Qwen2.5 tokenizer' : '教学模拟 / 概念结构'}</dd>
          </div>
        </dl>

        <div className="drawer__actions">
          <button
            className="drawer__primary"
            type="button"
            onClick={() => journeyStore.openNotes()}
          >
            打开技术档案
            <ArrowUpRightIcon width="14" height="14" />
          </button>
          <button className="drawer__secondary" type="button" onClick={() => journeyStore.closeOverlay()}>
            返回现场
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
