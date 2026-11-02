import { CREDITS, DATA_NOTES, FIELD_QUESTIONS, SOURCES } from '../data/field-notes';
import { journeyStore, useJourney } from '../lib/journey-store';
import { ArrowUpRightIcon } from './icons';
import ModalDialog from './ModalDialog';

interface FieldNotesDialogProps {
  open: boolean;
}

export default function FieldNotesDialog({ open }: FieldNotesDialogProps) {
  const snapshot = useJourney();

  const scrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: snapshot.reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <ModalDialog
      open={open}
      onClose={() => journeyStore.closeOverlay()}
      labelledBy="field-notes-title"
      variant="notes"
    >
      <article className="field-notes">
        <header className="field-notes__header">
          <div className="field-notes__kicker mono">
            <span className="field-notes__signal" aria-hidden="true" />
            FIELD NOTES / APPENDIX
          </div>
          <h2 id="field-notes-title">
            十问 <em>THE INFERENCE</em>
          </h2>
          <p>
            这不是另一份术语表。它是这部作品的技术底稿：十个问题、数据来源、哪些数字是真实的，以及哪些只是帮助理解的结构。
          </p>
          <div className="field-notes__stamp">
            <span className="mono">TOKENIZER</span>
            <strong>REAL</strong>
            <span className="mono">METRICS</span>
            <strong>SIMULATED</strong>
            <span className="mono">ARCHITECTURE</span>
            <strong>TEACHING MODEL</strong>
          </div>
        </header>

        <div className="field-notes__layout">
          <nav className="field-notes__nav" aria-label="技术档案目录">
            <span className="mono">INDEX</span>
            {FIELD_QUESTIONS.map((question) => (
              <button key={question.id} type="button" onClick={() => scrollTo(question.id)}>
                <span className="mono">{question.number}</span>
                <span>{question.question.replace(/？$/, '')}</span>
              </button>
            ))}
            <span className="field-notes__nav-extra mono">DATA NOTES</span>
            <button type="button" onClick={() => scrollTo('field-notes-data')}>
              <span className="mono">11</span>
              <span>数据与方法</span>
            </button>
            <button type="button" onClick={() => scrollTo('field-notes-sources')}>
              <span className="mono">12</span>
              <span>来源</span>
            </button>
          </nav>

          <div className="field-notes__content">
            <section className="field-notes__questions" aria-label="十个问题">
              {FIELD_QUESTIONS.map((question) => (
                <article className="qa" id={question.id} key={question.id}>
                  <div className="qa__number mono">{question.number}</div>
                  <div className="qa__body">
                    <h3>{question.question}</h3>
                    <p>{question.answer}</p>
                    <div className="qa__keywords">
                      {question.keywords.map((keyword) => (
                        <span className="mono" key={keyword}>
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="field-notes__data" id="field-notes-data" aria-labelledby="data-notes-title">
              <p className="mono field-notes__section-label">DATA &amp; METHOD</p>
              <h3 id="data-notes-title">数据与方法</h3>
              <div className="data-notes">
                {DATA_NOTES.map((note) => (
                  <article key={note.title}>
                    <h4>{note.title}</h4>
                    <p>{note.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="field-notes__sources" id="field-notes-sources" aria-labelledby="sources-title">
              <p className="mono field-notes__section-label">REFERENCES</p>
              <h3 id="sources-title">来源与延伸阅读</h3>
              <ol>
                {SOURCES.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      <span>{source.label}</span>
                      <ArrowUpRightIcon width="13" height="13" />
                    </a>
                  </li>
                ))}
              </ol>
            </section>

            <footer className="field-notes__credit">
              <div>
                <span className="mono">{CREDITS.title}</span>
                <p>{CREDITS.subtitle}</p>
              </div>
              <div>
                <span className="mono">STACK</span>
                <p>{CREDITS.stack}</p>
                <p>{CREDITS.note}</p>
              </div>
              <button type="button" onClick={() => journeyStore.closeOverlay()}>
                回到推理现场
                <ArrowUpRightIcon width="13" height="13" />
              </button>
            </footer>
          </div>
        </div>
      </article>
    </ModalDialog>
  );
}
