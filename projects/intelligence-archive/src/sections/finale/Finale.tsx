import type { CSSProperties } from 'react';
import Provenance from '../../components/common/Provenance';
import { ARCHIVE_CUTOFF, chapters, events, getEvent, getModel, models } from '../../data';
import { useNarrative } from '../../lib/narrative-store';
import { scrollToTop } from '../../lib/scroll-director';
import { useStageProgress } from '../../lib/use-stage-progress';
import './Finale.css';

/** 两端年份都从数据读取：1950 起于第一章，2026 止于行动时代。 */
const START_YEAR = chapters[1].startYear;
const END_YEAR = chapters[7].endYear;

const QUESTION_EVENT = getEvent('turing-computing-machinery-1950');
const ACTION_MODEL = getModel('gpt-6-1-terra');

const CLOSED_LABEL = ARCHIVE_CUTOFF.replaceAll('-', '.');

function sample<T>(list: T[], count: number): T[] {
  if (list.length <= count) return [...list];
  const step = (list.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => list[Math.round(index * step)]);
}

/** 雾面只陈列真实年份与真实型号名，两者分列，不构成任何对应关系。 */
const FOG_YEARS = Array.from(
  new Set([
    ...events.map((event) => Number(event.date.slice(0, 4))),
    ...models.map((model) => Number(model.announcementDate.slice(0, 4))),
  ]),
)
  .filter((year) => year >= START_YEAR && year <= END_YEAR)
  .sort((a, b) => a - b);

const YEAR_INDEX = sample(FOG_YEARS, 24);
const NAME_INDEX = sample(
  models.map((model) => model.name),
  24,
);

const BEATS = [
  { at: 0.13, kicker: 'THE QUESTION', year: START_YEAR, text: '年，我们问机器能否思考。' },
  { at: 0.29, kicker: 'THE WORK', year: END_YEAR, text: '年，我们已经开始让机器完成复杂工作。' },
  { at: 0.44, kicker: 'WHAT NEXT', year: null, text: '下一步呢？' },
] as const;

function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

/** 段落索引：-1 未进入 / 0–2 三句 / 3 大问题 / 4 镜面。用于只让当前层接受指针。 */
function stageFor(progress: number): number {
  if (progress >= 0.70) return 4;
  if (progress >= 0.555) return 3;
  if (progress >= 0.44) return 2;
  if (progress >= 0.285) return 1;
  if (progress >= 0.13) return 0;
  return -1;
}

export default function Finale() {
  const stageRef = useStageProgress<HTMLDivElement>({ chapter: 8 });
  // 粗粒度订阅：只在段落切换时重渲染，滚动中不触发。
  const beatStage = useNarrative((state) =>
    state.chapter === 8 ? stageFor(state.chapterProgress) : state.chapter > 8 ? 4 : -1,
  );
  // 静态降级时整页平铺，入口从一开始就应当可聚焦；常规模式下只在最后一段解冻。
  const ending = useNarrative(
    (state) =>
      state.reducedMotion || (state.chapter === 8 && state.chapterProgress >= 0.82),
  );

  return (
    <section
      className="scene scene--finale"
      data-scene
      data-chapter="8"
      data-year-start="2026"
      data-year-end="2026"
      aria-label="终章：问题仍在"
    >
      <div className="scene__stage finale__stage" ref={stageRef} style={vars({ '--p': 0 })}>
        <h2 className="sr-only">EPILOGUE — THE QUESTION REMAINS / 问题仍在</h2>

        <div className="finale__fog" aria-hidden="true">
          <div className="finale__fog-years">
            {YEAR_INDEX.map((year) => (
              <span key={`y-${year}`} className="u-mono">
                {year}
              </span>
            ))}
          </div>
          <div className="finale__fog-names">
            {NAME_INDEX.map((name) => (
              <span key={`n-${name}`}>{name}</span>
            ))}
          </div>
        </div>

        <div className="finale__beats">
          {BEATS.map((beat, index) => (
            <div
              key={beat.kicker}
              className={`finale__beat${beatStage === index ? ' is-active' : ''}`}
              style={vars({ '--at': beat.at })}
            >
              <p className="finale__beat-kicker u-mono">{beat.kicker}</p>
              <p className="finale__beat-text u-cn">
                {beat.year !== null && (
                  <span className="finale__beat-year u-mono">{beat.year}</span>
                )}
                {beat.year !== null ? ` ${beat.text}` : beat.text}
              </p>
              {beat.kicker === 'THE QUESTION' && QUESTION_EVENT && (
                <Provenance
                  source={QUESTION_EVENT.sources[0]}
                  status={QUESTION_EVENT.verificationStatus}
                  date={QUESTION_EVENT.displayDate}
                />
              )}
              {beat.kicker === 'THE WORK' && ACTION_MODEL && (
                <Provenance
                  source={ACTION_MODEL.sources[0]}
                  status={ACTION_MODEL.verificationStatus}
                  date={ACTION_MODEL.displayDate}
                />
              )}
            </div>
          ))}
        </div>

        <div className={`finale__question${beatStage === 3 ? ' is-active' : ''}`}>
          <p className="finale__question-kicker u-mono">THE QUESTION REMAINS</p>
          <p className="finale__question-en">WHAT MAKES US HUMAN?</p>
          <p className="finale__question-cn u-cn">
            当智能不再只属于人类，我们如何重新理解自己？
          </p>
        </div>

        <div className={`finale__end${beatStage === 4 ? ' is-active' : ''}`}>
          <span className="finale__axis" aria-hidden="true" />
          <div className="finale__mirror" aria-hidden="true" />

          <div className="finale__signature">
            <p className="finale__signature-line u-mono">THE INTELLIGENCE ARCHIVE</p>
            <p className="finale__signature-range u-mono">
              {START_YEAR} — {END_YEAR}
            </p>
            <p className="finale__signature-continued u-mono">CONTINUED.</p>
          </div>

          <div className="finale__links" inert={!ending}>
            <button type="button" className="btn" onClick={scrollToTop}>
              <span>重新探索</span>
              <span className="btn__arrow" aria-hidden="true">
                ↑
              </span>
            </button>
            <a className="btn" href="#/archive">
              <span>进入完整模型档案</span>
              <span className="btn__arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </div>

          <div className="finale__colophon u-mono">
            <span>WHITE MIRROR EDITION</span>
            <span>RECORD CLOSED {CLOSED_LABEL}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
