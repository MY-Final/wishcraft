import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const frontierPath = resolve('research/frontier-2025-2026.json');
const chinaPath = resolve('research/china-2025-2026.json');

const frontier = JSON.parse(readFileSync(frontierPath, 'utf8'));
const astra = frontier.models.find((model) => model.id === 'gpt-6-astra');
if (astra) {
  astra.announcementDate = '2026-09';
  astra.availabilityDate = '2026-09-08';
  astra.displayDate = '2026.09';
  astra.datePrecision = 'month';
  astra.dateType = 'announcement';
  astra.contextWindow = '1,050,000 tokens';
  astra.notes =
    'AWS Bedrock 官方模型卡标注 Model launch date: 2026-09-08；OpenAI 官方页面无正文日期，媒体报道 2026-09-04 正式发布。此前按 2026-10-29 的 ChatGPT 更新倒推为 10 月，已按一手模型卡更正为 9 月（公告只到月，可用日单列）。';
  astra.sources = [
    ...astra.sources.filter((source) => source.url !== 'https://openai.com/index/gpt-6-astra/'),
    {
      label: 'Amazon Bedrock — GPT-6 Astra model card (launch date: September 8, 2026)',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-astra.html',
      kind: 'official',
    },
    {
      label: 'OpenAI — GPT-6 Astra: A new generation of intelligence',
      url: 'https://openai.com/index/gpt-6-astra/',
      kind: 'official',
    },
  ];
}

const sol = {
  id: 'gpt-6-1-sol',
  name: 'GPT-6.1 Sol',
  organization: 'openai',
  countryOrRegion: 'US',
  family: 'GPT',
  generation: '6.1',
  announcementDate: '2026-09-29',
  availabilityDate: '2026-09-29',
  displayDate: '2026.09.29',
  datePrecision: 'day',
  dateType: 'announcement',
  category: 'coding',
  tags: ['编程', '多步 Agent', '高性价比', '1M 上下文'],
  openWeights: false,
  architecture: '未公开（闭源）',
  parameters: null,
  contextWindow: '1M tokens',
  capabilities: ['复杂编程', '多步 Agent', '计算机使用', '长文档理解'],
  summary:
    'GPT-6.1 Sol 于 2026 年 9 月 29 日发布，定位为面向编程与复杂任务的高性价比模型。它支持 100 万 token 上下文与 13.1 万 token 输出，可接收图像与文本输入，官方称其能在多步 Agent 工作流中检查代码库并迭代方案。',
  keyAdvancement:
    '在 GPT-6 Astra 之后推出，以约五分之一的价格提供接近前沿的编码与 Agent 能力，把 6.1 代的成本曲线整体压低。',
  significance:
    '同一代际内按「能力/成本」分层：旗舰 Astra 承担最难任务，Sol 把可用的前沿能力下放到规模化编程与业务流程，价格成为模型分层的主要变量。',
  predecessors: [],
  successors: [],
  sources: [
    {
      label: 'OpenAI — Model Release Notes',
      url: 'https://help.openai.com/en/articles/9624314-model-release-notes',
      kind: 'official',
    },
    {
      label: 'Amazon Bedrock — GPT-6.1 Sol model card (launch date: September 29, 2026)',
      url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-1-sol.html',
      kind: 'official',
    },
  ],
  verificationStatus: 'verified',
  notes:
    'AWS Bedrock 官方模型卡标注 launch date 2026-09-29、上下文 1M、最大输出 131,072 tokens，Global CRIS 定价 $2/$10 per 1M；Rai News 2026-09-29 报道其在 DevDay 发布、成本约为 Astra 的 1/5。与 GPT-6 Astra 属不同档位，不建立直接继承边。',
};

if (!frontier.models.some((model) => model.id === sol.id)) {
  const terraIndex = frontier.models.findIndex((model) => model.id === 'gpt-6-1-terra');
  frontier.models.splice(terraIndex >= 0 ? terraIndex + 1 : frontier.models.length, 0, sol);
}

writeFileSync(frontierPath, `${JSON.stringify(frontier, null, 2)}\n`);

const china = JSON.parse(readFileSync(chinaPath, 'utf8'));
const kimi = china.models.find((model) => model.id === 'kimi-k3');
if (kimi) {
  kimi.announcementDate = '2026-07';
  kimi.availabilityDate = '2026-07';
  kimi.displayDate = '2026.07';
  kimi.datePrecision = 'month';
  kimi.verificationStatus = 'partially-verified';
  kimi.notes =
    '官方 Kimi K3 文档未标注发布日期；科技日报 2026-07-21、新华网 2026-07-22 报道「近日发布」，并引述 7 月 19 日公告；官方文档窗口写作 2025/07–2026/07。Hugging Face 仓库创建时间不能作为页面可见日期证据。按月份精度记录。';
}

writeFileSync(chinaPath, `${JSON.stringify(china, null, 2)}\n`);

const stamp = '\n\n---\n\n## 核查后更正（Lead 处理，2026-11-02）\n\n- `gpt-6-astra`：月份 2026-10 → 2026-09，availabilityDate 补为 2026-09-08（AWS Bedrock 模型卡），并补 context window 1,050,000 tokens。\n- 新增 `gpt-6-1-sol`：2026-09-29，来源 OpenAI Model Release Notes + AWS Bedrock 模型卡。此前 notes 中「GPT-6.1 Sol 不存在」的结论作废。\n- `kimi-k3`：月份 2026-06 → 2026-07，核实状态降为 partially-verified（官方文档无日期，媒体与公告窗口指向 7 月）。\n';

appendFileSync(resolve('research/frontier-2025-2026-notes.md'), stamp);
appendFileSync(resolve('research/china-2025-2026-notes.md'), stamp);

console.log('patched frontier + china research data');
