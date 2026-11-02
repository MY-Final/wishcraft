import { chapters } from '../../data';
import { useStageProgress } from '../../lib/use-stage-progress';
import ChatScene from './ChatScene';
import ModelTrack from './ModelTrack';
import { chatGptDate, trackNodes } from './ch04-data';
import { vars } from './vars';
import './Chapter04.css';

const meta = chapters[4];
const total = trackNodes.length;
/** 对话场景固定在 ChatGPT 发布年，让年份轨道不再随整章插值。 */
const chatYear = Number(chatGptDate.slice(0, 4)) || meta.endYear;

export default function Chapter04() {
  const trackRef = useStageProgress<HTMLDivElement>({ chapter: 4 });
  const chatRef = useStageProgress<HTMLDivElement>({ chapter: 4 });

  return (
    <>
      <section
        className="scene scene--ch04 scene--ch04-track"
        data-scene
        data-chapter="4"
        data-year-start={meta.startYear}
        data-year-end={meta.endYear}
        aria-label={`第四章：${meta.titleZh}`}
      >
        <div className="scene__stage ch04__stage" ref={trackRef} style={vars({ '--p': 0 })}>
          <div className="scene__content">
            <header className="ch04__header">
              <div className="ch04__header-main">
                <p className="ch04__kicker u-meta">
                  {meta.kicker}
                  <span className="ch04__kicker-sep" aria-hidden="true" />
                  {meta.rangeLabel}
                </p>
                <h2 className="ch04__title">{meta.title}</h2>
              </div>
              <div className="ch04__header-meta">
                <p className="u-mono">{String(total).padStart(2, '0')} RECORDS</p>
                <p className="u-cn">{meta.theme}</p>
              </div>
            </header>

            <ModelTrack />
          </div>
        </div>
      </section>

      <section
        className="scene scene--ch04 scene--ch04-chat"
        data-scene
        data-chapter="4"
        data-year-start={chatYear}
        data-year-end={chatYear}
        aria-label="第四章：语言开始生成 — 对话"
      >
        <div className="scene__stage ch04__chat-stage" ref={chatRef} style={vars({ '--p': 0 })}>
          <div className="scene__content">
            <ChatScene />
          </div>
        </div>
      </section>
    </>
  );
}
