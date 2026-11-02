import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Provenance from '../../components/common/Provenance';
import { getModel } from '../../data';
import { useStageProgress } from '../../lib/use-stage-progress';
import ModelTicks from './ModelTicks';
import ReasoningTree from './ReasoningTree';
import './Chapter06.css';

function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

interface Beat {
  key: string;
  label: string;
  head: ReactNode;
  body: ReactNode;
  source: string;
}

const BEATS: Beat[] = [
  {
    key: 'base',
    label: '01 · THE BASE',
    head: (
      <>
        STILL A
        <br />
        LANGUAGE MODEL.
      </>
    ),
    body: (
      <>
        <p>
          推理模型不是新的物种。它与上一代共享同一个基座：解码器结构、下一个 token
          的预测目标、同一套分词器。变化发生在两处——后训练用奖励信号重塑输出分布，推理时允许模型在给出结论之前生成更多中间 token。
        </p>
        <p>所以「会推理」不等于「有了一个内部世界」。它是一段被训练出来的、更长的输出。</p>
      </>
    ),
    source: 'deepseek-r1',
  },
  {
    key: 'test-time',
    label: '02 · TEST-TIME COMPUTE',
    head: (
      <>
        THINKING TIME
        <br />
        IS A DIAL.
      </>
    ),
    body: (
      <>
        <p>
          如果能力可以来自更长的中间步骤，「想多久」就变成了可调参数：o3-mini 在 API
          里给出低、中、高三档推理强度；o3-pro 与 o3 共用权重，只把思考时间拉长；Qwen3
          让同一份权重同时支持思考与非思考模式。
        </p>
        <p>代价是可计量的：更长的输出意味着更多 token 与更高延迟。价目表本质上是每单位思考时间的价格。</p>
      </>
    ),
    source: 'openai-o3-mini',
  },
  {
    key: 'rlvr',
    label: '03 · VERIFIABLE REWARDS',
    head: (
      <>
        REWARDS THAT
        <br />
        CAN BE CHECKED.
      </>
    ),
    body: (
      <>
        <p>
          数学答案能判对错，代码能跑测试，于是奖励不必由人类逐条标注——这就是可验证奖励强化学习。它让强化学习第一次可以规模化：采样大量解答，用自动判分筛出可用路径，再把信号回灌给模型。
        </p>
        <p>
          小米 MiMo-7B-RL 在 7B 规模上验证了这条路径；DeepSeek-R1 用它做出接近 o1
          的表现并以 MIT 许可公开权重；MiniMax-M1 用混合线性注意力压低长思考的算力成本。
        </p>
      </>
    ),
    source: 'mimo-7b-rl',
  },
  {
    key: 'pruning',
    label: '04 · PRUNING',
    head: (
      <>
        MOST PATHS
        <br />
        ARE DISCARDED.
      </>
    ),
    body: (
      <>
        <p>
          左边那棵树不是比喻：采样出的多条路径里，大部分会在比较中被丢弃，只有少数留下来继续展开。剪枝不免费——它消耗 token，也消耗时间。
        </p>
        <p>
          还有一件事不该被夸大：思维链是被训练出来的输出，不是内部状态的可靠记录。o1-preview
          不公开原文，gpt-oss 提供可读的推理链；两种做法都不等于读心。
        </p>
      </>
    ),
    source: 'gpt-oss-120b',
  },
  {
    key: 'tools',
    label: '05 · TOOLS IN THE LOOP',
    head: (
      <>
        REASONING
        <br />
        CALLS TOOLS.
      </>
    ),
    body: (
      <>
        <p>
          o3 会在思考过程中调用搜索、Python 与图像分析，把中间结论写回推理链；DeepSeek-V3.2
          把思考直接嵌进工具调用，两种模式都能调用工具；Kimi K2 用 1 万亿参数的 MoE 支撑 agentic 调用。
        </p>
        <p>推理不再只发生在文本里，而发生在「想一步、取一次数据、再想一步」的循环里。</p>
      </>
    ),
    source: 'deepseek-v3-2',
  },
];

/** 量出窄栏内容的可滚动距离，写成 --travel；随宽度变化重算，不随滚动重算。 */
function useDrift(ref: { current: HTMLDivElement | null }) {
  useEffect(() => {
    const track = ref.current;
    const viewport = track?.parentElement;
    if (!track || !viewport) return;
    const update = () => {
      const travel = Math.max(track.scrollHeight - viewport.clientHeight, 0);
      track.style.setProperty('--travel', `${-travel}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(track);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [ref]);
}

export default function Chapter06() {
  const stageRef = useStageProgress<HTMLDivElement>({ chapter: 6 });
  const trackRef = useRef<HTMLDivElement>(null);
  useDrift(trackRef);

  return (
    <section
      className="scene ch06"
      data-scene
      data-chapter="6"
      data-year-start="2025"
      data-year-end="2025"
      aria-label="第六章：推理时代"
    >
      <div className="scene__stage ch06__stage" ref={stageRef} style={vars({ '--p': 0 })}>
        <p className="ch06__rail u-mono" aria-hidden="true">
          CHAPTER 06 · 2025 · TEST-TIME COMPUTE
        </p>

        <ModelTicks />

        <div className="ch06__center">
          <div className="ch06__question">
            <p className="ch06__question-meta u-meta">COMPLEX QUESTION · 示例</p>
            <p className="ch06__question-text u-cn">
              把这段跨三个仓库的迁移做完，
              <br />
              并解释你为什么这样排序。
            </p>
          </div>
          <ReasoningTree />
        </div>

        <div className="ch06__essay">
          <div className="ch06__essay-track" ref={trackRef}>
            {BEATS.map((beat) => {
              const source = getModel(beat.source);
              return (
                <article key={beat.key} className="ch06__beat">
                  <p className="ch06__beat-label u-meta">{beat.label}</p>
                  <h3 className="ch06__beat-head">{beat.head}</h3>
                  <div className="ch06__beat-body">{beat.body}</div>
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
          </div>
        </div>

        <div className="ch06__quote">
          <p className="u-meta">CHAPTER 06 · 2025</p>
          <h2 className="ch06__quote-head">
            THE AGE OF
            <br />
            REASONING
          </h2>
          <p className="ch06__quote-cn u-cn">
            同一个模型，
            <br />
            可以想得更久。
          </p>
          <p className="ch06__quote-cue u-meta">SCROLL TO THINK</p>
        </div>

        <div className="ch06__closing">
          <p className="ch06__closing-mark">FROM ANSWERS TO REASONING</p>
          <p className="ch06__closing-cn u-cn">
            2025
            年，旗舰模型的主要变化不在参数规模，而在推理时被允许消耗多少计算。这让「更聪明」第一次可以不靠更大的权重，而靠更长的中间步骤——代价是延迟、成本，以及一个更难回答的问题：一段推理看起来合理，并不等于它可靠。
          </p>
          <p className="ch06__closing-end u-meta">CHAPTER 06 · END · 2025</p>
        </div>
      </div>
    </section>
  );
}
