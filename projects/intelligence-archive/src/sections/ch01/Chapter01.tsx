import { chapters, eventsForChapter } from '../../data';
import type { HistoryEvent } from '../../data';
import { splitDisplayDate } from '../../lib/format';
import { useStageProgress } from '../../lib/use-stage-progress';
import CharacterField from './CharacterField';
import WallLabel, { categoryOf, type Beat, type CssVars } from './WallLabel';
import './Chapter01.css';

const chapter = chapters[1];
const chapterEvents = eventsForChapter(1);
const eventMap = new Map(chapterEvents.map((event) => [event.id, event]));

/**
 * 六个节拍。id 全部来自 events.json；mechanism 只是把该条摘要里的机制改写成一行
 * 等宽提示，用于底部控制台，不引入任何新事实。
 */
const BEAT_SPECS: Array<{ id: string; secondary: string[]; mechanism: string }> = [
  {
    id: 'turing-computing-machinery-1950',
    secondary: [],
    mechanism: 'IMITATION GAME · TEXT ONLY · HUMAN OR MACHINE',
  },
  {
    id: 'dartmouth-1956',
    secondary: ['logic-theorist-1956'],
    mechanism: '10 RESEARCHERS · 2 MONTHS · ONE NAME',
  },
  {
    id: 'perceptron-1958',
    secondary: [],
    mechanism: 'THRESHOLD UNIT · ERROR-CORRECTING WEIGHTS',
  },
  {
    id: 'samuel-checkers-1959',
    secondary: ['dendral-1965'],
    mechanism: 'SELF-PLAY → WIN / LOSS → WEIGHTS',
  },
  {
    id: 'eliza-1966',
    secondary: [],
    mechanism: 'KEYWORD → DECOMPOSE → REASSEMBLE',
  },
  {
    id: 'lighthill-1973',
    secondary: ['perceptrons-book-1969'],
    mechanism: 'PROMISE → AUDIT → CUT',
  },
];

const beats: Beat[] = BEAT_SPECS.flatMap((spec) => {
  const primary = eventMap.get(spec.id);
  if (!primary) return [];
  const secondary = spec.secondary
    .map((id) => eventMap.get(id))
    .filter((event): event is HistoryEvent => Boolean(event));
  return [
    {
      primary,
      secondary,
      mechanism: spec.mechanism,
      year: splitDisplayDate(primary.displayDate).year,
    },
  ];
});

const TOTAL = beats.length;
const TOTAL_LABEL = String(TOTAL).padStart(2, '0');
const titleLines = chapter.title.split(' OF ');
const recordLabel = String(chapterEvents.length).padStart(2, '0');

export default function Chapter01() {
  const stageRef = useStageProgress<HTMLDivElement>({ chapter: chapter.index });

  return (
    <section
      className="scene scene--ch01"
      data-scene
      data-chapter={chapter.index}
      data-year-start={chapter.startYear}
      data-year-end={chapter.endYear}
      aria-label={`第${chapter.index}章：${chapter.titleZh}`}
    >
      <div className="scene__stage ch01__stage" ref={stageRef} style={{ '--p': 0 } as CssVars}>
        <div className="ch01__grid" aria-hidden="true" />
        <CharacterField />

        <div className="ch01__stamp" aria-hidden="true">
          <p className="ch01__stamp-kicker u-mono">{chapter.kicker}</p>
          <p className="ch01__stamp-zh u-cn">{chapter.titleZh}</p>
          <span className="ch01__stamp-rule" />
        </div>

        <div className="ch01__spine" aria-hidden="true">
          {beats.map((beat, index) => (
            <div className="ch01__year-block" key={beat.primary.id} style={{ '--i': index } as CssVars}>
              <span className="ch01__year">{beat.year}</span>
              <p className="ch01__year-meta">
                <span>{beat.primary.displayDate}</span>
                <span className="ch01__year-dash" />
                <span>{categoryOf(beat.primary.category).zh}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="ch01__plates">
          {beats.map((beat, index) => (
            <WallLabel key={beat.primary.id} beat={beat} index={index} total={TOTAL} />
          ))}
        </div>

        <div className="ch01__opener">
          <p className="ch01__opener-kicker u-meta">
            {chapter.kicker} · {chapter.titleZh}
          </p>
          <h2 className="ch01__opener-title">
            <span>{titleLines[0]}</span>
            {titleLines.length > 1 && <span>OF {titleLines.slice(1).join(' OF ')}</span>}
          </h2>
          <div className="ch01__opener-foot">
            <span className="ch01__opener-zh u-cn">{chapter.titleZh}</span>
            <span className="ch01__opener-dash" aria-hidden="true" />
            <span className="ch01__opener-theme u-cn">{chapter.theme}</span>
          </div>
          <p className="ch01__typed u-mono" aria-hidden="true">
            <span className="ch01__typed-mark">›</span>
            <span className="ch01__typed-text">CAN MACHINES THINK?</span>
          </p>
        </div>

        <div className="ch01__rail">
          <p className="ch01__rail-side u-mono">
            <span className="ch01__rail-counter" aria-hidden="true">
              {beats.map((beat, index) => (
                <span
                  className="ch01__rail-count"
                  key={beat.primary.id}
                  style={{ '--i': index } as CssVars}
                >
                  <span className="ch01__rail-count-label">RECORD</span>
                  {String(index + 1).padStart(2, '0')} / {TOTAL_LABEL}
                </span>
              ))}
            </span>
          </p>

          <div className="ch01__console" aria-hidden="true">
            {beats.map((beat, index) => (
              <span
                className="ch01__console-line u-mono"
                key={beat.primary.id}
                style={{ '--i': index } as CssVars}
              >
                <span className="ch01__console-mark">›</span>
                {beat.mechanism}
              </span>
            ))}
          </div>

          <p className="ch01__rail-side ch01__rail-side--end u-mono">
            <span className="ch01__rail-records">{recordLabel} RECORDS</span>
            <span className="ch01__rail-rule" aria-hidden="true" />
            <span>{chapter.rangeLabel}</span>
            <span className="ch01__rail-track" aria-hidden="true">
              <span className="ch01__rail-fill" />
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
