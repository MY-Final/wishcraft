import Provenance from '../../components/common/Provenance';
import { getModel, getOrganization, type Model, type Organization } from '../../data';
import { useReveal } from '../../lib/use-reveal';
import { FIELD_MODELS, FIELD_STATS, groupByOrg } from './field-data';

const OPEN_GROUPS = groupByOrg(FIELD_MODELS.filter((model) => model.openWeights === true)).sort(
  (a, b) => b.models.length - a.models.length,
);
const CLOSED_GROUPS = groupByOrg(FIELD_MODELS.filter((model) => model.openWeights !== true)).sort(
  (a, b) => b.models.length - a.models.length,
);

const SHOWN = 6;

const CN_ORG_IDS = [
  'deepseek',
  'alibaba-qwen',
  'zhipu',
  'moonshot',
  'minimax',
  'bytedance',
  'baidu',
  '01ai',
];

const CN_ORGS = CN_ORG_IDS.map((id) => getOrganization(id)).filter(
  (org): org is Organization => Boolean(org),
);

interface OrgSpan {
  org: Organization;
  first: Model;
  last: Model;
  count: number;
}

const CN_SPANS: OrgSpan[] = CN_ORGS.map((org) => {
  const list = FIELD_MODELS.filter((model) => model.organization === org.id);
  if (list.length === 0) return null;
  return {
    org,
    first: list[0] as Model,
    last: list[list.length - 1] as Model,
    count: list.length,
  };
}).filter((span): span is OrgSpan => Boolean(span));

const CN_GROUPED = groupByOrg(FIELD_MODELS.filter((model) => model.countryOrRegion === 'CN')).sort(
  (a, b) => b.models.length - a.models.length,
);

function OrgGroup({ group }: { group: { org: string; label: string; models: Model[] } }) {
  return (
    <li className="ch05__org-row">
      <span className="ch05__org-name u-mono">{group.label}</span>
      <span className="ch05__org-models">{group.models.map((model) => model.name).join(' · ')}</span>
      <span className="ch05__org-count u-mono">{String(group.models.length).padStart(2, '0')}</span>
    </li>
  );
}

