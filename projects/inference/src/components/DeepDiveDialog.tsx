import { getDeepDive } from '../data/deep-dives';
import { STAGES } from '../data/journey';
import { journeyStore } from '../lib/journey-store';
import { ArrowUpRightIcon } from './icons';
import ModalDialog from './ModalDialog';

interface DeepDiveDialogProps {
  stage: number | null;
}

export default function DeepDiveDialog({ stage }: DeepDiveDialogProps) {
  if (stage === null) return null;
  const deepDive = getDeepDive(stage);
  const stageInfo = STAGES[stage] ?? STAGES[0];

  return (
    <ModalDialog
      open
      onClose={() => journeyStore.closeOverlay()}
      labelledBy="deep-dive-title"
      variant="paper"
    >
      <article className="deep-dive">
        <header className="deep-dive__header">
          <div className="deep-dive__chapter">
            <span className="deep-dive__number">{String(stage + 1).padStart(2, '0')}</span>
            <div>
              <p className="mono">{deepDive.eyebrow}</p>
              <p className="deep-dive__chapter-title">{stageInfo.title}</p>
            </div>
          </div>
          <h2 className="deep-dive__title" id="deep-dive-title">
            {deepDive.title}
          </h2>
          <p className="deep-dive__lede">{deepDive.lede}</p>
        </header>

        <div className="deep-dive__sections">
          {deepDive.sections.map((section, index) => (
            <section className="deep-dive__section" key={index}>
              <div className="deep-dive__section-index mono">{String(index + 1).padStart(2, '0')}</div>
              <div className="deep-dive__section-content">
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
                {section.formula ? (
                  <div className="formula">
                    <span className="mono">FORMULA</span>
                    <code>{section.formula}</code>
                  </div>
                ) : null}
                {section.code ? (
                  <div className="code-block">
                    {section.codeLabel ? <span className="code-block__label mono">{section.codeLabel}</span> : null}
                    <pre>
                      <code>{section.code}</code>
                    </pre>
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        {deepDive.caution ? (
          <aside className="deep-dive__caution">
            <span className="mono">注意 / CAVEAT</span>
            <p>{deepDive.caution}</p>
          </aside>
        ) : null}

        {deepDive.sources?.length ? (
          <footer className="deep-dive__sources">
            <span className="mono">SOURCES</span>
            {deepDive.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                {source.label}
                <ArrowUpRightIcon width="12" height="12" />
              </a>
            ))}
          </footer>
        ) : null}

        <footer className="deep-dive__foot">
          <span className="mono">THE INFERENCE · 推理现场</span>
          <button type="button" onClick={() => journeyStore.openNotes()}>
            查看完整技术档案
          </button>
        </footer>
      </article>
    </ModalDialog>
  );
}
