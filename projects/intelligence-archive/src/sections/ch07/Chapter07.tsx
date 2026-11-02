import type { CSSProperties } from 'react';
import Provenance from '../../components/common/Provenance';
import { getModel } from '../../data';
import { useNarrative } from '../../lib/narrative-store';
import { useStageProgress } from '../../lib/use-stage-progress';
import AgentBoard from './AgentBoard';
import ArchiveWall from './ArchiveWall';
import { AGENT_STAGES, COPY, RELEASES, STAGE_ORDER, STATS } from './content';
import './Chapter07.css';

/** 宣言收尾引用的真实条目：2026-10-26 起「计算机使用」进入低价档。 */
const ANCHOR = getModel('gpt-6-1-terra');

const STAT_ROWS = [
  { label: 'RELEASES', value: STATS.total },
  { label: 'AGENT', value: STATS.agent },
  { label: 'OPEN WEIGHTS', value: STATS.open },
  { label: 'ORGANISATIONS', value: STATS.orgs },
];

function actFor(progress: number): number {
  if (progress < 0.303) return 0;
  if (progress < 0.607) return 1;
  if (progress < 0.775) return 2;
  return 3;
}

function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

export default function Chapter07() {
  const stageRef = useStageProgress<HTMLDivElement>({ chapter: 7 });
  // 只订阅「第几幕」这一粗粒度值：滚动中不触发重渲染，仅在幕切换时重渲染一次。
  const act = useNarrative((state) =>
    state.chapter === 7 ? actFor(state.chapterProgress) : state.chapter > 7 ? 3 : -1,
  );
  const reducedMotion = useNarrative((state) => state.reducedMotion);

  return (
    <section
      className="scene scene--ch07"
      data-scene
      data-chapter="7"
      data-year-start="2026"
      data-year-end="2026"
      aria-label="第七章：行动时代"
    >
      <div className="scene__stage ch07__stage" ref={stageRef} style={vars({ '--p': 0 })}>
        <h2 className="sr-only">CHAPTER 07 — THE AGE OF ACTION / 行动时代</h2>

        {/* ACT I — 进入 2026 */}
        <div className={`ch07__act ch07__act--1${act === 0 ? ' is-active' : ''}`}>
          <div className="ch07__hero">
            <div className="ch07__year" aria-hidden="true">
              {COPY.year}
            </div>

            <div className="ch07__title">
              <p className="ch07__title-kicker u-mono">{COPY.titleEn}</p>
              <p className="ch07__title-zh u-cn">{COPY.titleZh}</p>
              <p className="ch07__title-theme u-cn">{COPY.theme}</p>
            </div>

            <div className="ch07__manifesto">
              <p className="ch07__manifesto-line u-cn">
                {COPY.manifesto.map((line) => (
                  <span className="ch07__manifesto-row" key={line}>
                    {line}
                  </span>
                ))}
              </p>
              <p className="ch07__manifesto-body u-cn">{COPY.manifestoBody}</p>
              <dl className="ch07__stats">
                {STAT_ROWS.map((row) => (
                  <div key={row.label}>
                    <dt className="u-mono">{row.label}</dt>
                    <dd className="u-mono">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <ArchiveWall releases={RELEASES} active={act === 0 || reducedMotion} />
        </div>

        {/* ACT II — 从对话到行动 */}
        <div className={`ch07__act ch07__act--2${act === 1 ? ' is-active' : ''}`}>
          <div className="ch07__act-head">
            <p className="ch07__act-kicker u-mono">{COPY.actTwoKicker}</p>
            <h3 className="ch07__act-title u-cn">{COPY.actTwoTitle}</h3>
            <p className="ch07__act-sub u-cn">{COPY.actTwoSub}</p>
          </div>

          <figure className="ch07__prompt">
            <div className="ch07__prompt-box">
              <div className="ch07__prompt-head u-mono" aria-hidden="true">
                <span>MESSAGE</span>
                <span>07 / 2026</span>
              </div>
              <div className="ch07__prompt-body" aria-hidden="true">
                <span className="ch07__prompt-text">
                  <span className="ch07__prompt-typed u-cn">{COPY.prompt}</span>
                  <i className="ch07__caret" />
                </span>
              </div>
              <div className="ch07__prompt-foot u-mono" aria-hidden="true">
                <span>ATTACH</span>
                <span>SEND ↵</span>
              </div>
            </div>
            <figcaption className="sr-only">{COPY.prompt}</figcaption>
          </figure>

          <AgentBoard />

          <div className="ch07__status">
            <p className="ch07__status-label u-mono">TASK STATUS</p>
            <ul className="ch07__status-list">
              {AGENT_STAGES.map((item) => (
                <li key={item.id} style={vars({ '--at': item.at + 0.006 })}>
                  <span className="u-mono">{item.index}</span>
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ACT III — 七个模块收束为一块黑 */}
        <div className={`ch07__act ch07__act--3${act === 2 ? ' is-active' : ''}`}>
          <div className="ch07__monolith">
            <span className="ch07__monolith-index u-mono">07</span>
            <span className="ch07__monolith-year u-mono">{COPY.year}</span>
            <p className="ch07__monolith-list u-cn">{STAGE_ORDER}</p>
          </div>
        </div>

        {/* ACT IV — 文字高潮 */}
        <div className={`ch07__act ch07__act--4${act === 3 ? ' is-active' : ''}`}>
          <div className="ch07__climax">
            <p className="ch07__climax-meta u-mono">
              <span>{COPY.climaxMeta[0]}</span>
              <span>{COPY.climaxMeta[1]}</span>
              <span>{COPY.year}</span>
            </p>

            <div className="ch07__climax-body">
              <div className="ch07__climax-row" style={vars({ '--at': 0.805 })}>
                <p className="ch07__climax-en">
                  {COPY.climax.map((line, index) => (
                    <span className="ch07__climax-mask" key={line} style={vars({ '--d': index * 0.016 })}>
                      <span>{line}</span>
                    </span>
                  ))}
                </p>
                <p className="ch07__climax-cn u-cn">{COPY.climaxCn[0]}</p>
              </div>

              <div className="ch07__climax-row" style={vars({ '--at': 0.849 })}>
                <p className="ch07__climax-en">
                  {COPY.climaxTwo.map((line, index) => (
                    <span className="ch07__climax-mask" key={line} style={vars({ '--d': index * 0.016 })}>
                      <span>{line}</span>
                    </span>
                  ))}
                </p>
                <p className="ch07__climax-cn u-cn">{COPY.climaxCn[1]}</p>
              </div>
            </div>

            <div className="ch07__climax-source">
              <span className="u-mono">{COPY.sourceLabel}</span>
              {ANCHOR && (
                <Provenance
                  source={ANCHOR.sources[0]}
                  status={ANCHOR.verificationStatus}
                  date={ANCHOR.displayDate}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
