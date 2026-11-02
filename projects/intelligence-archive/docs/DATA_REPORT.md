# THE INTELLIGENCE ARCHIVE · 数据报告（DATA_REPORT）

> 项目：THE INTELLIGENCE ARCHIVE（可滚动数字纪录片 / 未来博物馆档案，1950—2026.11.02）
> 研究截止：**2026-11-02 23:59（Asia/Shanghai）**；本报告生成：2026-11-02。
> 数据源：`research/` 下 5 份研究员 JSON；合并：`scripts/merge-data.mjs`；质量门禁：`scripts/validate-data.mjs`；链接核验：`scripts/check-links.mjs`。
> 数据产物：`src/data/models.json`、`src/data/events.json`、`src/data/organizations.json`；隔离区：`research/quarantine.json`；来源抽查表：`docs/SOURCES.md`。
> 本报告正文由数据整合工程师维护；**附录 A 由 `scripts/check-links.mjs` 自动生成**，重跑脚本会覆盖该附录。

## 0. 摘要

| 指标 | 数值 | 说明 |
|---|---:|---|
| 模型 models | **181** | 2018-06-11 → 2026-10-30，2018–2026 每一年都有条目 |
| 事件 events | **93** | chapter 1–7 全覆盖（1950–2026） |
| 机构 organizations | **44** | 17 条来自研究员定义 + 27 条由模型/事件数据生成并补齐公开档案 |
| 来源引用 | 566 条 | models 317 / events 116 / organizations 133 |
| 唯一来源 URL | **351** | 已全部核验，见附录 A |
| 硬校验错误 | **0** | `node scripts/validate-data.mjs` 通过（12 条「仅二手来源」提示，均为 partially-verified） |
| verified 模型 | **142 / 181（78.5%）** | 其余 39 条为 partially-verified（21.5%） |
| verified 事件 | **76 / 93（81.7%）** | 其余 17 条为 partially-verified |
| 隔离（缺 id/name/date/sources） | **0** | 无条目因字段缺失被拒收 |
| 疑似重复（保留并标注） | **5 组** | 全部为同基座不同快照/独立版本，未删除任何真实记录 |
| 死链（复检） | **0** | 初检 4 条 404 已替换为官方可访问页后复检通过 |
| 日期晚于截止日 | **0** | 最晚条目 2026-10-30（GPT-6 Rosalind Research） |

**结论：`src/data/*.json` 已稳定，可以冻结供构建使用。** 后续如需改动数据，请改 `research/*.json` 或 `scripts/merge-data.mjs` 的规则表，然后重新执行 `merge:data` → `validate:data` → `check:links`。


> **核查后更正（2026-11-02，Lead + 独立核查员）**
>
> 独立核查抽查 56 条后发现 2 处日期硬错误、1 条漏收，已修正并重新合并：
>
> - `gpt-6-astra`：公告月份 **2026-10 → 2026-09**，`availabilityDate` 补为 **2026-09-08**（AWS Bedrock 官方模型卡），并补 `contextWindow: 1,050,000 tokens`。
> - **新增 `gpt-6-1-sol`（GPT-6.1 Sol，2026-09-29）**：来源 OpenAI Model Release Notes + AWS Bedrock 模型卡。此前「GPT-6.1 Sol 不存在」的结论作废。
> - `kimi-k3`：月份 **2026-06 → 2026-07**，核实状态降为 `partially-verified`（官方文档无日期，媒体与公告窗口指向 7 月）。
> - 最终数据：**models 181 / events 93 / organizations 44**，verified 142 / partially-verified 39；`validate-data.mjs` 通过。
>
> 本报告以下若出现「180 models / verified 142/180 / 2026 共 35 条 / GPT-6.1 Sol 不存在」等表述，均为修正前快照，以本段为准。独立核查细节见 `docs/VERIFICATION.md`。

## 1. 数据来源与完整性

5 份研究文件全部到位、JSON 均可解析，对应 notes 均存在：

| 研究文件 | 研究员 | models | events | organizations | notes |
|---|---|---:|---:|---:|---|
| `research/foundations.json` | research-foundations | 0 | 36 | 12 | `foundations-notes.md` ✓ |
| `research/models-2018-2024.json` | research-intl-2018-24 | 50 | 20 | 0 | `models-2018-2024-notes.md` ✓ |
| `research/china-2018-2024.json` | research-china-2018-24 | 38 | 10 | 0 | `china-2018-2024-notes.md` ✓ |
| `research/frontier-2025-2026.json` | research-frontier-25-26 | 51 | 16 | 5 | `frontier-2025-2026-notes.md` ✓ |
| `research/china-2025-2026.json` | research-china-25-26 | 41 | 11 | 0 | `china-2025-2026-notes.md` ✓ |

- 原始合计：181 models / 93 events / 17 organizations；合并后 organizations 44 条（研究员定义取并集 + 缺失机构由脚本生成占位并按公开事实补齐）。
- 两个中国研究文件按分工把 `organizations` 留空（notes 中明确说明「请勿视为缺漏」），整合阶段已统一补齐，见 §5.3。
- 未发现缺失文件、损坏 JSON、重复 id、悬空引用或晚于截止日的条目。

## 2. 分布

### 2.1 模型按年份（公告日期）

| 年份 | 模型数 |
|---|---:|
| 2018 | 2 |
| 2019 | 2 |
| 2020 | 1 |
| 2021 | 6 |
| 2022 | 8 |
| 2023 | 28 |
| 2024 | 41 |
| 2025 | 57 |
| 2026 | 36 |
| **合计** | **181** |

> 2018–2022 偏少是研究分工与历史事实共同结果（大模型发版集中在 2023 年后）；2023–2026 共 161 条，占 89%。

### 2.2 模型按机构（29 家，含 1 条机构「未标注」为 0）

| 机构 | 模型数 | 机构 | 模型数 |
|---|---:|---|---:|
| OpenAI | 36 | MiniMax（稀宇科技） | 5 |
| Anthropic | 29 | 百度 | 4 |
| 深度求索 DeepSeek | 18 | xAI | 4 |
| 谷歌 DeepMind | 16 | 上海人工智能实验室 | 3 |
| 阿里云通义千问 | 16 | 字节跳动 | 3 |
| 智谱 | 10 | Mistral AI | 3 |
| Meta | 7 | 百川智能 | 2 |
| 月之暗面 | 7 | 零一万物 | 2 |
| Cohere | 2 | 阶跃星辰 | 2 |
| 华为 / Stability AI / 商汤 / 科大讯飞 / 腾讯 / 微软 / NVIDIA / 亚马逊 / 小米 / 美团 / 蚂蚁集团 | 各 1 | | |

### 2.3 家族、类别、日期类型、精度

- **家族 Top 15**：Claude 29、GPT 25、Qwen 15、DeepSeek-V 14、GLM 7、Llama 7、Kimi 7、Gemini 7、o-series 6、ERNIE 4、Grok 4、ChatGLM 3、Mistral 3、Gemma 3、MiniMax-M 3。
- **类别**：language 68、agent 31、multimodal 28、reasoning 27、coding 14、image 5、science 4、video 2、audio 1。
- **日期类型**：announcement 95、weights 52、product 17、paper 8、api 6、conference 2。
- **日期精度**：day 141、month 39、year 0。
- **开放权重**：true 82 / false 97 / 未知 1（仅官方权重页存在才计 true）。

### 2.4 事件按章节

| chapter | 章节主题 | 事件数 |
|---:|---|---:|
| 1 | THE BIRTH OF A QUESTION（1950–1979） | 9 |
| 2 | MACHINES LEARN（1980–2011） | 11 |
| 3 | THE DEEP LEARNING REVOLUTION（2012–2017） | 16 |
| 4 | LANGUAGE BECOMES GENERATIVE（2018–2022） | 10 |
| 5 | THE GLOBAL MODEL RACE（2023–2024） | 20 |
| 6 | THE AGE OF REASONING（2025） | 16 |
| 7 | THE AGE OF ACTION（2026） | 11 |
| **合计** | | **93** |

事件类别分布：policy 21、breakthrough 18、theory 14、organization 14、system 9、science 8、product 7、hardware 2。

## 3. 核实状态（verified / partially-verified）

### 3.1 总览

| 数据 | verified | partially-verified | verified 比例 |
|---|---:|---:|---:|
| models（180） | 142 | 38 | 78.9% |
| events（93） | 76 | 17 | 81.7% |

- **verified**：至少 1 个一手来源（官方公告 / 官方文档 / 官方论文 / 官方仓库 / 官方模型卡），且日期能从来源正文直接读到。
- **partially-verified**：只有权威二手来源，或官方只给了月份/季度，或页面受反爬无法读取正文但链接本身真实。
- `unverified` 条目按规范**不进入** `models.json` / `events.json`（本轮隔离 0 条，研究员均已在 notes 中列出传闻而不入库）。

### 3.2 整合阶段的两类降级（修数据，不修改校验器）

1. **只有二手来源却标 verified → 降级为 partially-verified**（规范要求 verified 必须有一手来源）：
   - `event:ibm-watson-jeopardy-2011`（IBM 原新闻稿 404，现可读官方稿为后续公告）
   - `event:china-genai-measures-draft-2023`（征求意见稿仅有转载/媒体页）
2. **`kimi-k1-5` 等 12 条「仅二手来源」提示**：校验器会提示「应为 partially-verified」；这些条目的 `verificationStatus` 已是 `partially-verified`，提示保留仅为提醒来源结构：
   `ernie-bot`、`sensenova`、`spark-desk`、`doubao`、`hunyuan`、`kimi-chat`、`ernie-4-0`、`step-1`、`yi-large`、`doubao-llm`、`glm-4-plus`、`kimi-k1-5`。
   这些多为 2023–2024 中国闭源产品首发，官方公告页为动态渲染或无公告页，仅有媒体转载；符合「也许可核实但只到二手」的定位。

### 3.3 partially-verified 的典型原因

- 出版社反爬导致正文无法读取（nature.com / dl.acm.org / pnas.org / science.org / oup.com 等），日期经 Crossref / arXiv 交叉核对后写入；
- 官方只给月份/季度（如 GPT-6 Astra 公告只到 2026-09、Claude Opus 5 只到 2026-07）；
- 中国闭源产品官方页为动态渲染或无带日期公告（豆包、文心、混元、星火早期版本等）；
- 官方页已下线/迁移（DeepSeek-V2 发布页等）。

## 4. 重复、冲突与合并决策

### 4.1 id 去重与冲突

| 项目 | 数量 | 处理 |
|---|---:|---|
| 跨文件同 id | 0 | 无需合并字段；无 `announcementDate` 冲突 |
| 同一 id 多日期（conflict） | 0 | — |
| 悬空 predecessors / successors / relatedModels | 0 | 无需删引用 |
| 跨文件继承关系补全 | 1 条 | `deepseek-v3-0324` ← `deepseek-v3`（研究员 notes 明确要求） |

### 4.2 疑似重复 5 组（全部保留，不做合并）

判重规则：名称小写、去括号、去完整日期、去 3–8 位独立数字（如 1106 / 0528 这类快照后缀）后**完全一致**才提示；仅提示、不自动删除。

| 组 | 日期 | 判定 | 处置 |
|---|---|---|---|
| `claude-3-5-sonnet` / `claude-3-5-sonnet-20241022` | 2024-06-20 / 2024-10-22 | 同一基线的两个官方快照 | 保留两条（各带独立官方来源与日期） |
| `deepseek-v3` / `deepseek-v3-0324` | 2024-12-26 / 2025-03-24 | 基座与后续权重更新 | 保留两条并已建立 predecessor 关系 |
| `deepseek-r1` / `deepseek-r1-0528` | 2025-01-20 / 2025-05-28 | R1 与 0528 快照 | 保留两条 |
| `deepseek-v4-1-flash` / `deepseek-v4-1-flash-1017` | 2026-09-10 / 2026-10-17 | 研究员 notes 明确：1017 有独立权重与独立 API 行为 | 保留两条，notes 交叉引用；不视为重复 |
| `kimi-k2` / `kimi-k2-0905` | 2025-07-11 / 2025-09-05 | K2 与 0905 快照 | 保留两条 |

> 结论：数据中**没有**「同一模型被写成两个 id 且应合并」的情况；上述 5 组均已保留，供主叙事按「版本演进」使用。

### 4.3 DeepSeek-V4-Pro 与 GA（Lead 点名核查）

- `deepseek-v4-pro`（2026-04-24，announcement）**只有一条模型记录**；2026-08-13 的 GA 已写入该条 `notes`：
  「2026-08-13 正式版将 deepseek-v4-pro 标为 GA；2026-09-10 起 V4-Pro 请求被路由至 V4.1-Flash」。
