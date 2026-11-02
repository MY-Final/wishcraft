import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Provenance from '../../components/common/Provenance';
import { getModel } from '../../data';
import { useStageProgress } from '../../lib/use-stage-progress';
import ConstellationStage from '../../three/ConstellationStage';
import FieldChart from './FieldChart';
import ModelDossier from './ModelDossier';
import Chapter05Pages from './Chapter05Pages';
import StageBoundary from './StageBoundary';
import { DEFAULT_MODEL_ID, FIELD_MODELS, FIELD_STATS, PEAK_DAY } from './field-data';
import './Chapter05.css';

function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

/** 正文里的模型引用：名称与日期一律来自数据对象，不在 JSX 里手写。 */
function Fact({ id }: { id: string }) {
  const model = getModel(id);
  if (!model) return null;
  return (
    <span className="ch05__fact">
      <span className="ch05__fact-name">{model.name}</span>
      <span className="ch05__fact-date u-mono">{model.displayDate}</span>
    </span>
  );
}

interface Beat {
  key: string;
  in: number;
  out: number;
  label: string;
  head: ReactNode;
  body: ReactNode;
  source?: string;
}

/**
 * 窄屏（< 900px）不挂 3D：星图在 390px 宽的容器里会被裁切、标签互相遮挡，
 * 改用同一份数据推导的二维 SVG，交互（点选 → 档案）完全一致。
 */
function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => setNarrow(query.matches);
    query.addEventListener('change', update);
    update();
    return () => query.removeEventListener('change', update);
  }, []);
  return narrow;
}

const BEATS: Beat[] = [
  {
    key: 'field',
    in: 0.11,
    out: 0.29,
    label: '01 · THE FIELD',
    head: (
      <>
        NO SINGLE
        <br />
        CURRENT STATE.
      </>
    ),
    body: (
      <>
        <p>
          这张图不是时间轴。条目最多的几家机构各占一条轨道，其余并入最外一圈；时间是沿圆周走的——走完一圈是两年。连线是档案里记录的前代关系。
        </p>
        <p>点选任意节点，档案会替换；拖动可以旋转，按住 Alt 滚动滚轮可以缩放。</p>
      </>
    ),
  },
  {
    key: 'hemispheres',
    in: 0.3,
    out: 0.47,
    label: '02 · TWO CURVES',
    head: (
      <>
        TWO CURVES,
        <br />
        ONE CALENDAR.
      </>
    ),
    body: (
      <>
        <p>
          本章 {FIELD_STATS.orgs} 家机构里，{FIELD_STATS.cnOrgs} 家在中国（{FIELD_STATS.cn}{' '}
          个模型），{FIELD_STATS.otherOrgs} 家在其他地区（{FIELD_STATS.other} 个）。
        </p>
        <p>
          2023 年，中国机构的条目是 {FIELD_STATS.cn2023} 条，其他地区 {FIELD_STATS.other2023}{' '}
          条；2024 年反过来，{FIELD_STATS.cn2024} 对 {FIELD_STATS.other2024}。同一张图上，两条曲线在两年里交错了一次。
        </p>
      </>
    ),
  },
  {
    key: 'context',
    in: 0.48,
    out: 0.65,
    label: '03 · CONTEXT',
    head: (
      <>
        LENGTH BECOMES
        <br />
        A SPEC.
      </>
    ),
    body: (
      <>
        <p>
          <Fact id="claude-2" /> 把可读入材料推到十万 token 量级，<Fact id="claude-2-1" />{' '}
          随后翻倍到二十万；<Fact id="gpt-4-turbo" /> 扩到十二万八千，同时把输入价格压到原 GPT-4 的三分之一左右。
        </p>
        <p>
          同一条轴在中国被推到另一个位置：<Fact id="kimi-chat" /> 以二十万汉字输入作为主卖点，
          <Fact id="glm-4" /> 支持 128K，<Fact id="qwen2-5-turbo" /> 把商用 API 的上下文扩到一百万 token。
        </p>
      </>
    ),
    source: 'qwen2-5-turbo',
  },
  {
    key: 'weights',
    in: 0.66,
    out: 0.83,
    label: '04 · WEIGHTS',
    head: (
      <>
        A MODEL CAN BE
        <br />
        A FILE.
      </>
    ),
    body: (
      <>
        <p>
          <Fact id="llama-2" /> 允许免费商用；<Fact id="mixtral-8x7b" />{' '}
          把稀疏专家做成可直接下载的权重；<Fact id="llama-3-1" /> 把开放权重的规模上限抬到四千亿参数级。
        </p>
        <p>
          中国机构把同一条路走得更彻底：<Fact id="chatglm-6b" /> 量化后可在单张消费级显卡运行，
          <Fact id="deepseek-v2" /> 用 MLA 压缩 KV Cache，<Fact id="deepseek-v3" /> 在 671B
          稀疏模型上跑通 FP8 训练并开源权重。本章 {FIELD_STATS.open} 个开放权重条目里，
          {FIELD_STATS.openFromCn} 个来自中国机构。
        </p>
      </>
    ),
    source: 'deepseek-v3',
  },
];

