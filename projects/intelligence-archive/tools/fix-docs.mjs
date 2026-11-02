import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const reportPath = resolve('docs/DATA_REPORT.md');
let report = readFileSync(reportPath, 'utf8');

const corrections = [
  ['| 模型 models | **180** | 2018-06-11 → 2026-10-30', '| 模型 models | **181** | 2018-06-11 → 2026-10-30'],
  ['| verified 模型 | **142 / 180（78.9%）** | 其余 38 条为 partially-verified（21.1%） |', '| verified 模型 | **142 / 181（78.5%）** | 其余 39 条为 partially-verified（21.5%） |'],
  ['| 2026 | 35 |', '| 2026 | 36 |'],
  ['| **合计** | **180** |', '| **合计** | **181** |'],
  ['- 原始合计：180 models / 93 events / 17 organizations', '- 原始合计：181 models / 93 events / 17 organizations'],
  [
    '- 官方只给月份/季度（如 GPT-6 Astra 只到 2026-10、Claude Opus 5 只到 2026-07）；',
    '- 官方只给月份/季度（如 GPT-6 Astra 公告只到 2026-09、Claude Opus 5 只到 2026-07）；',
  ],
  [
    '| **GPT-6.1 Sol** | ❌ **不存在** | 无任何官方来源；线索指向 **GPT-5.6 Sol**（2026-07-09），已入库 `gpt-5-6-sol`。判定为误传/命名混淆，未建条目 |',
    '| **GPT-6.1 Sol** | ✅ **存在（已补录）** | 2026-09-29，AWS Bedrock 官方模型卡标注 launch date；后经独立核查确认，已补入 `gpt-6-1-sol`。此前「不存在」的判断作废 |',
  ],
  [
    '| **GPT-6 Astra** | ✅ 存在 | OpenAI 官方页面 `openai.com/index/gpt-6-astra/`；官方仅到月，故 `2026-10`（month 精度） |',
    '| **GPT-6 Astra** | ✅ 存在 | OpenAI 官方页面 `openai.com/index/gpt-6-astra/`；AWS Bedrock 模型卡标注 launch date 2026-09-08，公告月份修正为 `2026-09`（month 精度），可用日单列 |',
  ],
  [
    '- **frontier-2025-2026**：GPT-6.1 Sol（见上）、Claude 5（代际名）、以及若干「预告/传闻」不建条目。',
    '- **frontier-2025-2026**：Claude 5（代际名）、以及若干「预告/传闻」不建条目；GPT-6.1 Sol 已按核查补录。',
  ],
  [
    '| 7 | 2026.10 | `model:gpt-6-astra` | 旗舰评价标准转向「能否独立推进数小时专业任务」 |',
    '| 7 | 2026.09 | `model:gpt-6-astra` | 旗舰评价标准转向「能否独立推进数小时专业任务」 |',
  ],
];

for (const [from, to] of corrections) {
  if (!report.includes(from)) {
    console.warn('MISS:', from.slice(0, 60));
    continue;
  }
  report = report.split(from).join(to);
}

const block = `
> **核查后更正（2026-11-02，Lead + 独立核查员）**
>
> 独立核查抽查 56 条后发现 2 处日期硬错误、1 条漏收，已修正并重新合并：
>
> - \`gpt-6-astra\`：公告月份 **2026-10 → 2026-09**，\`availabilityDate\` 补为 **2026-09-08**（AWS Bedrock 官方模型卡），并补 \`contextWindow: 1,050,000 tokens\`。
> - **新增 \`gpt-6-1-sol\`（GPT-6.1 Sol，2026-09-29）**：来源 OpenAI Model Release Notes + AWS Bedrock 模型卡。此前「GPT-6.1 Sol 不存在」的结论作废。
> - \`kimi-k3\`：月份 **2026-06 → 2026-07**，核实状态降为 \`partially-verified\`（官方文档无日期，媒体与公告窗口指向 7 月）。
> - 最终数据：**models 181 / events 93 / organizations 44**，verified 142 / partially-verified 39；\`validate-data.mjs\` 通过。
>
> 本报告以下若出现「180 models / verified 142/180 / 2026 共 35 条 / GPT-6.1 Sol 不存在」等表述，均为修正前快照，以本段为准。独立核查细节见 \`docs/VERIFICATION.md\`。
`;

const marker = '## 1. 数据来源与完整性';
report = report.replace(marker, `${block}\n${marker}`);
writeFileSync(reportPath, report);

const sourcesPath = resolve('docs/SOURCES.md');
appendFileSync(
  sourcesPath,
  '\n\n> 核查后更正：`gpt-6-astra` 公告月份应为 2026.09（AWS Bedrock launch date 2026-09-08）；新增 `gpt-6-1-sol`（2026.09.29，OpenAI Model Release Notes + AWS Bedrock 模型卡）；`kimi-k3` 修正为 2026.07（partially-verified）。完整修正见 DATA_REPORT.md 顶部说明。\n',
);

const verificationPath = resolve('docs/VERIFICATION.md');
appendFileSync(
  verificationPath,
  `

## 6. 处理状态（Lead，2026-11-02）

| 项 | 状态 | 处理 |
|---|---|---|
| P0-1 gpt-6-astra 月份 | 已修复 | 2026-09，availabilityDate 2026-09-08，补 AWS 模型卡来源与上下文规格 |
| P0-2 kimi-k3 月份 | 已修复 | 2026-07，降为 partially-verified，notes 记录媒体与公告窗口 |
| P0-3 gpt-6-1-sol 漏收 | 已补录 | 新模型条目，来源 OpenAI Release Notes + AWS Bedrock 模型卡 |
| openai-gpt6-rosalind-research-2026 与 model 重复 | 未处理 | 作为独立「研究发布」事件保留，叙事层避免与模型条目同时出现 |
| 4 条 404 来源 | 未处理 | 记录于本报告；主数据死链复检为 0，4 条属于组织/背景链接，不阻塞构建 |
| fable-mythos suspension 归因 | 未处理 | 需改写为「美国政府出口管制指令导致」，列入后续数据维护 |
| grok-4 升 verified | 未处理 | 保留 partially-verified 偏保守，不影响展示 |
| 36 条 openWeights 缺 weights 来源 / 14 条 summary 超长 | 未处理 | 不阻塞；summary 由叙事层截短展示 |

> 结论：三项 P0 已处理；数据重新合并并通过 \`validate-data.mjs\`。本报告第 2–4 节保留核查时的原始结论，供审计追溯。
`,
);

console.log('docs patched');
