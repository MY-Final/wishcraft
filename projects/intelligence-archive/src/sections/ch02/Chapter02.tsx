import { useState } from 'react';
import type { HistoryEvent } from '../../data';
import { chapters, eventsForChapter } from '../../data';
import { useStageProgress } from '../../lib/use-stage-progress';
import NetworkStage from '../../three/NetworkStage';
import DetailPanel from './DetailPanel';
import RegistryEntry from './RegistryEntry';
import './Chapter02.css';

type CssVars = Record<string, string | number>;

const chapter = chapters[2];
const nextChapter = chapters[3];
const chapterEvents = eventsForChapter(2);
const eventMap = new Map(chapterEvents.map((event) => [event.id, event]));

const PRIMARY = new Set([
  'xcon-1980',
  'backprop-1986',
  'ai-winter-1987',
  'deep-blue-1997',
  'hinton-dbn-2006',
  'ibm-watson-jeopardy-2011',
]);

interface ActNote {
  after: string;
  tag: string;
  text: string;
}

interface ActSpec {
  kicker: string;
  title: string;
  titleZh: string;
  note: string;
  ids: string[];
  notes: ActNote[];
}

/** 三幕结构；条目 id 全部来自 events.json，幕的年份区间由条目数据推导。 */
const ACTS: ActSpec[] = [
  {
    kicker: 'ACT I',
    title: 'RULES',
    titleZh: '规则',
    note: '把领域知识逐条写进程序。规则覆盖到的部分，机器比人更稳定；规则没有覆盖的部分，机器一无所知。',
    ids: ['xcon-1980', 'hopfield-1982', 'backprop-1986', 'ai-winter-1987', 'lecun-convnet-1989'],
    notes: [
      {
        after: 'xcon-1980',
        tag: '规则为何失灵 · WHY RULES FAILED',
        text: '规则必须由人逐条写出，也必须由人持续维护。系统越大，需要提前想到的例外越多；知识获取与维护的成本，最终压过了它省下的成本。',
      },
      {
        after: 'backprop-1986',
        tag: '梯度改变了什么 · WHAT GRADIENT CHANGED',
        text: '人不再描述每一步该怎么做，只给出输入、目标与误差。中间表示由训练过程自己找出来——网络开始从数据里长出特征。',
      },
    ],
  },
  {
    kicker: 'ACT II',
    title: 'SEARCH',
    titleZh: '搜索',
    note: '在规则明确的封闭问题里，搜索与专用结构可以胜过人类。棋盘之外，这套方法几乎没有可迁移的部分。',
    ids: ['deep-blue-1997', 'lstm-1997', 'lenet5-1998'],
    notes: [
      {
        after: 'deep-blue-1997',
        tag: '专用系统的边界 · THE LIMIT OF SPECIALISTS',
        text: '深蓝的评估函数由人调校，搜索空间由人定义。它赢下的是一项被完整描述过的任务，而不是学会了这件事。',
      },
    ],
  },
  {
    kicker: 'ACT III',
    title: 'LEARNING',
    titleZh: '学习',
    note: '先让网络自己学表示，再把数据与算力做大。深网络重新可训练之后，规模才开始变成方法。',
    ids: ['hinton-dbn-2006', 'imagenet-2009', 'ibm-watson-jeopardy-2011'],
    notes: [
      {
        after: 'hinton-dbn-2006',
        tag: '可训练之后 · AFTER TRAINABILITY',
        text: '当深网络重新可以被训练，瓶颈就从算法转到数据与算力：语料更大、机器更快的一侧，才有条件把网络做得更深。',
      },
    ],
  },
];

function yearOf(event: HistoryEvent): string {
  return event.displayDate.split('.')[0] ?? event.displayDate;
}

