import { chapters } from '../../data';
import { useStageProgress } from '../../lib/use-stage-progress';
import Ledger from './Ledger';
import TransformerAct from './TransformerAct';
import { vars } from './vars';
import './Chapter03.css';

const meta = chapters[3];

export default function Chapter03() {
  const stageRef = useStageProgress<HTMLDivElement>({ chapter: 3 });

  return (
    <section
      className="scene scene--void scene--ch03"
      data-scene
      data-chapter="3"
      data-year-start={meta.startYear}
      data-year-end={meta.endYear}
      aria-label={`第三章：${meta.titleZh}`}
    >
      <div
        className="scene__stage ch03__stage"
        ref={stageRef}
        style={vars({ '--p': 0 })}
      >
        <div className="ch03__grid" aria-hidden="true" />
        <div className="ch03__rmark ch03__rmark--tr u-mono" aria-hidden="true">
          CH.03 / DEEP LEARNING
        </div>

        <div className="scene__content ch03__content">
          <div className="ch03__scrim" aria-hidden="true" />
          <header className="ch03__opener">
            <p className="ch03__kicker u-meta">
              {meta.kicker}
              <span className="ch03__kicker-sep" aria-hidden="true" />
              {meta.rangeLabel}
            </p>
            <h2 className="ch03__title">{meta.title}</h2>
            <div className="ch03__opener-foot">
              <p className="ch03__title-zh u-cn">{meta.titleZh}</p>
              <p className="ch03__theme u-cn">{meta.theme}</p>
            </div>
            <div className="ch03__opener-year" aria-hidden="true">
              <span className="ch03__opener-year-end u-mono">— {meta.endYear}</span>
              <span className="ch03__opener-year-start u-year">{meta.startYear}</span>
            </div>
          </header>

          <Ledger />
          <TransformerAct />
        </div>
      </div>
    </section>
  );
}