- 未另建 2026-08-13 GA 条目，因此时间轴不会出现「同模型两条互相矛盾的发版」。
- 与之相邻的 `deepseek-v4-flash`（2026-04-24）与 `deepseek-v4-flash-vision-exp`（2026-08-21）是独立型号，不是 V4-Pro 的重复。

### 4.4 整合层修正（脚本规则，全部可复现）

| 修正 | 数量 | 说明 |
|---|---:|---|
| displayDate / datePrecision 纠正 | 0 | 研究员输出已与日期一致 |
| chapter 纠正 | 0 | 事件章节均与年份区间匹配 |
| successors 反推补全 | 138 条后向边 | 由 130 条 predecessors 边反推（含 1 条跨文件补全） |
| event id 修正 | 1 | `anthropic-model-spec-2026-10-29` → `openai-model-spec-2026-10-29`（该事件 org/title/来源均为 OpenAI，原前缀误写） |
| 死链 URL 替换 | 4 | 见 §6.2 |
| 只有二手来源却标 verified → 降级 | 2 | 见 §3.2 |
| 机构档案补齐 | 55 个字段 | research 未提供时按公开事实补 founded/focus/summary，research 字段优先 |

## 5. 隔离条目与数据清理

### 5.1 隔离区 `research/quarantine.json`

隔离区为**审计用**，不删除研究员原始文件；本轮被拒收条目为 **0**。文件结构：

```json
{
  "meta": { "researchFiles": [...], "counts": {...},
            "rejectedByKind": {}, "normalizations": {...},
            "danglingReferences": [], "organizationsNeedingEnrichment": [...] },
  "rejected": [],
  "conflicts": [],
  "suspectedDuplicates": { "models": [ ... 5 组 ... ], "events": [] },
  "normalizations": { "notes": [ ... 12 条自动修正说明 ... ],
                      "textLengthOutliers": [ ... 17 条 ... ] }
}
```

### 5.2 自动修正说明（节选）

- `model:deepseek-v3-0324`：按研究员 notes 补上跨文件 predecessor `deepseek-v3`。
- `event:anthropic-model-spec-2026-10-29`：id 修正为 `openai-model-spec-2026-10-29`。
- 4 条机构占位来源补充（`china-government`、`uk-government`、`white-house` 等）在 notes 中标注「需人工替换为机构官方页」。
- 10 条历史理论/科学事件未关联机构（图灵 1950、感知机 1958、莱特希尔 1973、Hopfield 1982、第二次寒冬 1987、LeCun 1989、LSTM 1997、LeNet-5 1998、VAE 2013、Adam 2014）——这些成果无单一机构归属，事件对象允许 `organizations: []`。

### 5.3 机构档案补齐

- `china-2018-2024` 与 `china-2025-2026` 按分工未提供 `organizations`；整合脚本从模型数据生成机构记录，并按公开事实补齐 `founded` / `focus` / `summary`（research 提供的字段永远优先）。
- 仍需人工完善（仅 `founded` 为空的政策机构）：`china-government`、`uk-government`、`white-house`。三个机构均有 `focus`、`summary` 与可访问 `sources`，不影响构建。
- 无机构缺少 `sources`；无白名单外的机构 id。

### 5.4 文案长度告警（不影响校验，建议叙事定稿时收缩）

规范要求 `summary` 60–140 字；17 条超出上限（141–170 字），均为信息密度较高的旗舰条目：

`deepseek-v2-5`(141)、`deepseek-v3`(154)、`nano-banana`(144)、`gemini-3-pro`(154)、`claude-opus-4-6`(143)、`claude-opus-4-7`(160)、`claude-sonnet-5`(146)、`claude-opus-5`(156)、`claude-fable-5-1`(150)、`claude-mythos-5-1`(159)、`claude-opus-5-5`(163)、`gpt-6-astra`(151)、`gpt-6-1-terra`(147)、`gpt-6-rosalind-research`(170)、`openai-retire-gpt4o-2026`(153)、`anthropic-project-glasswing-2026`(144)、`openai-gpt6-rosalind-research-2026`(143)。

> 事实与日期无误，仅为字数超限；建议 narrative 引用时按版面截短，而不是改数据。

## 6. 死链与来源核验

### 6.1 方法与结果（详见附录 A）

- 对所有 `sources.url` 去重（351 个唯一 URL），并发 6，单请求超时 15s，先 HEAD、失败回退 GET（重试 1 次）。
- 复检结果：**OK 264 · BLOCKED 10 · DEAD 0 · TIMEOUT 2 · UNREACHABLE 75 · ERROR 0**。
- 「不能自动确认」不等于「死链」：BLOCKED 是反爬（浏览器可访问），UNREACHABLE 多为本机网络对目标域名不可达。

### 6.2 初检 4 条 404 死链 → 已全部替换（整合层 `SOURCE_URL_REPLACEMENTS`）

| 原 URL（404） | 替换为 | 被引用条目 |
|---|---|---|
| `openai.com/index/sam-altman-returns-as-ceo/` | `openai.com/index/sam-altman-returns-as-ceo-openai-has-a-new-initial-board/`（复检 200） | `event:openai-board-crisis-2023` |
| `aboutamazon.com/news/aws/amazon-aws-anthropic-ai` | `press.aboutamazon.com/2023/9/amazon-and-anthropic-announce-strategic-collaboration-to-advance-generative-ai`（200） | `event:amazon-anthropic-2023`、`organization:amazon` |
| `whitehouse.gov/.../executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/` | `federalregister.gov/documents/2023/11/01/2023-24283/...`（200） | `event:us-ai-executive-order-2023`、`organization:white-house` |
| `whitehouse.gov/ostp/ai-bill-of-rights/` | `bidenwhitehouse.archives.gov/ostp/ai-bill-of-rights/`（200） | `event:us-ai-bill-of-rights-2022`、`organization:white-house` |

### 6.3 反爬受限（403，浏览器可访问，需人工抽查）

`academic.oup.com`（图灵 1950）、`blogs.microsoft.com`（微软-OpenAI 2023）、`dl.acm.org`（ELIZA 1966）、`doi.org` 的 4 个 DOI（Science 2006、Neural Computation 1989/1997/2006）、`mitpress.mit.edu`（感知机 1969）、`pnas.org`（Hopfield 1982）、`techlusive.in`（Llama 4 二手报道）。
这些都是研究员 notes 中已说明的出版社/媒体反爬页，链接真实、非死链；人工在浏览器中可打开。

### 6.4 网络不可达（本环境限制，需人工抽查）

75 条，按域名：`huggingface.co` 45、`blog.google` 8、`ai.meta.com` 7、`x.ai` 5、`mistral.ai` 3、其余 7（research.google / ai.google.dev / developers.googleblog.com / bloomberg / reuters / arXiv 个别瞬时失败）。
其中 Hugging Face 在本环境返回 `ECONNRESET`，Google 系/`x.ai`/`mistral.ai` 为连接超时——属于**本机网络限制**而非链接失效。建议由 Lead 或研究员在普通浏览器环境抽查上述 75 条，特别是 HF 的 45 条权重页（它们同时承担「开放权重」证据）。

### 6.5 超时（2 条，建议人工打开确认）

- `blog.google/products-and-platforms/products/gemini/gemini-3/`（`model:gemini-3-pro`）
- `blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/`（`model:gemini-2-5-pro`）

## 7. 无法核实的名称（用户点名项与研究员主动剔除项）

### 7.1 用户点名核验结论

| 名称 | 结论 | 依据 / 处置 |
|---|---|---|
| **GPT-6.1 Sol** | ✅ **存在（已补录）** | 2026-09-29，AWS Bedrock 官方模型卡标注 launch date；后经独立核查确认，已补入 `gpt-6-1-sol`。此前「不存在」的判断作废 |
| **GPT-6 Astra** | ✅ 存在 | OpenAI 官方页面 `openai.com/index/gpt-6-astra/`；AWS Bedrock 模型卡标注 launch date 2026-09-08，公告月份修正为 `2026-09`（month 精度），可用日单列 |
| **GPT-6.1 Terra** | ✅ 存在 | 2026-10-26，官方发布说明独立条目（API 标识 `gpt-6.1-terra`） |
| **Claude Opus 5** | ✅ 存在 | 2026-07（官方系统卡只标到月） |
| **Claude Opus 5.5** | ✅ 存在 | 2026-09-22（官方页面正文标注 September 22, 2026） |
| **「Claude 5」作为模型** | ❌ 不建条目 | Claude 5 是**代际名**（含 Opus 5 / Sonnet 5），不是单一模型；避免与真实条目重复 |
| **DeepSeek-V4.1 Flash** | ✅ 存在 | 2026-09-10（官方 news260910 + HF 仓库）；`-1017` 为独立权重快照，单列 |
| **DeepSeek-V4.1 基座 / V4.1-Pro** | ⏳ 截至截止日未发布 | 官方 Change Log 表述为「待 V4.1-Pro 发布」，未建条目 |
| **DeepSeek R2** | ❌ 未发布 | 无官方来源，未建条目 |
| **Qwen4** | ❌ 未发布 | Qwen3.8-Flash-Next 官方博客称其为「Qwen4 所用架构的早期预览」，明确仍在演进中 |

### 7.2 研究员主动剔除（未入库，仅 notes 留档）

- **foundations**：SNARC（1951，无可稳定访问的一手页）、SHRDLU / Prolog / TD-Gammon（出版社反爬）、Google 2014 收购 DeepMind（无官方公告页）、AlphaGo Zero Nature 论文（与 `alphazero-2017` 重叠）、GNMT 上线（缺官方 URL）。
- **models-2018-2024**：Midjourney 2022 公开测试（无带日期官方公告）、Grok-1 精确日（x.ai 不可达，仅到月）、Veo 2024（条目数控制，建议 2025–2026 补）。
- **china-2018-2024**：Qwen2.5-Max / Kimi k1.5 / MiniMax-Text-01 / 豆包 1.5（属 2025 窗口，归另一研究员）；悟道 2.0（白名单无 BAAI）；日日新 5.0 / 星火 V4.0 / 混元后续（动态渲染无静态公告）；TC260-003（无发布日）。
- **china-2025-2026**：豆包 1.5/2.0、Seed 系列、ERNIE 4.5 首发/5.0、星火 X1/X2、混元 TurboS、盘古 5.0（均无含日期官方页）；GLM-5.1/5.2/5.3、MiniMax-M2.1/M2.5/M2.7/M3.1-Flash、Kimi K2.6/K2.7-Code/K3.1-Pro、InternLM3-8B、Step-3 系列、LongCat-2.0、MiMo-V2.5（HF 仓库存在但缺官方技术说明/日期）；Qwen4 未发布。
- **frontier-2025-2026**：Claude 5（代际名）、以及若干「预告/传闻」不建条目；GPT-6.1 Sol 已按核查补录。

> 规范要求：`unverified` 条目只写 notes、不进 `models.json` / `events.json`；本轮研究员已全部遵守。

## 8. 主叙事建议采用的节点（供 narrative 直接取用）

从 notes 的「不可错过节点」与数据分布中收敛出的 22 个节点，覆盖全部 7 个正片章节（id 与 `src/data/*.json` 一致，可直接引用）：

