import { events, models, organizations } from '../data';
import { ARCHIVE_CUTOFF } from '../data/chapters';
import { useReveal } from '../lib/use-reveal';
import './AboutView.css';

const principles = [
  {
    label: 'DATE TYPES',
    title: '日期不是装饰',
    body: '论文发表、官方公布、产品上线、API 开放、开源权重发布是五件不同的事。主时间轴采用首次官方公开发布日期，并标注日期类型；只查到月份就不补日期。',
  },
  {
    label: 'VERIFICATION',
    title: '可核实，才可陈列',
    body: '每条模型记录至少一个一手来源：官方公告、官方文档、论文或权重页。无法确认的型号不进入档案，只在研究报告中保留线索。',
  },
  {
    label: 'SOURCES',
    title: '来源可追溯',
    body: '档案中的每个模型与事件都附带来源链接与核实状态。二手来源会明确标注为「部分核实」，不做模糊处理。',
  },
  {
    label: 'UNKNOWNS',
    title: '允许空白',
    body: '参数量、上下文长度、基准分数只在官方确认时填写。历史研究中的争议与日期差异写入数据说明，而不是被抹平。',
  },
];

export default function AboutView() {
  const revealRef = useReveal<HTMLDivElement>();
  const years = models.length ? models[0].announcementDate.slice(0, 4) : '—';
  const lastModel = models.length ? models[models.length - 1] : null;

  return (
    <main className="about-view">
      <header className="about-hero u-container">
        <p className="u-meta">ABOUT · WHITE MIRROR EDITION</p>
        <h1 className="about-hero__title">
          THE INTELLIGENCE
          <br />
          ARCHIVE
        </h1>
        <div className="about-hero__meta">
          <p className="about-hero__zh u-cn">智能编年史</p>
          <p className="about-hero__range u-mono">1950 — {ARCHIVE_CUTOFF}</p>
        </div>
        <p className="about-hero__lede u-cn">
          从图灵的第一个问题，到能够自主执行任务的人工智能。这是一份关于机器智能如何被想象、被
          证明、被训练、被使用，最终被要求「去做事」的交互式档案。
        </p>
        <dl className="about-stats">
          <div>
            <dt className="u-meta">MODELS</dt>
            <dd>{models.length}</dd>
          </div>
          <div>
            <dt className="u-meta">EVENTS</dt>
            <dd>{events.length}</dd>
          </div>
          <div>
            <dt className="u-meta">ORGANIZATIONS</dt>
            <dd>{organizations.length}</dd>
          </div>
          <div>
            <dt className="u-meta">FIRST MODEL</dt>
            <dd>{years}</dd>
          </div>
          <div>
            <dt className="u-meta">LAST MODEL</dt>
            <dd>{lastModel ? lastModel.displayDate : '—'}</dd>
          </div>
        </dl>
      </header>

      <section className="about-section u-container" aria-labelledby="about-thesis">
        <p className="u-meta">01 / THESIS</p>
        <div className="about-section__grid">
          <h2 id="about-thesis" className="about-section__title">
            这不是一份年表。
          </h2>
          <div className="about-section__body u-cn">
            <p>
              人工智能的历史经常被写成产品发布新闻的汇总：某年某月，某家公司发布了更强的模型。
              但真正塑造这条路径的，是几次观念上的转折——把智能写成符号与规则，把学习写成统计与
              梯度，把语言写成预测下一个词，把推理写成可以被搜索的过程，最后把行动写成工具调用
              与任务闭环。
            </p>
            <p>
              这些阶段并非依次替代。符号主义从未消失，统计方法仍在深处运行，Transformer
              也不是终点。它们是并行的技术路线，在同一个时代互相借用。本作品试图呈现这种延续与
              交叠，而不是一条被简化过的单线。
            </p>
            <p>
              因此，主叙事只保留能够解释「为什么重要」的节点；完整档案保留其余部分。叙事负责
              理解，档案负责查证。
            </p>
          </div>
        </div>
      </section>

      <section className="about-section u-container" aria-labelledby="about-method">
        <p className="u-meta">02 / METHOD</p>
        <h2 id="about-method" className="about-section__title">
          四条数据原则
        </h2>
        <div className="about-principles">
          {principles.map((principle) => (
            <article key={principle.label} className="about-principle">
              <p className="u-meta">{principle.label}</p>
              <h3>{principle.title}</h3>
              <p className="u-caption">{principle.body}</p>
            </article>
          ))}
        </div>
        <p className="about-note u-caption">
          说明：本作品为独立的交互式研究项目，与所提及的任何模型厂商无隶属关系。模型与机构名称
          归其各自所有者。数据截止于 {ARCHIVE_CUTOFF}，此后的发布不在本档案范围内。
        </p>
      </section>

      <section className="about-section u-container" aria-labelledby="about-read">
        <p className="u-meta">03 / READ</p>
        <h2 id="about-read" className="about-section__title">
          两种阅读方式
        </h2>
        <div className="about-read">
          <a className="about-read__card" href="#/">
            <span className="u-meta">A / NARRATIVE</span>
            <strong>从头开始</strong>
            <span className="u-caption u-cn">
              八分钟滚动，经历从 1950 到 2026 的七个章节。适合第一次进入。
            </span>
            <span className="about-read__arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a className="about-read__card" href="#/archive">
            <span className="u-meta">B / ARCHIVE</span>
            <strong>进入完整档案</strong>
            <span className="u-caption u-cn">
              按年份、机构、家族、类别筛选，检索模型并查看来源与关系图谱。
            </span>
            <span className="about-read__arrow" aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </section>

      <section className="about-section u-container" aria-labelledby="about-tech">
        <p className="u-meta">04 / IMPLEMENTATION</p>
        <h2 id="about-tech" className="about-section__title">
          技术与致谢
        </h2>
        <div className="about-tech" ref={revealRef} data-reveal>
          <dl>
            <div>
              <dt className="u-meta">STACK</dt>
              <dd>Vite · React · TypeScript · Three.js</dd>
            </div>
            <div>
              <dt className="u-meta">TYPE</dt>
              <dd>Inter Tight · IBM Plex Mono · 系统中文字体</dd>
            </div>
            <div>
              <dt className="u-meta">PALETTE</dt>
              <dd>#FAFAF8 / #161616 / #747474 / #E6E6E3 / #111111</dd>
            </div>
            <div>
              <dt className="u-meta">ACCESS</dt>
              <dd>键盘导航 · 减少动态 · WebGL 降级</dd>
            </div>
          </dl>
          <p className="u-caption u-cn">
            所有历史资料来自公开的官方公告、论文与技术文档。研究过程中无法核实的型号与日期，
            记录在项目的数据报告中，而不是被补全。若你发现错误，请以官方来源为准。
          </p>
        </div>
      </section>

      <footer className="about-footer u-container">
        <p className="u-meta">THE INTELLIGENCE ARCHIVE · 1950 — {ARCHIVE_CUTOFF}</p>
        <p className="u-meta">CONTINUED.</p>
        <a className="u-link u-mono" href="#/">
          RETURN TO THE BEGINNING
        </a>
      </footer>
    </main>
  );
}