function actRange(act: ActSpec): string {
  const resolved = act.ids
    .map((id) => eventMap.get(id))
    .filter((event): event is HistoryEvent => Boolean(event));
  if (resolved.length === 0) return '';
  const first = resolved[0];
  const last = resolved[resolved.length - 1];
  return first === last ? yearOf(first) : `${yearOf(first)} — ${yearOf(last)}`;
}

export default function Chapter02() {
  const stageRef = useStageProgress<HTMLDivElement>({ chapter: chapter.index });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? eventMap.get(selectedId) ?? null : null;

  const handleSelect = (id: string): void => {
    setSelectedId((current) => (current === id ? current : id));
  };

  return (
    <section
      className="scene scene--ch02"
      data-scene
      data-chapter={chapter.index}
      data-year-start={chapter.startYear}
      data-year-end={chapter.endYear}
      aria-label={`第${chapter.index}章：${chapter.titleZh}`}
    >
      <div className="scene__stage ch02__stage" ref={stageRef} style={{ '--p': 0 } as CssVars}>
        <div className="ch02__net">
          <p className="ch02__net-caption u-mono">
            <span>EVENT NETWORK</span>
            <span className="ch02__net-rule" aria-hidden="true" />
            <span>{chapter.rangeLabel}</span>
          </p>
          <div className="ch02__net-canvas">
            <NetworkStage onSelectEvent={handleSelect} />
          </div>
        </div>

        <div className="ch02__col">
          <div className="ch02__track">
            <header className="ch02__intro">
              <p className="ch02__intro-kicker u-meta">
                {chapter.kicker} · {chapter.rangeLabel}
              </p>
              <h2 className="ch02__intro-title">{chapter.title}</h2>
              <div className="ch02__intro-sub">
                <span className="ch02__intro-zh u-cn">{chapter.titleZh}</span>
                <span className="ch02__intro-theme u-cn">{chapter.theme}</span>
              </div>
              <p className="ch02__intro-meta u-mono">
                <span>{String(chapterEvents.length).padStart(2, '0')} RECORDS</span>
                <span>{ACTS.length} ACTS</span>
                <span>CLICK A NODE ↗</span>
              </p>
            </header>

            {ACTS.map((act) => (
              <section className="ch02__act-group" key={act.kicker} aria-label={`${act.kicker} ${act.title}`}>
                <header className="ch02__act">
                  <div className="ch02__act-head">
                    <span className="ch02__act-index u-mono">{act.kicker}</span>
                    <h3 className="ch02__act-title">{act.title}</h3>
                    <span className="ch02__act-zh u-cn">{act.titleZh}</span>
                    <span className="ch02__act-range u-mono">{actRange(act)}</span>
                  </div>
                  <p className="ch02__act-note u-cn">{act.note}</p>
                </header>

                {act.ids.map((id) => {
                  const event = eventMap.get(id);
                  if (!event) return null;
                  const notes = act.notes.filter((note) => note.after === id);
                  return (
                    <div className="ch02__group-item" key={id}>
                      <RegistryEntry
                        event={event}
                        primary={PRIMARY.has(id)}
                        selected={selectedId === id}
                        onSelect={handleSelect}
                      />
                      {notes.map((note) => (
                        <aside className="ch02__note" key={note.tag}>
                          <p className="ch02__note-tag u-meta">{note.tag}</p>
                          <p className="ch02__note-text u-cn">{note.text}</p>
                        </aside>
                      ))}
                    </div>
                  );
                })}
              </section>
            ))}

            <footer className="ch02__outro">
              <p className="ch02__outro-text u-cn">
                到这一章结束时，机器已经能赢下问答比赛，也能读出支票上的数字。它仍然需要人来告诉它：该看什么。
              </p>
              <p className="ch02__outro-next u-mono">
                NEXT · {nextChapter.title}
                <span className="ch02__outro-dash" aria-hidden="true" />
                {nextChapter.rangeLabel}
              </p>
            </footer>
          </div>
        </div>

        <DetailPanel event={selected} onClose={() => setSelectedId(null)} />
      </div>
    </section>
  );
}