export default function Chapter05Pages() {
  const routesRef = useReveal<HTMLDivElement>();
  const chinaRef = useReveal<HTMLDivElement>();
  const axisRef = useReveal<HTMLDivElement>();
  const openSource = getModel('llama-3-1');
  const closedSource = getModel('gpt-4o');
  const axisSource = getModel('o1-preview');
  const o1Model = getModel('o1');
  const openReasoner = getModel('qwq-32b-preview');
  const openBase = getModel('deepseek-v3');

  return (
    <section
      className="ch05__pages"
      data-scene
      data-chapter="5"
      data-year-start="2024"
      data-year-end="2024"
      aria-label="第五章续：两条路线、中国的开放权重供给与 2024 年的新轴"
    >
      <div className="ch05__page" ref={routesRef} data-reveal>
        <header className="ch05__page-head">
          <p className="u-meta">04 · TWO ROUTES</p>
          <h3 className="ch05__page-title">两条路线，同一张图</h3>
          <p className="ch05__page-lede">权重是否公开，决定了模型怎样扩散，也决定了它靠什么收钱。</p>
        </header>

        <div className="ch05__routes">
          <div className="ch05__route">
            <div className="ch05__route-head">
              <span className="ch05__key-dot is-open" aria-hidden="true" />
              <span className="u-meta">开放权重 / WEIGHTS PUBLISHED</span>
              <span className="ch05__route-count u-mono">{FIELD_STATS.open}</span>
            </div>
            <ul className="ch05__org-list">
              {OPEN_GROUPS.slice(0, SHOWN).map((group) => (
                <OrgGroup key={group.org} group={group} />
              ))}
            </ul>
            <p className="ch05__org-more u-mono">
              另 {OPEN_GROUPS.length - SHOWN} 家机构 · 见档案
            </p>
            <p className="ch05__route-note">
              权重一旦公开，能力就以文件的形式扩散：可以被量化到消费级显卡、被微调成垂直模型、被部署在无法联网的机房。代价是发布方失去对用途的控制，也很难直接按推理收费。
            </p>
            {openSource && (
              <Provenance
                source={openSource.sources[0]}
                status={openSource.verificationStatus}
                date={openSource.displayDate}
              />
            )}
          </div>

          <div className="ch05__route ch05__route--closed">
            <div className="ch05__route-head">
              <span className="ch05__key-dot is-closed" aria-hidden="true" />
              <span className="u-meta">闭源 / WEIGHTS WITHHELD</span>
              <span className="ch05__route-count u-mono">{FIELD_STATS.closed}</span>
            </div>
            <ul className="ch05__org-list">
              {CLOSED_GROUPS.slice(0, SHOWN).map((group) => (
                <OrgGroup key={group.org} group={group} />
              ))}
            </ul>
            <p className="ch05__org-more u-mono">
              另 {CLOSED_GROUPS.length - SHOWN} 家机构 · 见档案
            </p>
            <p className="ch05__route-note">
              闭源把控制权留在手里：模型只在自家接口后面运行，可以随时更新、收紧或按用量计价。代价是使用者必须接受服务方的规则与价格，也无法把模型搬进自己的机房。
            </p>
            {closedSource && (
              <Provenance
                source={closedSource.sources[0]}
                status={closedSource.verificationStatus}
                date={closedSource.displayDate}
              />
            )}
          </div>
        </div>

        <p className="ch05__page-foot">
          它们不是同一条路上的快慢，而是两条路：一条把能力变成可复制的资产，一条把能力变成持续提供的服务。2024
          年 5 月起，两条路开始比价——豆包大模型把主力 API 压到每千 token 数厘，GPT-4o 的接口价格约为 GPT-4
          Turbo 的一半，DeepSeek-V2 的定价也显著低于同期闭源模型。
        </p>
      </div>

      <div className="ch05__page ch05__page--china" ref={chinaRef} data-reveal>
        <header className="ch05__page-head">
          <p className="u-meta">05 · CHINA / THE OPEN-WEIGHT LANE</p>
          <h3 className="ch05__page-title">中国：开放权重的主力</h3>
          <p className="ch05__page-lede">
            {FIELD_STATS.open} 个开放权重条目里，{FIELD_STATS.openFromCn} 个来自中国机构。
          </p>
        </header>

        <div className="ch05__china-grid">
          <div>
            <p className="ch05__china-line">
              本章 {FIELD_STATS.orgs} 家机构里，{FIELD_STATS.cnOrgs} 家在中国（{FIELD_STATS.cn}{' '}
              个模型），{FIELD_STATS.otherOrgs} 家在其他地区（{FIELD_STATS.other} 个）。两年里，中国机构的条目占全部{' '}
              {FIELD_STATS.models} 条的{' '}
              {Math.round((FIELD_STATS.cn / FIELD_STATS.models) * 100)}%。
            </p>
            <p className="ch05__china-note">
              开放权重不是中国实验室的唯一选择——文心、豆包、混元、Kimi、abab
              都走闭源接口。但在本章的开放权重条目中，中国机构占了多数，而且分布在不同规模上：可单卡运行的
              6B 级对话模型、32B 级的稠密基座，以及 671B 的稀疏旗舰。
            </p>
            <ul className="ch05__cn-index">
              {CN_GROUPED.map((group) => (
                <li key={group.org}>
                  <span className="u-mono">{group.label}</span>
                  <span className="u-mono ch05__cn-index-count">{group.models.length}</span>
                </li>
              ))}
            </ul>
            <p className="ch05__china-note">
              这张索引按机构列出本章收录的条目数。开放与闭源在同一条时间线上交错：智谱从 ChatGLM-6B
              开源起步，到 GLM-4 转向闭源旗舰；深度求索从 DeepSeek LLM 67B 一路开源到 DeepSeek-V3。
            </p>
          </div>

          <div className="ch05__gap">
            <p className="ch05__gap-lede">
              按机构看这两年：起点是本章收录的第一条，终点是最后一条。它们不是同一种路线，但都在十四个月里完成了两到三次换代。
            </p>
            <table className="ch05__gap-table">
              <caption className="sr-only">中国机构在 2023—2024 年的首条与末条模型记录</caption>
              <thead>
                <tr>
                  <th scope="col">机构</th>
                  <th scope="col">起点</th>
                  <th scope="col">终点</th>
                  <th scope="col">条数</th>
                </tr>
              </thead>
              <tbody>
                {CN_SPANS.map(({ org, first, last, count }) => (
                  <tr key={org.id}>
                    <td className="ch05__gap-org">{org.nameZh || org.name}</td>
                    <td>
                      {first.name}
                      <span className="ch05__gap-date u-mono">{first.displayDate}</span>
                    </td>
                    <td>
                      {last.id === first.id ? (
                        <span className="ch05__gap-single u-mono">— 本章仅一条 —</span>
                      ) : (
                        <>
                          {last.name}
                          <span className="ch05__gap-date u-mono">{last.displayDate}</span>
                        </>
                      )}
                    </td>
                    <td className="u-mono ch05__gap-num">{String(count).padStart(2, '0')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ch05__gap-foot">
              表内条目全部来自本章的 {FIELD_STATS.models} 条记录，日期与权重状态取自官方公告或模型卡；旗标为「开放」的条目可在
              Hugging Face 或魔搭下载。
            </p>
          </div>
        </div>
      </div>

      <div className="ch05__page ch05__page--axis" ref={axisRef} data-reveal>
        <header className="ch05__page-head">
          <p className="u-meta">06 · THE AXIS MOVES</p>
          <h3 className="ch05__page-title">轴换了方向</h3>
        </header>

        <div className="ch05__axis-body">
          <p>
            {axisSource ? `${axisSource.displayDate}，${axisSource.name}` : 'OpenAI o1-preview'}
            把「回答前先想更久」做成可训练的目标：用强化学习让模型在给出结论之前生成较长的内部推理链，在竞赛数学、编程与科学问答上明显超过
            GPT-4o。代价是更慢、更贵，而且思维链原文不公开。
          </p>
          <p>
            {o1Model ? `${o1Model.displayDate}，${o1Model.name}` : 'o1'} 正式版把同等请求的推理
            token 用量平均减少约六成，并补上函数调用、结构化输出与视觉输入。推理不再只是一个演示，而是一档可以计价的产品。
          </p>
          <p className="ch05__axis-note">
            {openReasoner ? `${openReasoner.displayDate}，${openReasoner.name}` : 'QwQ-32B-Preview'}
            {' '}
            把长链思维做成了可下载的 32B 权重；{openBase ? `${openBase.displayDate}，${openBase.name}` : 'DeepSeek-V3'}{' '}
            用 671B 稀疏结构把开源基座推到年末。轴换方向时，开放权重没有缺席。
          </p>
        </div>

        <p className="ch05__axis-mark">A MAP, NOT A LINE.</p>
        <p className="ch05__axis-zh u-cn">
          地图不是终点。这张图上最后几个点，标出的不是更大的模型，而是另一种增长方式：不把参数做大，把思考时间做长。
        </p>

        {axisSource && (
          <Provenance
            source={axisSource.sources[0]}
            status={axisSource.verificationStatus}
            date={axisSource.displayDate}
          />
        )}
        {openReasoner && (
          <Provenance
            source={openReasoner.sources[0]}
            status={openReasoner.verificationStatus}
            date={openReasoner.displayDate}
          />
        )}
      </div>

      <p className="ch05__colophon u-meta">
        CH05 · {FIELD_STATS.models} MODELS · {FIELD_STATS.orgs} INSTITUTIONS ·{' '}
        {FIELD_STATS.edges} LINEAGE EDGES · SOURCES IN RECORD
      </p>
    </section>
  );
}