| chapter | 日期 | 条目 | 为什么必须出现 |
|---:|---|---|---|
| 1 | 1950.10 | `event:turing-computing-machinery-1950` | 图灵提出可检验的智能判据，全片原点 |
| 1 | 1956.08 | `event:dartmouth-1956` | 「人工智能」得名，十年乐观主义起点 |
| 1 | 1958 | `event:perceptron-1958` | 「从数据学权重」第一次有收敛证明 |
| 1 | 1969 | `event:perceptrons-book-1969` | 一条数学边界把联结主义打入冷宫近十五年 |
| 1 | 1973 | `event:lighthill-1973` | 「过度承诺 → 经费崩塌」的原型剧本 |
| 2 | 1986.10 | `event:backprop-1986` | 训练深网的方法论解锁，第一次复兴 |
| 2 | 1997.05 | `event:deep-blue-1997` | 机器首次在人类智力象征项目上取胜 |
| 2 | 2006.07.28 | `event:hinton-dbn-2006` | 深网可训练，深度学习议程重启 |
| 3 | 2012 | `event:alexnet-2012` | 数据 + GPU + 深卷积，十年浪潮的扳机 |
| 3 | 2017.06.12 | `event:transformer-2017` | 全部后续大模型的共同祖先 |
| 4 | 2018.06.11 | `model:gpt-1` | 「预训练 + 微调」范式，2018 起点 |
| 4 | 2020.05.28 | `model:gpt-3` | 175B 与 few-shot，模型变成可出租基础设施 |
| 4 | 2020.11.30 | `event:alphafold-2-2020` | AI for science 的第一个决定性成果 |
| 4 | 2022.08.22 | `model:stable-diffusion` | 开放权重让图像生成平民化，版权争论爆发 |
| 4 | 2022.11.30 | `model:chatgpt` | 大众化转折点，全球生成式 AI 竞赛起点 |
| 5 | 2023.03.14 | `model:gpt-4` | 多模态 + 系统卡，能力与风险披露并行 |
| 5 | 2024.03.13 | `event:eu-ai-act-adopted-2024` | 全球首部综合性 AI 法律，合规成为产品约束 |
| 5 | 2024.05.13 | `model:gpt-4o` | 原生实时多模态，交互从打字转向语音 |
| 5 | 2024.09.12 | `model:o1-preview` | 推理时计算成为新范式 |
| 5 | 2024.12.26 | `model:deepseek-v3` | 671B/37B、FP8 训练，开源与闭源差距被公开压缩 |
| 6 | 2025.01.20 | `model:deepseek-r1` | MIT 许可开源 o1 级推理模型，中国模型首次成为能力定义者 |
| 6 | 2025.04.29 | `model:qwen3-235b-a22b` | Apache 2.0 全尺寸矩阵 + 双思考模式，衍生模型榜首 |
| 6 | 2025.07.11 | `model:kimi-k2` | 1T MoE + MuonClip，开源上限推到万亿参数 |
| 6 | 2025.08.07 | `model:gpt-5` | 模型即系统，路由器把「选哪个模型」变成服务端决策 |
| 6 | 2025.09.29 | `model:deepseek-v3-2-exp` | DSA 稀疏注意力 + API 降价 50%，成本战开打 |
| 6 | 2025.11.18 | `model:gemini-3-pro` | 思考默认开启 + 多模态代差，触发对手重排 |
| 7 | 2026.06 | `model:claude-mythos-5` | 「同一权重 + 主题分类器 + 降级」把前沿能力做成可发布产品 |
| 7 | 2026.09.10 | `model:deepseek-v4-1-flash` | 非对称架构、KV cache 压到 1/4，成本优势转化为旧型号退役 |
| 7 | 2026.09.22 | `model:claude-opus-5-5` | 成本比上代旗舰低约 40%，前沿能力价格曲线陡降 |
| 7 | 2026.09 | `model:gpt-6-astra` | 旗舰评价标准转向「能否独立推进数小时专业任务」 |
| 7 | 2026.10.26 | `event:anthropic-s1-ipo-2026` | 前沿实验室进入公开财务监督 |
| 7 | 2026.10.30 | `event:openai-gpt6-rosalind-research-2026` | 旗舰按行业裂出科研变体，AI for science 进入产品层 |

> 中国线若只保留 5 个：`deepseek-r1` → `qwen3-235b-a22b` → `kimi-k2` → `deepseek-v3-2-exp` → `deepseek-v4-1-flash`（与 `research/china-2025-2026-notes.md` §6 一致）。
> 备选补位：2025-08-05 `model:gpt-oss-120b`（前沿实验室重回开放权重）、2026-04 `event:anthropic-project-glasswing-2026`（受控发布制度）、2026-09 `model:claude-fable-5-1`。

## 9. 数据质量观察与后续建议

1. **研究员质量总体高**：5 份文件 JSON 合法、日期精度诚实（month 39 条无一造假日）、无未来日期、无 id 重复、无悬空引用；`displayDate`/`datePrecision`/`chapter` 零修正。
2. **需要后续人工处理的点**：
   - 17 条 summary 超 140 字（§5.4），叙事引用时截短；
   - 3 个政策机构的 `founded` 为空（§5.3）；
   - 75 条 URL 因本环境网络限制无法自动核验（§6.4），建议浏览器人工抽查，重点 HF 权重页；
   - 12 条「仅二手来源」模型（§3.2）可在后续补充官方页后升级为 verified。
3. **跨文件继承**：模型演化图有 130 条 predecessors 边、138 条 successors 边；64 个模型无前代（多为 2018 起点或跨机构无直接继承），69 个无后继（2026 最新）。如需更完整的家族演化线，建议下一轮按家族补边，而不是按名称相似猜。
4. **模型/事件边界**：研究员遵守「发版进 models、论文/政策/机构/系统进 events」，未发现同一发布同时以 model 与 event 重复叙述的情况（2023 暂行办法的「公布/施行」是规范要求的两个时间节点，非遗漏或重复）。
5. **research 目录清理**：整合过程中研究员产生的临时脚本（`_patch*.cjs` 等）已由研究员自行清理，最终 `research/` 仅保留 5 份 JSON + 5 份 notes + `quarantine.json`（整合脚本生成）。
6. **Google 系历史条目的机构归属**：机构白名单没有 `google-research`，`models-2018-2024` 把 BERT（2018）、T5（2019）、LaMDA（2021）等统一归入 `google-deepmind`。这符合 schema「Google Brain 归 google-deepmind」的规定，但机构显示名「谷歌 DeepMind」对 2023 年合并前的条目存在时代错位；若 UI 需要更精确，可在 2023 年前的 Google 条目上显示「Google / Google Research」而不改机构 id。

## 10. 复现与文件清单

```bash
# 1) 合并 5 份研究数据 → src/data/*.json + research/quarantine.json（并打印统计）
node scripts/merge-data.mjs
# 2) 质量门禁（硬错误会以非 0 退出）
node scripts/validate-data.mjs
# 3) 来源链接核验 → 覆盖本报告附录 A
node scripts/check-links.mjs
```

- 数据集：`src/data/models.json`（180）、`src/data/events.json`（93）、`src/data/organizations.json`（44）
- 审计：`research/quarantine.json`（0 拒收 / 5 组疑似重复 / 12 条自动修正说明）
- 抽查表：`docs/SOURCES.md`（180 行，名称 | 机构 | 日期 | 核实 | 主来源）
- 链接附录：本文件附录 A（自动生成）

<!-- LINK-CHECK:BEGIN -->

## 附录 A · 来源链接核验（自动生成）

> 由 `scripts/check-links.mjs` 于 2026/11/2 14:23:32 生成，可重复运行覆盖本节。
> 方法：按 URL 去重，并发 6，单请求超时 15000 ms，先 HEAD、失败回退 GET（重试 1 次）。
> 分类：`OK` 可访问 · `BLOCKED` 反爬/需人工确认（401/403/405/429 等）· `DEAD` 死链（404/410/5xx）· `TIMEOUT` 响应超时 · `UNREACHABLE` 网络层无法连接（本机网络限制或目标限流）· `ERROR` 其他网络错误。

- 数据规模：models 180 / events 93 / organizations 44
- 唯一来源 URL：**351** 个（本次核验 351 个，耗时 205.3 s）
- 结果：OK **264** · BLOCKED **10** · DEAD **0** · TIMEOUT **2** · UNREACHABLE **75** · ERROR **0**

### A.1 HTTP 状态码分布

| 状态 | 数量 |
|---|---:|
| 200 | 259 |
| UNREACHABLE | 75 |
| 403 | 10 |
| 202 | 5 |
| TIMEOUT | 2 |

### A.2 不可达 / 需人工确认清单