export default function Chapter05() {
  const stageRef = useStageProgress<HTMLDivElement>({ chapter: 5 });
  const [selectedId, setSelectedId] = useState(DEFAULT_MODEL_ID);
  const narrow = useNarrowViewport();
  const selected = getModel(selectedId) ?? FIELD_MODELS[0] ?? null;
  const chart = <FieldChart selectedId={selectedId} onSelect={setSelectedId} />;

  return (
    <>
      <section
        className="scene ch05"
        data-scene
        data-chapter="5"
        data-year-start="2023"
        data-year-end="2024"
        aria-label="第五章：全球模型竞赛"
      >
        <div className="scene__stage ch05__stage" ref={stageRef} style={vars({ '--p': 0 })}>
          <div className="ch05__stage3d">
            {narrow ? (
              chart
            ) : (
              <StageBoundary fallback={chart}>
                <ConstellationStage onSelectModel={setSelectedId} />
              </StageBoundary>
            )}
          </div>

          <div className="ch05__column">
            <div className="ch05__beats">
              {BEATS.map((beat) => {
                const source = beat.source ? getModel(beat.source) : undefined;
                return (
                  <article
                    key={beat.key}
                    className="ch05__beat"
                    style={vars({ '--in': beat.in, '--out': beat.out })}
                  >
                    <p className="ch05__beat-label u-meta">{beat.label}</p>
                    <h3 className="ch05__beat-head">{beat.head}</h3>
                    <div className="ch05__beat-body">{beat.body}</div>
                    {source && (
                      <Provenance
                        source={source.sources[0]}
                        status={source.verificationStatus}
                        date={source.displayDate}
                      />
                    )}
                  </article>
                );
              })}

              <div className="ch05__explore" aria-hidden="true">
                <p className="u-meta">EXPLORE</p>
                <p className="ch05__explore-cn u-cn">
                  点选任一节点，档案在下方替换。
                  <br />
                  继续向下，进入两条路线的对照。
                </p>
              </div>
            </div>

            {selected ? (
              <ModelDossier model={selected} onSelect={setSelectedId} />
            ) : (
              <p className="u-caption">数据暂缺：本区间没有可展示的模型记录。</p>
            )}

            <ol className="ch05__list" aria-label="2023—2024 模型索引">
              {FIELD_MODELS.map((model) => (
                <li key={model.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(model.id)}
                    aria-pressed={model.id === selectedId}
                  >
                    <span className="ch05__list-name">{model.name}</span>
                    <span className="ch05__list-date u-mono">{model.displayDate}</span>
                    <span
                      className={`ch05__list-dot${model.openWeights === true ? ' is-open' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="ch05__opening">
            <div className="ch05__opening-inner">
              <p className="u-meta">CHAPTER 05 · 2023 — 2024</p>
              <h2 className="ch05__opening-title">
                THE GLOBAL
                <br />
                MODEL RACE
              </h2>
              <div className="ch05__opening-zh">
                <span className="ch05__opening-zh-main u-cn">全球模型竞赛</span>
                <span className="ch05__opening-rule" aria-hidden="true" />
                <span className="ch05__opening-sub u-cn">单一线性历史结束，进入图谱。</span>
              </div>

              <dl className="ch05__opening-stats">
                <div>
                  <dt className="u-meta">MODELS</dt>
                  <dd className="u-mono">{FIELD_STATS.models}</dd>
                </div>
                <div>
                  <dt className="u-meta">INSTITUTIONS</dt>
                  <dd className="u-mono">{FIELD_STATS.orgs}</dd>
                </div>
                <div>
                  <dt className="u-meta">OPEN WEIGHTS</dt>
                  <dd className="u-mono">{FIELD_STATS.open}</dd>
                </div>
                <div>
                  <dt className="u-meta">LINEAGE EDGES</dt>
                  <dd className="u-mono">{FIELD_STATS.edges}</dd>
                </div>
              </dl>

              <p className="ch05__opening-decl u-cn">
                {PEAK_DAY.displayDate} 这一天，档案里出现了 {PEAK_DAY.models.length} 个发布，来自{' '}
                {PEAK_DAY.orgs} 家机构：{PEAK_DAY.models.map((model) => model.name).join('、')}
                。此前的叙事是一条线——一个模型、一个更深的版本，按参数量排成序列；这一天之后，线散成了面。这一章不再用一个序列解释历史，而是用一张图：
                {FIELD_STATS.orgs} 家机构，{FIELD_STATS.models} 个模型，{FIELD_STATS.edges}{' '}
                条可核实的前代连线。
              </p>
            </div>
            <p className="ch05__opening-num" aria-hidden="true">
              05
            </p>
            <p className="ch05__opening-cue u-meta">SCROLL TO ENTER THE FIELD</p>
          </div>
        </div>
      </section>

      <Chapter05Pages />
    </>
  );
}