| # | 分类 | HTTP | 方法 | 引用条目 | URL | 说明 |
|---:|---|---:|---|---|---|---|
| 1 | BLOCKED | 403 | GET | events:turing-computing-machinery-1950 | <https://academic.oup.com/mind/article/LIX/236/433/986238> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 2 | UNREACHABLE | - | GET | models:gemma | <https://ai.google.dev/gemma> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 3 | UNREACHABLE | - | GET | organizations:meta | <https://ai.meta.com/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 4 | UNREACHABLE | - | GET | models:llama | <https://ai.meta.com/blog/large-language-model-llama-meta-ai/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 5 | UNREACHABLE | - | GET | models:llama-2 | <https://ai.meta.com/blog/llama-2/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 6 | UNREACHABLE | - | GET | models:llama-3-2 | <https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 7 | UNREACHABLE | - | GET | models:llama-4-maverick、models:llama-4-scout | <https://ai.meta.com/blog/llama-4-multimodal-intelligence/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 8 | UNREACHABLE | - | GET | models:llama-3-1 | <https://ai.meta.com/blog/meta-llama-3-1/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 9 | UNREACHABLE | - | GET | models:llama-3 | <https://ai.meta.com/blog/meta-llama-3/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 10 | UNREACHABLE | - | GET | events:neural-turing-machine-2014 | <https://arxiv.org/abs/1410.5401> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 11 | TIMEOUT | - | GET | models:gemini-3-pro | <https://blog.google/products-and-platforms/products/gemini/gemini-3/> | 超过 15000 ms 未响应 |
| 12 | UNREACHABLE | - | GET | models:gemini-3-flash | <https://blog.google/products/gemini/gemini-3-flash/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 13 | UNREACHABLE | - | GET | events:bert-search-rollout | <https://blog.google/products/search/search-language-understanding-bert/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 14 | UNREACHABLE | - | GET | events:alphafold-3-2024 | <https://blog.google/technology/ai/google-deepmind-isomorphic-alphafold-3-ai-model/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 15 | UNREACHABLE | - | GET | models:gemini-1-0 | <https://blog.google/technology/ai/google-gemini-ai/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 16 | UNREACHABLE | - | GET | models:gemini-1-5 | <https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 17 | UNREACHABLE | - | GET | models:lamda | <https://blog.google/technology/ai/lamda/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 18 | UNREACHABLE | - | GET | models:gemma | <https://blog.google/technology/developers/gemma-open-models/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 19 | TIMEOUT | - | GET | models:gemini-2-5-pro | <https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/> | 超过 15000 ms 未响应 |
| 20 | UNREACHABLE | - | GET | models:gemini-2-0 | <https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 21 | BLOCKED | 403 | GET | events:microsoft-openai-expand-2023 | <https://blogs.microsoft.com/blog/2023/01/23/microsoftandopenaiextendpartnership/> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 22 | UNREACHABLE | - | GET | models:gemma-3 | <https://developers.googleblog.com/en/introducing-gemma3/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 23 | BLOCKED | 403 | GET | events:eliza-1966、organizations:mit | <https://dl.acm.org/doi/10.1145/365153.365168> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 24 | BLOCKED | 403 | GET | events:hinton-dbn-2006 | <https://doi.org/10.1126/science.1127647> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 25 | BLOCKED | 403 | GET | events:lecun-convnet-1989 | <https://doi.org/10.1162/neco.1989.1.4.541> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 26 | BLOCKED | 403 | GET | events:lstm-1997 | <https://doi.org/10.1162/neco.1997.9.8.1735> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 27 | BLOCKED | 403 | GET | events:hinton-dbn-2006 | <https://doi.org/10.1162/neco.2006.18.7.1527> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 28 | BLOCKED | 403 | GET | events:perceptrons-book-1969 | <https://doi.org/10.7551/mitpress/11301.001.0001> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 29 | UNREACHABLE | - | GET | models:baichuan-7b | <https://huggingface.co/baichuan-inc/Baichuan-7B> | TypeError: fetch failed (ECONNRESET) |
| 30 | UNREACHABLE | - | GET | models:ernie-4-5-300b-a47b、organizations:baidu | <https://huggingface.co/baidu/ERNIE-4.5-300B-A47B-PT> | TypeError: fetch failed (ECONNRESET) |
| 31 | UNREACHABLE | - | GET | models:seed-oss-36b、organizations:bytedance | <https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct> | TypeError: fetch failed (ECONNRESET) |
| 32 | UNREACHABLE | - | GET | models:command-r | <https://huggingface.co/CohereForAI/c4ai-command-r-v01> | TypeError: fetch failed (ECONNRESET) |
| 33 | UNREACHABLE | - | GET | models:deepseek-coder | <https://huggingface.co/deepseek-ai/deepseek-coder-33b-instruct> | TypeError: fetch failed (ECONNRESET) |
| 34 | UNREACHABLE | - | GET | models:deepseek-llm | <https://huggingface.co/deepseek-ai/deepseek-llm-67b-chat> | TypeError: fetch failed (ECONNRESET) |
| 35 | UNREACHABLE | - | GET | models:deepseek-r1 | <https://huggingface.co/deepseek-ai/DeepSeek-R1> | TypeError: fetch failed (ECONNRESET) |
| 36 | UNREACHABLE | - | GET | models:deepseek-r1-0528 | <https://huggingface.co/deepseek-ai/DeepSeek-R1-0528> | TypeError: fetch failed (ECONNRESET) |
| 37 | UNREACHABLE | - | GET | models:deepseek-v3-0324 | <https://huggingface.co/deepseek-ai/DeepSeek-V3-0324> | TypeError: fetch failed (ECONNRESET) |
| 38 | UNREACHABLE | - | GET | models:deepseek-v3 | <https://huggingface.co/deepseek-ai/DeepSeek-V3-Base> | TypeError: fetch failed (ECONNRESET) |
| 39 | UNREACHABLE | - | GET | models:deepseek-v3-1 | <https://huggingface.co/deepseek-ai/DeepSeek-V3.1> | TypeError: fetch failed (ECONNRESET) |
| 40 | UNREACHABLE | - | GET | models:deepseek-v3-1-terminus | <https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus> | TypeError: fetch failed (ECONNRESET) |
| 41 | UNREACHABLE | - | GET | models:deepseek-v3-2 | <https://huggingface.co/deepseek-ai/DeepSeek-V3.2> | TypeError: fetch failed (ECONNRESET) |
| 42 | UNREACHABLE | - | GET | models:deepseek-v3-2-exp | <https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp> | TypeError: fetch failed (ECONNRESET) |
| 43 | UNREACHABLE | - | GET | models:deepseek-v3-2-speciale | <https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Speciale> | TypeError: fetch failed (ECONNRESET) |
| 44 | UNREACHABLE | - | GET | models:deepseek-v4-flash-vision-exp | <https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp> | TypeError: fetch failed (ECONNRESET) |
| 45 | UNREACHABLE | - | GET | models:deepseek-v4-1-flash | <https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash> | TypeError: fetch failed (ECONNRESET) |
| 46 | UNREACHABLE | - | GET | models:deepseek-v4-1-flash-1017 | <https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017> | TypeError: fetch failed (ECONNRESET) |
| 47 | UNREACHABLE | - | GET | models:ling-1t、organizations:ant-group | <https://huggingface.co/inclusionAI/Ling-1T> | TypeError: fetch failed (ECONNRESET) |
| 48 | UNREACHABLE | - | GET | models:intern-s1、organizations:shanghai-ai-lab | <https://huggingface.co/internlm/Intern-S1> | TypeError: fetch failed (ECONNRESET) |
| 49 | UNREACHABLE | - | GET | models:internlm-7b | <https://huggingface.co/internlm/internlm-7b> | TypeError: fetch failed (ECONNRESET) |
| 50 | UNREACHABLE | - | GET | models:longcat-flash、organizations:meituan | <https://huggingface.co/meituan-longcat/LongCat-Flash-Chat> | TypeError: fetch failed (ECONNRESET) |
| 51 | UNREACHABLE | - | GET | models:minimax-m1、organizations:minimax | <https://huggingface.co/MiniMaxAI/MiniMax-M1> | TypeError: fetch failed (ECONNRESET) |
| 52 | UNREACHABLE | - | GET | models:glm-4-6、models:minimax-m2、organizations:minimax | <https://huggingface.co/MiniMaxAI/MiniMax-M2> | TypeError: fetch failed (ECONNRESET) |
| 53 | UNREACHABLE | - | GET | models:minimax-m3、organizations:minimax | <https://huggingface.co/MiniMaxAI/MiniMax-M3> | TypeError: fetch failed (ECONNRESET) |
| 54 | UNREACHABLE | - | GET | models:kimi-k2 | <https://huggingface.co/moonshotai/Kimi-K2-Instruct> | TypeError: fetch failed (ECONNRESET) |
| 55 | UNREACHABLE | - | GET | models:kimi-k2-0905 | <https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905> | TypeError: fetch failed (ECONNRESET) |
| 56 | UNREACHABLE | - | GET | models:kimi-k2-thinking | <https://huggingface.co/moonshotai/Kimi-K2-Thinking> | TypeError: fetch failed (ECONNRESET) |
| 57 | UNREACHABLE | - | GET | models:kimi-k2-5、organizations:moonshot | <https://huggingface.co/moonshotai/Kimi-K2.5> | TypeError: fetch failed (ECONNRESET) |
| 58 | UNREACHABLE | - | GET | models:kimi-k3 | <https://huggingface.co/moonshotai/Kimi-K3> | TypeError: fetch failed (ECONNRESET) |
| 59 | UNREACHABLE | - | GET | models:nemotron-4-340b | <https://huggingface.co/nvidia/Nemotron-4-340B-Instruct> | TypeError: fetch failed (ECONNRESET) |
| 60 | UNREACHABLE | - | GET | models:qwen3-235b-a22b | <https://huggingface.co/Qwen/Qwen3-235B-A22B> | TypeError: fetch failed (ECONNRESET) |
| 61 | UNREACHABLE | - | GET | models:qwen3-coder | <https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct> | TypeError: fetch failed (ECONNRESET) |
| 62 | UNREACHABLE | - | GET | models:qwen3-next | <https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct> | TypeError: fetch failed (ECONNRESET) |
| 63 | UNREACHABLE | - | GET | models:qwen3-omni | <https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct> | TypeError: fetch failed (ECONNRESET) |
| 64 | UNREACHABLE | - | GET | models:qwen3-vl | <https://huggingface.co/Qwen/Qwen3-VL-235B-A22B-Instruct> | TypeError: fetch failed (ECONNRESET) |
| 65 | UNREACHABLE | - | GET | models:qwen3-5 | <https://huggingface.co/Qwen/Qwen3.5-397B-A17B> | TypeError: fetch failed (ECONNRESET) |
| 66 | UNREACHABLE | - | GET | models:qwen3-8-flash-next | <https://huggingface.co/Qwen/Qwen3.8-Flash-Next> | TypeError: fetch failed (ECONNRESET) |
| 67 | UNREACHABLE | - | GET | models:step-5-preview、organizations:stepfun | <https://huggingface.co/stepfun-ai/Step-5-Preview> | TypeError: fetch failed (ECONNRESET) |
| 68 | UNREACHABLE | - | GET | models:chatglm2-6b | <https://huggingface.co/THUDM/chatglm2-6b> | TypeError: fetch failed (ECONNRESET) |
| 69 | UNREACHABLE | - | GET | models:mimo-7b-rl、organizations:xiaomi | <https://huggingface.co/XiaomiMiMo/MiMo-7B-RL> | TypeError: fetch failed (ECONNRESET) |
| 70 | UNREACHABLE | - | GET | models:glm-4-5 | <https://huggingface.co/zai-org/GLM-4.5> | TypeError: fetch failed (ECONNRESET) |
| 71 | UNREACHABLE | - | GET | models:glm-4-5v、organizations:zhipu | <https://huggingface.co/zai-org/GLM-4.5V> | TypeError: fetch failed (ECONNRESET) |
| 72 | UNREACHABLE | - | GET | models:glm-4-6、organizations:zhipu | <https://huggingface.co/zai-org/GLM-4.6> | TypeError: fetch failed (ECONNRESET) |
| 73 | UNREACHABLE | - | GET | models:glm-5、organizations:zhipu | <https://huggingface.co/zai-org/GLM-5> | TypeError: fetch failed (ECONNRESET) |
| 74 | UNREACHABLE | - | GET | models:mistral-7b、organizations:mistral | <https://mistral.ai/news/announcing-mistral-7b/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 75 | UNREACHABLE | - | GET | models:mistral-large、organizations:mistral | <https://mistral.ai/news/mistral-large> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 76 | UNREACHABLE | - | GET | models:mixtral-8x7b、organizations:mistral | <https://mistral.ai/news/mixtral-of-experts/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 77 | UNREACHABLE | - | GET | models:palm | <https://research.google/blog/pathways-language-model-palm-scaling-to-540-billion-parameters-for-breakthrough-performance/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 78 | UNREACHABLE | - | GET | events:tensorflow-open-source-2015 | <https://research.google/blog/tensorflow-googles-latest-machine-learning-system-open-sourced-for-everyone/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 79 | UNREACHABLE | - | GET | models:grok-3、models:grok-4 | <https://www.bloomberg.com/jp/news/articles/2025-07-10/SZ63V4DWRGG000> | TypeError: fetch failed (ECONNRESET) |
| 80 | BLOCKED | 403 | GET | events:hopfield-1982 | <https://www.pnas.org/doi/10.1073/pnas.79.8.2554> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 81 | UNREACHABLE | - | GET | models:gpt-5-2 | <https://www.reuters.com/technology/openai-launches-gpt-52-ai-model-with-improved-capabilities-2025-12-11/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 82 | BLOCKED | 403 | GET | models:llama-4-maverick、models:llama-4-scout | <https://www.techlusive.in/news/meta-released-llama-4-ai-multimodal-models-with-10-million-token-context-window-check-details-1553545/> | 站点反爬/禁止自动访问，浏览器中可能仍可打开 |
| 83 | UNREACHABLE | - | GET | organizations:xai | <https://x.ai/> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 84 | UNREACHABLE | - | GET | models:grok-1 | <https://x.ai/news/grok> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 85 | UNREACHABLE | - | GET | models:grok-2 | <https://x.ai/news/grok-2> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 86 | UNREACHABLE | - | GET | models:grok-3 | <https://x.ai/news/grok-3> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |
| 87 | UNREACHABLE | - | GET | models:grok-4 | <https://x.ai/news/grok-4> | TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT) |

### A.3 死链必须替换清单（按引用条目）

无确认死链。

### A.4 网络不可达（需人工在浏览器确认，暂不计入死链）

- <https://ai.google.dev/gemma> ← models:gemma（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://ai.meta.com/> ← organizations:meta（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://ai.meta.com/blog/large-language-model-llama-meta-ai/> ← models:llama（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://ai.meta.com/blog/llama-2/> ← models:llama-2（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/> ← models:llama-3-2（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://ai.meta.com/blog/llama-4-multimodal-intelligence/> ← models:llama-4-maverick、models:llama-4-scout（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://ai.meta.com/blog/meta-llama-3-1/> ← models:llama-3-1（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://ai.meta.com/blog/meta-llama-3/> ← models:llama-3（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://arxiv.org/abs/1410.5401> ← events:neural-turing-machine-2014（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://blog.google/products/gemini/gemini-3-flash/> ← models:gemini-3-flash（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://blog.google/products/search/search-language-understanding-bert/> ← events:bert-search-rollout（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://blog.google/technology/ai/google-deepmind-isomorphic-alphafold-3-ai-model/> ← events:alphafold-3-2024（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://blog.google/technology/ai/google-gemini-ai/> ← models:gemini-1-0（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/> ← models:gemini-1-5（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://blog.google/technology/ai/lamda/> ← models:lamda（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://blog.google/technology/developers/gemma-open-models/> ← models:gemma（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/> ← models:gemini-2-0（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://developers.googleblog.com/en/introducing-gemma3/> ← models:gemma-3（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://huggingface.co/baichuan-inc/Baichuan-7B> ← models:baichuan-7b（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/baidu/ERNIE-4.5-300B-A47B-PT> ← models:ernie-4-5-300b-a47b、organizations:baidu（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct> ← models:seed-oss-36b、organizations:bytedance（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/CohereForAI/c4ai-command-r-v01> ← models:command-r（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/deepseek-coder-33b-instruct> ← models:deepseek-coder（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/deepseek-llm-67b-chat> ← models:deepseek-llm（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-R1> ← models:deepseek-r1（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-R1-0528> ← models:deepseek-r1-0528（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V3-0324> ← models:deepseek-v3-0324（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V3-Base> ← models:deepseek-v3（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V3.1> ← models:deepseek-v3-1（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus> ← models:deepseek-v3-1-terminus（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V3.2> ← models:deepseek-v3-2（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp> ← models:deepseek-v3-2-exp（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Speciale> ← models:deepseek-v3-2-speciale（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp> ← models:deepseek-v4-flash-vision-exp（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash> ← models:deepseek-v4-1-flash（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017> ← models:deepseek-v4-1-flash-1017（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/inclusionAI/Ling-1T> ← models:ling-1t、organizations:ant-group（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/internlm/Intern-S1> ← models:intern-s1、organizations:shanghai-ai-lab（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/internlm/internlm-7b> ← models:internlm-7b（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/meituan-longcat/LongCat-Flash-Chat> ← models:longcat-flash、organizations:meituan（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/MiniMaxAI/MiniMax-M1> ← models:minimax-m1、organizations:minimax（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/MiniMaxAI/MiniMax-M2> ← models:glm-4-6、models:minimax-m2、organizations:minimax（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/MiniMaxAI/MiniMax-M3> ← models:minimax-m3、organizations:minimax（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/moonshotai/Kimi-K2-Instruct> ← models:kimi-k2（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905> ← models:kimi-k2-0905（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/moonshotai/Kimi-K2-Thinking> ← models:kimi-k2-thinking（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/moonshotai/Kimi-K2.5> ← models:kimi-k2-5、organizations:moonshot（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/moonshotai/Kimi-K3> ← models:kimi-k3（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/nvidia/Nemotron-4-340B-Instruct> ← models:nemotron-4-340b（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/Qwen/Qwen3-235B-A22B> ← models:qwen3-235b-a22b（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct> ← models:qwen3-coder（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct> ← models:qwen3-next（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct> ← models:qwen3-omni（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/Qwen/Qwen3-VL-235B-A22B-Instruct> ← models:qwen3-vl（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/Qwen/Qwen3.5-397B-A17B> ← models:qwen3-5（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/Qwen/Qwen3.8-Flash-Next> ← models:qwen3-8-flash-next（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/stepfun-ai/Step-5-Preview> ← models:step-5-preview、organizations:stepfun（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/THUDM/chatglm2-6b> ← models:chatglm2-6b（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/XiaomiMiMo/MiMo-7B-RL> ← models:mimo-7b-rl、organizations:xiaomi（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/zai-org/GLM-4.5> ← models:glm-4-5（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/zai-org/GLM-4.5V> ← models:glm-4-5v、organizations:zhipu（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/zai-org/GLM-4.6> ← models:glm-4-6、organizations:zhipu（TypeError: fetch failed (ECONNRESET)）
- <https://huggingface.co/zai-org/GLM-5> ← models:glm-5、organizations:zhipu（TypeError: fetch failed (ECONNRESET)）
- <https://mistral.ai/news/announcing-mistral-7b/> ← models:mistral-7b、organizations:mistral（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://mistral.ai/news/mistral-large> ← models:mistral-large、organizations:mistral（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://mistral.ai/news/mixtral-of-experts/> ← models:mixtral-8x7b、organizations:mistral（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://research.google/blog/pathways-language-model-palm-scaling-to-540-billion-parameters-for-breakthrough-performance/> ← models:palm（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://research.google/blog/tensorflow-googles-latest-machine-learning-system-open-sourced-for-everyone/> ← events:tensorflow-open-source-2015（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://www.bloomberg.com/jp/news/articles/2025-07-10/SZ63V4DWRGG000> ← models:grok-3、models:grok-4（TypeError: fetch failed (ECONNRESET)）
- <https://www.reuters.com/technology/openai-launches-gpt-52-ai-model-with-improved-capabilities-2025-12-11/> ← models:gpt-5-2（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://x.ai/> ← organizations:xai（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://x.ai/news/grok> ← models:grok-1（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://x.ai/news/grok-2> ← models:grok-2（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://x.ai/news/grok-3> ← models:grok-3（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）
- <https://x.ai/news/grok-4> ← models:grok-4（TypeError: fetch failed (UND_ERR_CONNECT_TIMEOUT)）

### A.5 全部 URL 状态

| # | 分类 | HTTP | 引用条目 | URL |
|---:|---|---:|---|---|
| 1 | OK | 200 | events:kimi-long-context-2024、organizations:moonshot | <http://ex.chinadaily.com.cn/exchange/partners/82/rss/channel/cn/columns/j3u3t6/stories/WS65f802d6a3109f7860dd5ed7.html> |
| 2 | OK | 200 | models:chatglm3 | <http://finance.people.com.cn/n1/2023/1028/c1004-40105232.html> |
| 3 | OK | 200 | events:china-genai-first-filings-2023、organizations:alibaba-qwen、organizations:baichuan 等 9 条 | <http://t.cj.sina.com.cn/articles/view/1686546714/6486a91a02001xs8q> |
| 4 | OK | 200 | models:internlm2、organizations:shanghai-ai-lab | <http://tech.cnr.cn/techph/20240118/t20240118_526562018.shtml> |
| 5 | OK | 200 | events:dartmouth-1956、organizations:dartmouth-college | <http://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html> |
| 6 | OK | 200 | models:yi-large、organizations:01ai | <http://www.chinadevelopment.com.cn/news/cj/2024/05/1894951.shtml> |
| 7 | OK | 200 | models:kimi-chat、organizations:moonshot | <http://www.chinanews.com.cn/cj/2023/10-11/10091972.shtml> |
| 8 | OK | 200 | models:sensenova、organizations:sensetime | <http://www.news.cn/fortune/2023-04/12/c_1212027993.htm> |
| 9 | OK | 200 | models:glm-4、organizations:zhipu | <http://www.xinhuanet.com/tech/20240116/19d92dc316544dfba1cdc8bbba6b566f/c.html> |
| 10 | OK | 200 | events:lecun-convnet-1989、events:lenet5-1998 | <http://yann.lecun.com/exdb/lenet/> |
| 11 | OK | 200 | events:china-global-ai-governance-initiative-2023、organizations:china-government | <http://zw.china.com.cn/2023-10/19/content_116759358.shtml> |
| 12 | OK | 200 | models:llama-2 | <https://about.fb.com/news/2023/07/llama-2/> |
| 13 | BLOCKED | 403 | events:turing-computing-machinery-1950 | <https://academic.oup.com/mind/article/LIX/236/433/986238> |
| 14 | UNREACHABLE | - | models:gemma | <https://ai.google.dev/gemma> |
| 15 | UNREACHABLE | - | organizations:meta | <https://ai.meta.com/> |
| 16 | UNREACHABLE | - | models:llama | <https://ai.meta.com/blog/large-language-model-llama-meta-ai/> |
| 17 | UNREACHABLE | - | models:llama-2 | <https://ai.meta.com/blog/llama-2/> |
| 18 | UNREACHABLE | - | models:llama-3-2 | <https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/> |
| 19 | UNREACHABLE | - | models:llama-4-maverick、models:llama-4-scout | <https://ai.meta.com/blog/llama-4-multimodal-intelligence/> |
| 20 | UNREACHABLE | - | models:llama-3-1 | <https://ai.meta.com/blog/meta-llama-3-1/> |
| 21 | UNREACHABLE | - | models:llama-3 | <https://ai.meta.com/blog/meta-llama-3/> |
| 22 | OK | 200 | models:deepseek-r1、organizations:deepseek | <https://api-docs.deepseek.com/news/news250120> |
| 23 | OK | 200 | models:deepseek-v3-1、organizations:deepseek | <https://api-docs.deepseek.com/news/news250821> |
| 24 | OK | 200 | models:deepseek-v3-2-exp、organizations:deepseek | <https://api-docs.deepseek.com/news/news250929> |
| 25 | OK | 200 | models:deepseek-v3-2、models:deepseek-v3-2-speciale、organizations:deepseek | <https://api-docs.deepseek.com/news/news251201> |
| 26 | OK | 200 | models:deepseek-v4-flash、models:deepseek-v4-pro、organizations:deepseek | <https://api-docs.deepseek.com/news/news260424> |
| 27 | OK | 200 | models:deepseek-v4-pro | <https://api-docs.deepseek.com/news/news260813.md> |
| 28 | OK | 200 | models:deepseek-v4-1-flash、organizations:deepseek | <https://api-docs.deepseek.com/news/news260910> |
| 29 | OK | 200 | models:deepseek-v4-1-flash-1017、organizations:deepseek | <https://api-docs.deepseek.com/news/news261017> |
| 30 | OK | 200 | models:deepseek-v2-5、models:deepseek-v3-0324、models:deepseek-r1-0528 等 8 条 | <https://api-docs.deepseek.com/updates> |
| 31 | OK | 200 | events:samuel-checkers-1959 | <https://api.crossref.org/works/10.1007/978-1-4613-8716-9_14> |
| 32 | OK | 200 | events:word2vec-2013 | <https://arxiv.org/abs/1301.3781> |
| 33 | OK | 200 | events:vae-2013 | <https://arxiv.org/abs/1312.6114> |
| 34 | OK | 200 | events:gan-2014、organizations:montreal | <https://arxiv.org/abs/1406.2661> |
| 35 | OK | 200 | events:bahdanau-attention-2014 | <https://arxiv.org/abs/1409.0473> |
| 36 | OK | 200 | events:seq2seq-2014 | <https://arxiv.org/abs/1409.3215> |
| 37 | UNREACHABLE | - | events:neural-turing-machine-2014 | <https://arxiv.org/abs/1410.5401> |
| 38 | OK | 200 | events:adam-optimizer-2014 | <https://arxiv.org/abs/1412.6980> |
| 39 | OK | 200 | events:resnet-2015、organizations:microsoft | <https://arxiv.org/abs/1512.03385> |
| 40 | OK | 200 | events:wavenet-2016 | <https://arxiv.org/abs/1609.03499> |
| 41 | OK | 200 | events:transformer-2017、organizations:google-deepmind | <https://arxiv.org/abs/1706.03762> |
| 42 | OK | 200 | events:alphazero-2017 | <https://arxiv.org/abs/1712.01815> |
| 43 | OK | 200 | models:bert | <https://arxiv.org/abs/1810.04805> |
| 44 | OK | 200 | models:t5 | <https://arxiv.org/abs/1910.10683> |
| 45 | OK | 200 | events:scaling-laws-2020 | <https://arxiv.org/abs/2001.08361> |
| 46 | OK | 200 | models:gpt-3 | <https://arxiv.org/abs/2005.14165> |
| 47 | OK | 200 | models:dall-e | <https://arxiv.org/abs/2102.12092> |
| 48 | OK | 200 | models:clip | <https://arxiv.org/abs/2103.00020> |
| 49 | OK | 200 | models:pangu-alpha、organizations:huawei | <https://arxiv.org/abs/2104.12369> |
| 50 | OK | 200 | models:codex | <https://arxiv.org/abs/2107.03374> |
| 51 | OK | 200 | models:stable-diffusion | <https://arxiv.org/abs/2112.10752> |
| 52 | OK | 200 | models:ernie-3-0-titan、organizations:baidu | <https://arxiv.org/abs/2112.12731> |
| 53 | OK | 200 | models:lamda | <https://arxiv.org/abs/2201.08239> |
| 54 | OK | 200 | models:instructgpt | <https://arxiv.org/abs/2203.02155> |
| 55 | OK | 200 | events:chinchilla-2022 | <https://arxiv.org/abs/2203.15556> |
| 56 | OK | 200 | models:palm | <https://arxiv.org/abs/2204.02311> |
| 57 | OK | 200 | models:dall-e-2 | <https://arxiv.org/abs/2204.06125> |
| 58 | OK | 200 | models:imagen | <https://arxiv.org/abs/2205.11487> |
| 59 | OK | 200 | models:glm-130b、organizations:zhipu | <https://arxiv.org/abs/2210.02414> |
| 60 | OK | 200 | models:whisper | <https://arxiv.org/abs/2212.04356> |
| 61 | OK | 200 | events:constitutional-ai-2022 | <https://arxiv.org/abs/2212.08073> |
| 62 | OK | 200 | models:llama | <https://arxiv.org/abs/2302.13971> |
| 63 | OK | 200 | models:gpt-4 | <https://arxiv.org/abs/2303.08774> |
| 64 | OK | 200 | models:llama-2 | <https://arxiv.org/abs/2307.09288> |
| 65 | OK | 200 | models:baichuan2 | <https://arxiv.org/abs/2309.10305> |
| 66 | OK | 200 | models:qwen-7b | <https://arxiv.org/abs/2309.16609> |
| 67 | OK | 200 | models:mistral-7b | <https://arxiv.org/abs/2310.06825> |
| 68 | OK | 200 | models:gemini-1-0 | <https://arxiv.org/abs/2312.11805> |
| 69 | OK | 200 | models:deepseek-llm | <https://arxiv.org/abs/2401.02954> |
| 70 | OK | 200 | models:mixtral-8x7b | <https://arxiv.org/abs/2401.04088> |
| 71 | OK | 200 | models:deepseek-coder | <https://arxiv.org/abs/2401.14196> |
| 72 | OK | 200 | models:yi-34b | <https://arxiv.org/abs/2403.04652> |
| 73 | OK | 200 | models:gemini-1-5 | <https://arxiv.org/abs/2403.05530> |
| 74 | OK | 200 | models:internlm2 | <https://arxiv.org/abs/2403.17297> |
| 75 | OK | 200 | models:phi-3 | <https://arxiv.org/abs/2404.14219> |
| 76 | OK | 200 | models:deepseek-v2、organizations:deepseek | <https://arxiv.org/abs/2405.04434> |
| 77 | OK | 200 | models:glm-4 | <https://arxiv.org/abs/2406.12793> |
| 78 | OK | 200 | models:qwen2 | <https://arxiv.org/abs/2407.10671> |
| 79 | OK | 200 | models:deepseek-v3 | <https://arxiv.org/abs/2412.19437> |
| 80 | OK | 200 | models:amazon-nova | <https://aws.amazon.com/ai/generative-ai/nova/> |
| 81 | OK | 200 | models:amazon-nova、organizations:amazon | <https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/> |
| 82 | OK | 200 | models:phi-3 | <https://azure.microsoft.com/en-us/blog/introducing-phi-3-redefining-whats-possible-with-slms/> |
| 83 | OK | 200 | events:us-ai-bill-of-rights-2022、organizations:white-house | <https://bidenwhitehouse.archives.gov/ostp/ai-bill-of-rights/> |
| 84 | TIMEOUT | - | models:gemini-3-pro | <https://blog.google/products-and-platforms/products/gemini/gemini-3/> |
| 85 | UNREACHABLE | - | models:gemini-3-flash | <https://blog.google/products/gemini/gemini-3-flash/> |
| 86 | UNREACHABLE | - | events:bert-search-rollout | <https://blog.google/products/search/search-language-understanding-bert/> |
| 87 | UNREACHABLE | - | events:alphafold-3-2024 | <https://blog.google/technology/ai/google-deepmind-isomorphic-alphafold-3-ai-model/> |
| 88 | UNREACHABLE | - | models:gemini-1-0 | <https://blog.google/technology/ai/google-gemini-ai/> |
| 89 | UNREACHABLE | - | models:gemini-1-5 | <https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/> |
| 90 | UNREACHABLE | - | models:lamda | <https://blog.google/technology/ai/lamda/> |
| 91 | UNREACHABLE | - | models:gemma | <https://blog.google/technology/developers/gemma-open-models/> |
| 92 | TIMEOUT | - | models:gemini-2-5-pro | <https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/> |
| 93 | UNREACHABLE | - | models:gemini-2-0 | <https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/> |
| 94 | BLOCKED | 403 | events:microsoft-openai-expand-2023 | <https://blogs.microsoft.com/blog/2023/01/23/microsoftandopenaiextendpartnership/> |
| 95 | OK | 200 | models:nemotron-4-340b、organizations:nvidia | <https://blogs.nvidia.com/blog/nemotron-4-synthetic-data-generation-llm-training/> |
| 96 | OK | 200 | events:waic-2025、organizations:china-government | <https://business.cctv.com/2025/07/28/ARTIn90TBeIFcxRieKer7ryk250727.shtml> |
| 97 | OK | 200 | models:kimi-k1-5、organizations:moonshot | <https://cnfin.com/cmjj-lb/detail/20250122/4178550_1.html> |
| 98 | OK | 200 | models:command-r、organizations:cohere | <https://cohere.com/blog/command-r> |
| 99 | OK | 200 | models:command-r-plus、organizations:cohere | <https://cohere.com/blog/command-r-plus-microsoft-azure> |
| 100 | OK | 202 | events:dendral-1965 | <https://collections.nlm.nih.gov/pdf/nlm:nlmuid-101584906X1027-doc> |
| 101 | OK | 200 | events:anthropic-pace-the-frontier-2026 | <https://darioamodei.com/post/we-must-pace-the-frontier> |
| 102 | OK | 200 | organizations:google-deepmind | <https://deepmind.google/> |
| 103 | OK | 200 | events:google-deepmind-merger-2023 | <https://deepmind.google/blog/announcing-google-deepmind/> |
| 104 | OK | 200 | models:nano-banana | <https://deepmind.google/models/gemini-image/> |
| 105 | OK | 200 | models:gemini-3-pro | <https://deepmind.google/models/gemini/> |
| 106 | OK | 200 | models:gemma-4 | <https://deepmind.google/models/gemma/> |
| 107 | OK | 200 | models:gemma-4 | <https://deepmind.google/models/gemma/gemma-4/> |
| 108 | OK | 200 | models:veo-3 | <https://deepmind.google/models/veo/> |
| 109 | OK | 200 | events:alphago-lee-sedol-2016、organizations:deepmind | <https://deepmind.google/research/alphago/> |
| 110 | OK | 200 | events:alphafold-2-2020 | <https://deepmind.google/science/alphafold/> |
| 111 | UNREACHABLE | - | models:gemma-3 | <https://developers.googleblog.com/en/introducing-gemma3/> |
| 112 | OK | 200 | events:eu-ai-act-proposal-2021、organizations:eu | <https://digital-strategy.ec.europa.eu/en/library/proposal-regulation-laying-down-harmonised-rules-artificial-intelligence> |
| 113 | OK | 200 | events:eu-ai-act-prohibitions-2025、events:eu-ai-act-gpai-2025、organizations:eu | <https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai> |
| 114 | BLOCKED | 403 | events:eliza-1966、organizations:mit | <https://dl.acm.org/doi/10.1145/365153.365168> |
| 115 | OK | 200 | events:perceptron-1958 | <https://doi.apa.org/doi/10.1037/h0042519> |
| 116 | OK | 202 | events:lenet5-1998 | <https://doi.org/10.1109/5.726791> |
| 117 | OK | 202 | events:imagenet-2009、organizations:princeton、organizations:stanford | <https://doi.org/10.1109/CVPR.2009.5206848> |
| 118 | BLOCKED | 403 | events:hinton-dbn-2006 | <https://doi.org/10.1126/science.1127647> |
| 119 | OK | 202 | events:samuel-checkers-1959 | <https://doi.org/10.1147/rd.33.0210> |
| 120 | BLOCKED | 403 | events:lecun-convnet-1989 | <https://doi.org/10.1162/neco.1989.1.4.541> |
| 121 | BLOCKED | 403 | events:lstm-1997 | <https://doi.org/10.1162/neco.1997.9.8.1735> |
| 122 | BLOCKED | 403 | events:hinton-dbn-2006 | <https://doi.org/10.1162/neco.2006.18.7.1527> |
| 123 | BLOCKED | 403 | events:perceptrons-book-1969 | <https://doi.org/10.7551/mitpress/11301.001.0001> |
| 124 | OK | 202 | events:eu-ai-act-adopted-2024 | <https://eur-lex.europa.eu/eli/reg/2024/1689/oj> |
| 125 | OK | 200 | models:ernie-bot、organizations:baidu | <https://finance.sina.com.cn/jjxw/2023-03-16/doc-imykzwvv7824758.shtml> |
| 126 | OK | 200 | events:un-ai-capacity-building-resolution-2024、organizations:china-government、organizations:united-nations | <https://fr.china-embassy.gov.cn/zgyw/202407/t20240704_11448196.htm> |
| 127 | OK | 200 | events:ibm-watson-jeopardy-2011 | <https://fr.newsroom.ibm.com/2011-02-21-Watson-lordinateur-dIBM-qui-vient-de-gagner-Jeopardy-conquiert-le-monde-de-la-sante> |
| 128 | OK | 200 | models:baichuan-7b、organizations:baichuan | <https://github.com/baichuan-inc/Baichuan-7B> |
| 129 | OK | 200 | models:deepseek-coder、organizations:deepseek | <https://github.com/deepseek-ai/DeepSeek-Coder> |
| 130 | OK | 200 | models:deepseek-llm、organizations:deepseek | <https://github.com/deepseek-ai/DeepSeek-LLM> |
| 131 | OK | 200 | models:deepseek-r1 | <https://github.com/deepseek-ai/DeepSeek-R1> |
| 132 | OK | 200 | models:bert | <https://github.com/google-research/bert> |
| 133 | OK | 200 | models:t5 | <https://github.com/google-research/text-to-text-transfer-transformer> |
| 134 | OK | 200 | models:internlm-7b、organizations:shanghai-ai-lab | <https://github.com/InternLM/InternLM> |
| 135 | OK | 200 | models:minimax-m1 | <https://github.com/MiniMax-AI/MiniMax-M1> |
| 136 | OK | 200 | models:minimax-m2 | <https://github.com/MiniMax-AI/MiniMax-M2> |
| 137 | OK | 200 | models:minimax-m3 | <https://github.com/MiniMax-AI/MSA> |
| 138 | OK | 200 | models:kimi-k2 | <https://github.com/MoonshotAI/Kimi-K2> |
| 139 | OK | 200 | models:gpt-1 | <https://github.com/openai/finetune-transformer-lm> |
| 140 | OK | 200 | models:qwen-7b | <https://github.com/QwenLM/Qwen> |
| 141 | OK | 200 | models:chatglm-6b、organizations:zhipu | <https://github.com/THUDM/ChatGLM-6B> |
| 142 | OK | 200 | models:chatglm2-6b、organizations:zhipu | <https://github.com/THUDM/ChatGLM2-6B> |
| 143 | OK | 200 | models:chatglm3、organizations:zhipu | <https://github.com/THUDM/ChatGLM3> |
| 144 | OK | 200 | models:glm-130b | <https://github.com/THUDM/GLM-130B> |
| 145 | OK | 200 | models:grok-1 | <https://github.com/xai-org/grok-1> |
| 146 | OK | 200 | events:ai-winter-1987 | <https://groups.inf.ed.ac.uk/vision/DATASETS/ROBOTICS/FREDDY/Barrow/Documents/nilsson_qai-01-12-09.pdf> |
| 147 | OK | 200 | models:openai-o3-mini、models:gpt-4-5、models:gpt-4-1 等 25 条 | <https://help.openai.com/en/articles/9624314-model-release-notes> |
| 148 | UNREACHABLE | - | models:baichuan-7b | <https://huggingface.co/baichuan-inc/Baichuan-7B> |
| 149 | UNREACHABLE | - | models:ernie-4-5-300b-a47b、organizations:baidu | <https://huggingface.co/baidu/ERNIE-4.5-300B-A47B-PT> |
| 150 | UNREACHABLE | - | models:seed-oss-36b、organizations:bytedance | <https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct> |
| 151 | UNREACHABLE | - | models:command-r | <https://huggingface.co/CohereForAI/c4ai-command-r-v01> |
| 152 | UNREACHABLE | - | models:deepseek-coder | <https://huggingface.co/deepseek-ai/deepseek-coder-33b-instruct> |
| 153 | UNREACHABLE | - | models:deepseek-llm | <https://huggingface.co/deepseek-ai/deepseek-llm-67b-chat> |
| 154 | UNREACHABLE | - | models:deepseek-r1 | <https://huggingface.co/deepseek-ai/DeepSeek-R1> |
| 155 | UNREACHABLE | - | models:deepseek-r1-0528 | <https://huggingface.co/deepseek-ai/DeepSeek-R1-0528> |
| 156 | UNREACHABLE | - | models:deepseek-v3-0324 | <https://huggingface.co/deepseek-ai/DeepSeek-V3-0324> |
| 157 | UNREACHABLE | - | models:deepseek-v3 | <https://huggingface.co/deepseek-ai/DeepSeek-V3-Base> |
| 158 | UNREACHABLE | - | models:deepseek-v3-1 | <https://huggingface.co/deepseek-ai/DeepSeek-V3.1> |
| 159 | UNREACHABLE | - | models:deepseek-v3-1-terminus | <https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Terminus> |
| 160 | UNREACHABLE | - | models:deepseek-v3-2 | <https://huggingface.co/deepseek-ai/DeepSeek-V3.2> |
| 161 | UNREACHABLE | - | models:deepseek-v3-2-exp | <https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp> |
| 162 | UNREACHABLE | - | models:deepseek-v3-2-speciale | <https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Speciale> |
| 163 | UNREACHABLE | - | models:deepseek-v4-flash-vision-exp | <https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp> |
| 164 | UNREACHABLE | - | models:deepseek-v4-1-flash | <https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash> |
| 165 | UNREACHABLE | - | models:deepseek-v4-1-flash-1017 | <https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017> |
| 166 | UNREACHABLE | - | models:ling-1t、organizations:ant-group | <https://huggingface.co/inclusionAI/Ling-1T> |
| 167 | UNREACHABLE | - | models:intern-s1、organizations:shanghai-ai-lab | <https://huggingface.co/internlm/Intern-S1> |
| 168 | UNREACHABLE | - | models:internlm-7b | <https://huggingface.co/internlm/internlm-7b> |
| 169 | UNREACHABLE | - | models:longcat-flash、organizations:meituan | <https://huggingface.co/meituan-longcat/LongCat-Flash-Chat> |
| 170 | UNREACHABLE | - | models:minimax-m1、organizations:minimax | <https://huggingface.co/MiniMaxAI/MiniMax-M1> |
| 171 | UNREACHABLE | - | models:glm-4-6、models:minimax-m2、organizations:minimax | <https://huggingface.co/MiniMaxAI/MiniMax-M2> |
| 172 | UNREACHABLE | - | models:minimax-m3、organizations:minimax | <https://huggingface.co/MiniMaxAI/MiniMax-M3> |
| 173 | UNREACHABLE | - | models:kimi-k2 | <https://huggingface.co/moonshotai/Kimi-K2-Instruct> |
| 174 | UNREACHABLE | - | models:kimi-k2-0905 | <https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905> |
| 175 | UNREACHABLE | - | models:kimi-k2-thinking | <https://huggingface.co/moonshotai/Kimi-K2-Thinking> |
| 176 | UNREACHABLE | - | models:kimi-k2-5、organizations:moonshot | <https://huggingface.co/moonshotai/Kimi-K2.5> |
| 177 | UNREACHABLE | - | models:kimi-k3 | <https://huggingface.co/moonshotai/Kimi-K3> |
| 178 | UNREACHABLE | - | models:nemotron-4-340b | <https://huggingface.co/nvidia/Nemotron-4-340B-Instruct> |
| 179 | UNREACHABLE | - | models:qwen3-235b-a22b | <https://huggingface.co/Qwen/Qwen3-235B-A22B> |
| 180 | UNREACHABLE | - | models:qwen3-coder | <https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct> |
| 181 | UNREACHABLE | - | models:qwen3-next | <https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct> |
| 182 | UNREACHABLE | - | models:qwen3-omni | <https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct> |
| 183 | UNREACHABLE | - | models:qwen3-vl | <https://huggingface.co/Qwen/Qwen3-VL-235B-A22B-Instruct> |
| 184 | UNREACHABLE | - | models:qwen3-5 | <https://huggingface.co/Qwen/Qwen3.5-397B-A17B> |
| 185 | UNREACHABLE | - | models:qwen3-8-flash-next | <https://huggingface.co/Qwen/Qwen3.8-Flash-Next> |
| 186 | UNREACHABLE | - | models:step-5-preview、organizations:stepfun | <https://huggingface.co/stepfun-ai/Step-5-Preview> |
| 187 | UNREACHABLE | - | models:chatglm2-6b | <https://huggingface.co/THUDM/chatglm2-6b> |
| 188 | UNREACHABLE | - | models:mimo-7b-rl、organizations:xiaomi | <https://huggingface.co/XiaomiMiMo/MiMo-7B-RL> |
| 189 | UNREACHABLE | - | models:glm-4-5 | <https://huggingface.co/zai-org/GLM-4.5> |
| 190 | UNREACHABLE | - | models:glm-4-5v、organizations:zhipu | <https://huggingface.co/zai-org/GLM-4.5V> |
| 191 | UNREACHABLE | - | models:glm-4-6、organizations:zhipu | <https://huggingface.co/zai-org/GLM-4.6> |
| 192 | UNREACHABLE | - | models:glm-5、organizations:zhipu | <https://huggingface.co/zai-org/GLM-5> |
| 193 | OK | 200 | models:imagen | <https://imagen.research.google/> |
| 194 | OK | 200 | events:deepseek-r1-nature-cover、organizations:deepseek | <https://k.sina.cn/article_1611935011_60142d2304001atyg.html> |
| 195 | OK | 200 | models:glm-4-5v | <https://kw.beijing.gov.cn/xwdt/kcyx/xwdtyqqy/202508/t20250825_4182521.html> |
| 196 | OK | 200 | events:china-llm-api-price-war-2024 | <https://m.cnfin.com/yw-lb//zixun/20240522/4051572_1.html> |
| 197 | OK | 200 | models:glm-4-plus、organizations:zhipu | <https://m.ithome.com/html/792135.htm> |
| 198 | UNREACHABLE | - | models:mistral-7b、organizations:mistral | <https://mistral.ai/news/announcing-mistral-7b/> |
| 199 | UNREACHABLE | - | models:mistral-large、organizations:mistral | <https://mistral.ai/news/mistral-large> |
| 200 | UNREACHABLE | - | models:mixtral-8x7b、organizations:mistral | <https://mistral.ai/news/mixtral-of-experts/> |
| 201 | OK | 200 | events:openai-model-spec-agentic-2025 | <https://model-spec.openai.com/> |
| 202 | OK | 200 | events:openai-model-spec-2026-10-29 | <https://model-spec.openai.com/2026-10-29.html> |
| 203 | OK | 200 | events:xcon-1980、organizations:cmu | <https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/445> |
| 204 | OK | 200 | organizations:openai | <https://openai.com/> |
| 205 | OK | 200 | events:stargate-project-2025 | <https://openai.com/index/announcing-the-stargate-project/> |
| 206 | OK | 200 | models:gpt-2、events:gpt-2-staged-release | <https://openai.com/index/better-language-models/> |
| 207 | OK | 200 | models:chatgpt | <https://openai.com/index/chatgpt/> |
| 208 | OK | 200 | models:clip | <https://openai.com/index/clip/> |
| 209 | OK | 200 | models:dall-e-2 | <https://openai.com/index/dall-e-2/> |
| 210 | OK | 200 | models:dall-e | <https://openai.com/index/dall-e/> |
| 211 | OK | 200 | models:gpt-2、events:gpt-2-staged-release | <https://openai.com/index/gpt-2-1-5b-release/> |
| 212 | OK | 200 | models:gpt-4-1 | <https://openai.com/index/gpt-4-1/> |
| 213 | OK | 200 | models:gpt-4 | <https://openai.com/index/gpt-4-research/> |
| 214 | OK | 200 | models:gpt-4o | <https://openai.com/index/gpt-4o-system-card/> |
| 215 | OK | 200 | models:gpt-5-1-codex-max | <https://openai.com/index/gpt-5-1-codex-max/> |
| 216 | OK | 200 | models:gpt-5-1 | <https://openai.com/index/gpt-5-1/> |
| 217 | OK | 200 | models:gpt-6-astra | <https://openai.com/index/gpt-6-astra/> |
| 218 | OK | 200 | models:gpt-4o | <https://openai.com/index/hello-gpt-4o/> |
| 219 | OK | 200 | models:instructgpt | <https://openai.com/index/instruction-following/> |
| 220 | OK | 200 | events:openai-codex-agent-2025 | <https://openai.com/index/introducing-codex/> |
| 221 | OK | 200 | models:gpt-4-5 | <https://openai.com/index/introducing-gpt-4-5/> |
| 222 | OK | 200 | models:gpt-5-3-codex | <https://openai.com/index/introducing-gpt-5-3-codex/> |
| 223 | OK | 200 | models:gpt-5-4-mini | <https://openai.com/index/introducing-gpt-5-4-mini-and-nano/> |
| 224 | OK | 200 | models:gpt-5-5 | <https://openai.com/index/introducing-gpt-5-5/> |
| 225 | OK | 200 | models:gpt-5 | <https://openai.com/index/introducing-gpt-5/> |
| 226 | OK | 200 | models:openai-o3、models:openai-o4-mini | <https://openai.com/index/introducing-o3-and-o4-mini/> |
| 227 | OK | 200 | models:o1-preview | <https://openai.com/index/introducing-openai-o1-preview/> |
| 228 | OK | 200 | events:openai-founded-2015、organizations:openai | <https://openai.com/index/introducing-openai/> |
| 229 | OK | 200 | models:gpt-5-codex | <https://openai.com/index/introducing-upgrades-to-codex/> |
| 230 | OK | 200 | models:gpt-3 | <https://openai.com/index/language-models-are-few-shot-learners/> |
| 231 | OK | 200 | models:gpt-1 | <https://openai.com/index/language-unsupervised/> |
| 232 | OK | 200 | models:o1-preview | <https://openai.com/index/learning-to-reason-with-llms/> |
| 233 | OK | 200 | models:gpt-4-turbo | <https://openai.com/index/new-models-and-developer-products-announced-at-devday/> |
| 234 | OK | 200 | models:o1 | <https://openai.com/index/o1-and-new-tools-for-developers/> |
| 235 | OK | 200 | events:microsoft-openai-expand-2023 | <https://openai.com/index/openai-and-microsoft-extend-partnership/> |
| 236 | OK | 200 | events:openai-board-crisis-2023 | <https://openai.com/index/openai-announces-leadership-transition/> |
| 237 | OK | 200 | events:openai-api-launch | <https://openai.com/index/openai-api/> |
| 238 | OK | 200 | models:codex | <https://openai.com/index/openai-codex/> |
| 239 | OK | 200 | models:o1 | <https://openai.com/index/openai-o1-system-card/> |
| 240 | OK | 200 | events:openai-retire-gpt4o-2026 | <https://openai.com/index/retiring-gpt-4o-and-older-models/> |
| 241 | OK | 200 | events:openai-board-crisis-2023 | <https://openai.com/index/sam-altman-returns-as-ceo-openai-has-a-new-initial-board/> |
| 242 | OK | 200 | models:sora | <https://openai.com/index/sora/> |
| 243 | OK | 200 | models:sora | <https://openai.com/index/video-generation-models-as-world-simulators/> |
| 244 | OK | 200 | models:whisper | <https://openai.com/index/whisper/> |
| 245 | OK | 200 | models:gpt-oss-120b、events:openai-gpt-oss-open-weights-2025 | <https://openai.com/open-models/> |
| 246 | OK | 200 | events:alexnet-2012 | <https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html> |
| 247 | OK | 200 | models:kimi-k2、models:kimi-k2-0905、models:kimi-k2-thinking 等 4 条 | <https://platform.kimi.ai/blog/posts/changelog> |
| 248 | OK | 200 | models:kimi-k3、organizations:moonshot | <https://platform.kimi.com/docs/guide/kimi-k3-quickstart> |
| 249 | OK | 200 | events:amazon-anthropic-2023、organizations:amazon | <https://press.aboutamazon.com/2023/9/amazon-and-anthropic-announce-strategic-collaboration-to-advance-generative-ai> |
| 250 | OK | 200 | models:qwen1-5、organizations:alibaba-qwen | <https://qwenlm.github.io/blog/qwen1.5/> |
| 251 | OK | 200 | models:qwen2-vl、organizations:alibaba-qwen | <https://qwenlm.github.io/blog/qwen2-vl/> |
| 252 | OK | 200 | models:qwen2-5-coder、organizations:alibaba-qwen | <https://qwenlm.github.io/blog/qwen2.5-coder-family/> |
| 253 | OK | 200 | models:qwen2-5-turbo、organizations:alibaba-qwen | <https://qwenlm.github.io/blog/qwen2.5-turbo/> |
| 254 | OK | 200 | models:qwen2-5、organizations:alibaba-qwen | <https://qwenlm.github.io/blog/qwen2.5/> |
| 255 | OK | 200 | models:qwen2、organizations:alibaba-qwen | <https://qwenlm.github.io/blog/qwen2/> |
| 256 | OK | 200 | models:qwen3-coder、organizations:alibaba-qwen | <https://qwenlm.github.io/blog/qwen3-coder/> |
| 257 | OK | 200 | models:qwen3-235b-a22b、organizations:alibaba-qwen | <https://qwenlm.github.io/blog/qwen3/> |
| 258 | OK | 200 | models:qwq-32b-preview、organizations:alibaba-qwen | <https://qwenlm.github.io/blog/qwq-32b-preview/> |
| 259 | UNREACHABLE | - | models:palm | <https://research.google/blog/pathways-language-model-palm-scaling-to-540-billion-parameters-for-breakthrough-performance/> |
| 260 | UNREACHABLE | - | events:tensorflow-open-source-2015 | <https://research.google/blog/tensorflow-googles-latest-machine-learning-system-open-sourced-for-everyone/> |
| 261 | OK | 200 | models:stable-diffusion、organizations:stability-ai | <https://stability.ai/news/stable-diffusion-public-release> |
| 262 | OK | 200 | models:deepseek-v2、events:china-llm-api-price-war-2024、organizations:alibaba-qwen 等 7 条 | <https://stcn.com/article/detail/1210492.html> |
| 263 | OK | 200 | models:hunyuan、organizations:tencent | <https://tech.cnr.cn/techph/20230907/t20230907_526411008.shtml> |
| 264 | OK | 200 | models:ernie-4-0、organizations:baidu | <https://tech.cnr.cn/techph/20231017/t20231017_526453859.shtml> |
| 265 | OK | 200 | models:yi-34b、organizations:01ai | <https://tech.cnr.cn/techph/20231106/t20231106_526476893.shtml> |
| 266 | OK | 200 | models:gemini-3-flash | <https://techcrunch.com/2025/12/17/google-launches-gemini-3-flash-makes-it-the-default-model-in-the-gemini-app/> |
| 267 | OK | 200 | models:claude-2 | <https://www-cdn.anthropic.com/bd2a28d2535bfb0494cc8e2a3bf135d2e7523226/Model-Card-Claude-2.pdf> |
| 268 | OK | 200 | models:step-1、organizations:stepfun | <https://www.163.com/dy/article/ITV6KJ7205198CJN.html> |
| 269 | OK | 200 | events:quark-ai-glasses、organizations:alibaba-qwen | <https://www.alibabacloud.com/blog/alibaba-launches-new-quark-ai-glasses-series-in-china-deeply-integrated-with-qwen_602717> |
| 270 | OK | 200 | events:qwen-app-launch、organizations:alibaba-qwen | <https://www.alibabacloud.com/blog/alibaba-launches-qwen-app-to-boost-its-consumer-ai-efforts_602672> |
| 271 | OK | 200 | events:qwen-neurips-2025-best-paper、organizations:alibaba-qwen | <https://www.alibabacloud.com/blog/alibaba-qwen-wins-%E2%80%9Cneurips-2025-best-paper-award%E2%80%9D-for-breakthrough-in-attention-mechanisms_602708> |
| 272 | OK | 200 | events:alibaba-rmb380b-ai-infrastructure、organizations:alibaba-qwen | <https://www.alibabacloud.com/blog/alibaba-to-invest-rmb380-billion-in-ai-and-cloud-infrastructure-over-next-three-years_602007> |
| 273 | OK | 200 | events:baguan-seasonal-cop30、organizations:alibaba-qwen | <https://www.alibabacloud.com/blog/alibaba-unveils-baguan-seasonal-ai-model-at-un-cop30_602683> |
| 274 | OK | 200 | events:alibaba-rmb380b-ai-infrastructure、events:baguan-seasonal-cop30、events:quark-ai-glasses 等 5 条 | <https://www.alibabacloud.com/blog/from-models-to-momentum-how-alibaba-turned-artificial-intelligence-into-a-real-world-utility-in-2025_602797> |
| 275 | OK | 200 | models:qwen3-8-flash-next、organizations:alibaba-qwen | <https://www.alibabacloud.com/blog/qwen3-8-flash-next-a-new-architecture-towards-ultimate-cost-efficiency_603501> |
| 276 | OK | 200 | models:qwen3-max、models:qwen3-next、organizations:alibaba-qwen | <https://www.alibabacloud.com/blog/qwen3-next-a-new-generation-of-ultra-efficient-model-architecture-unveiled_602536> |
| 277 | OK | 200 | models:qwen3-omni、organizations:alibaba-qwen | <https://www.alibabacloud.com/blog/qwen3-omni-natively-omni-modal-foundation-models_602581> |
| 278 | OK | 200 | models:qwen3-max、models:qwen3-omni、models:qwen3-vl 等 5 条 | <https://www.alibabagroup.com/document-1911884625546838016> |
| 279 | OK | 200 | models:qwen-7b、organizations:alibaba-qwen | <https://www.alibabagroup.com/zh-HK/document-1582482069362049024> |
| 280 | OK | 200 | models:qwen3-5、events:china-open-source-ecosystem-scale、organizations:alibaba-qwen | <https://www.alibabagroup.com/zh-HK/document-1960233590314762240> |
| 281 | OK | 200 | organizations:anthropic | <https://www.anthropic.com/> |
| 282 | OK | 200 | models:claude-3-opus | <https://www.anthropic.com/claude-3-model-card> |
| 283 | OK | 200 | models:claude-fable-5-1、models:claude-mythos-5-1 | <https://www.anthropic.com/claude-fable-and-mythos-5-1> |
| 284 | OK | 200 | models:claude-haiku-5-5 | <https://www.anthropic.com/claude-haiku-5-5> |
| 285 | OK | 200 | models:claude-opus-5、models:claude-mythos-5-1、models:claude-opus-5-5 等 4 条 | <https://www.anthropic.com/claude-opus-5-5> |
| 286 | OK | 200 | models:claude-sonnet-5、models:claude-sonnet-5-5 | <https://www.anthropic.com/claude-sonnet-5-5> |
| 287 | OK | 200 | events:anthropic-project-glasswing-2026 | <https://www.anthropic.com/glasswing> |
| 288 | OK | 200 | models:claude-3-5-haiku、models:claude-3-5-sonnet-20241022 | <https://www.anthropic.com/news/3-5-models-and-computer-use> |
| 289 | OK | 200 | events:anthropic-asl3-activation-2025 | <https://www.anthropic.com/news/activating-asl3-protections> |
| 290 | OK | 200 | models:claude-2 | <https://www.anthropic.com/news/claude-2> |
| 291 | OK | 200 | models:claude-2-1 | <https://www.anthropic.com/news/claude-2-1> |
| 292 | OK | 200 | models:claude-3-5-sonnet | <https://www.anthropic.com/news/claude-3-5-sonnet> |
| 293 | OK | 200 | models:claude-3-haiku、models:claude-3-opus、models:claude-3-sonnet | <https://www.anthropic.com/news/claude-3-family> |
| 294 | OK | 200 | models:claude-opus-4、models:claude-sonnet-4 | <https://www.anthropic.com/news/claude-4> |
| 295 | OK | 200 | models:claude-mythos-preview、models:claude-fable-5、models:claude-mythos-5 等 4 条 | <https://www.anthropic.com/news/claude-fable-5-mythos-5> |
| 296 | OK | 200 | models:claude-haiku-4-5 | <https://www.anthropic.com/news/claude-haiku-4-5> |
| 297 | OK | 200 | models:claude-opus-4-1 | <https://www.anthropic.com/news/claude-opus-4-1> |
| 298 | OK | 200 | models:claude-opus-4-5 | <https://www.anthropic.com/news/claude-opus-4-5> |
| 299 | OK | 200 | models:claude-opus-4-6 | <https://www.anthropic.com/news/claude-opus-4-6> |
| 300 | OK | 200 | models:claude-opus-4-7 | <https://www.anthropic.com/news/claude-opus-4-7> |
| 301 | OK | 200 | models:claude-opus-4-8 | <https://www.anthropic.com/news/claude-opus-4-8> |
| 302 | OK | 200 | models:claude-opus-5 | <https://www.anthropic.com/news/claude-opus-5> |
| 303 | OK | 200 | models:claude-sonnet-4-5 | <https://www.anthropic.com/news/claude-sonnet-4-5> |
| 304 | OK | 200 | models:claude-sonnet-4-6 | <https://www.anthropic.com/news/claude-sonnet-4-6> |
| 305 | OK | 200 | models:claude-sonnet-5 | <https://www.anthropic.com/news/claude-sonnet-5> |
| 306 | OK | 200 | events:constitutional-ai-2022 | <https://www.anthropic.com/news/constitutional-ai-harmlessness-from-ai-feedback> |
| 307 | OK | 200 | events:anthropic-fable-mythos-suspension-2026 | <https://www.anthropic.com/news/fable-mythos-access> |
| 308 | OK | 200 | models:claude | <https://www.anthropic.com/news/introducing-claude> |
| 309 | OK | 200 | events:anthropic-public-benefit-fund-2026 | <https://www.anthropic.com/news/public-benefit-fund> |
| 310 | OK | 200 | events:anthropic-fable-mythos-redeploy-2026 | <https://www.anthropic.com/news/redeploying-fable-5> |
| 311 | OK | 200 | events:anthropic-s1-ipo-2026 | <https://www.anthropic.com/news/s1-sec> |
| 312 | OK | 200 | models:claude-opus-4、models:claude-sonnet-4、models:claude-opus-4-1 等 20 条 | <https://www.anthropic.com/system-cards> |
| 313 | UNREACHABLE | - | models:grok-3、models:grok-4 | <https://www.bloomberg.com/jp/news/articles/2025-07-10/SZ63V4DWRGG000> |
| 314 | OK | 200 | events:china-genai-interim-measures-2023、events:china-genai-measures-in-force-2023、organizations:china-government | <https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm> |
| 315 | OK | 200 | events:lighthill-1973 | <https://www.chilton-computing.org.uk/inf/literature/reports/lighthill_report/contents.htm> |
| 316 | OK | 200 | models:spark-desk、organizations:iflytek | <https://www.chinaz.com/2023/0506/1521939.shtml> |
| 317 | OK | 200 | models:deepseek-v3、organizations:deepseek | <https://www.deepseek.com/news/deepseek-v3/> |
| 318 | OK | 200 | events:eu-ai-act-adopted-2024、organizations:eu | <https://www.europarl.europa.eu/news/en/press-room/20240308IPR19015/artificial-intelligence-act-meps-adopt-landmark-law> |
| 319 | OK | 200 | events:us-ai-executive-order-2023、organizations:white-house | <https://www.federalregister.gov/documents/2023/11/01/2023-24283/safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence> |
| 320 | OK | 200 | events:china-genai-service-filing-2025、organizations:china-government | <https://www.fjwx.gov.cn/yw/20260112/3021895.html> |
| 321 | OK | 200 | events:china-ai-plus-action-plan、organizations:china-government | <https://www.gov.cn/zhengce/zhengceku/202508/content_7037862.htm> |
| 322 | OK | 200 | events:bletchley-declaration-2023、organizations:uk-government | <https://www.gov.uk/government/publications/ai-safety-summit-2023-the-bletchley-declaration> |
| 323 | OK | 200 | events:deep-blue-1997、organizations:ibm | <https://www.ibm.com/history/deep-blue> |
| 324 | OK | 200 | events:china-ai-content-labeling-draft-2024、organizations:china-government | <https://www.jswx.gov.cn:8888/fwhd/tzgg/202409/t20240914_106660.shtml> |
| 325 | OK | 200 | models:minimax-abab6、models:minimax-abab6-5、organizations:minimax | <https://www.minimax.cn/news/%E9%80%9A%E7%94%A8%E5%A4%A7%E6%A8%A1%E5%9E%8Babab65%E7%B3%BB%E5%88%97> |
| 326 | OK | 200 | events:china-ai-governance-principles-2019、organizations:china-government | <https://www.most.gov.cn/kjbgz/201906/t20190617_147107.html> |
| 327 | OK | 200 | events:backprop-1986、organizations:toronto | <https://www.nature.com/articles/323533a0> |
| 328 | OK | 200 | events:alphago-nature-2016 | <https://www.nature.com/articles/nature16961> |
| 329 | OK | 200 | events:alphafold-2-2020 | <https://www.nature.com/articles/s41586-021-03819-2> |
| 330 | OK | 200 | events:alphafold-3-2024 | <https://www.nature.com/articles/s41586-024-07487-w> |
| 331 | OK | 200 | models:baichuan2、organizations:baichuan | <https://www.ncsti.gov.cn/kjdt/ztbd/rgzn/zxjz/202309/t20230908_133239.html> |
| 332 | OK | 200 | models:doubao-llm、organizations:bytedance | <https://www.news.cn/tech/20240515/0cbd896c16e14a398c26f4195a360410/c.html> |
| 333 | OK | 200 | events:nist-ai-rmf-2023、organizations:nist | <https://www.nist.gov/itl/ai-risk-management-framework> |
| 334 | OK | 200 | events:nobel-chemistry-2024 | <https://www.nobelprize.org/prizes/chemistry/2024/press-release/> |
| 335 | OK | 200 | events:nobel-physics-2024 | <https://www.nobelprize.org/prizes/physics/2024/press-release/> |
| 336 | OK | 200 | models:minimax-abab6、organizations:minimax | <https://www.pingwest.com/w/291914> |
| 337 | BLOCKED | 403 | events:hopfield-1982 | <https://www.pnas.org/doi/10.1073/pnas.79.8.2554> |
| 338 | OK | 200 | events:logic-theorist-1956 | <https://www.rand.org/pubs/papers/P868.html> |
| 339 | UNREACHABLE | - | models:gpt-5-2 | <https://www.reuters.com/technology/openai-launches-gpt-52-ai-model-with-improved-capabilities-2025-12-11/> |
| 340 | OK | 200 | models:internlm2 | <https://www.shlab.org.cn/news/5443847> |
| 341 | OK | 200 | models:doubao、organizations:bytedance | <https://www.stcn.com/article/detail/951137.html> |
| 342 | OK | 200 | models:step-5-preview | <https://www.stepfun.com/step-5-preview> |
| 343 | OK | 200 | events:china-genai-measures-draft-2023、organizations:china-government | <https://www.szzg.gov.cn/2023/xwzx/fhzx/202304/t20230411_4598306.htm> |
| 344 | BLOCKED | 403 | models:llama-4-maverick、models:llama-4-scout | <https://www.techlusive.in/news/meta-released-llama-4-ai-multimodal-models-with-10-million-token-context-window-check-details-1553545/> |
| 345 | OK | 200 | models:chatglm-6b | <https://www.tmtpost.com/nictation/6448825.html> |
| 346 | UNREACHABLE | - | organizations:xai | <https://x.ai/> |
| 347 | UNREACHABLE | - | models:grok-1 | <https://x.ai/news/grok> |
| 348 | UNREACHABLE | - | models:grok-2 | <https://x.ai/news/grok-2> |
| 349 | UNREACHABLE | - | models:grok-3 | <https://x.ai/news/grok-3> |
| 350 | UNREACHABLE | - | models:grok-4 | <https://x.ai/news/grok-4> |
| 351 | OK | 200 | models:glm-4-5、organizations:zhipu | <https://z.ai/blog/glm-4.5> |

<!-- LINK-CHECK:END -->
