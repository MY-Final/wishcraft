# THE INTELLIGENCE ARCHIVE — 独立核查报告

> 核查对象：`src/data/models.json`（180 条）、`src/data/events.json`（93 条）、`src/data/organizations.json`（44 条）
> 核查者：独立核查员（与数据生产团队隔离，不参与研究、不改动任何数据或源码）
> 核查时间：2026-11-02（研究截止 2026-11-02 23:59 Asia/Shanghai）
> 核查方式：逐条打开 `sources[].url`，确认「① 页面可访问 ② 页面出现该名称 ③ 页面日期与 `announcementDate` 精度不越级」；官方页不可读时用权威转载做间接核实。
> 唯一产出文件：本文件。

---

## 1. 摘要

本次共抽查 **56 条记录**（模型 46 条 + 历史/政策事件 10 条），覆盖美国与中国、1950–2026 年。构成：2026 年模型 29 条、2018–2025 年模型 17 条、1950–2017 年历史事件 4 条、2026 年事件 6 条。

| 结论 | 数量 | 占比 |
|---|---|---|
| PASS | **50** | 89.3% |
| PARTIAL | **4** | 7.1% |
| FAIL | **2** | 3.6% |

**另有 1 条应入库而未入库的记录**（`gpt-6-1-sol` / GPT-6.1 Sol，2026-09-29），单列于第 2、4 节，不计入上表。

关键结论：

1. **数据整体质量高于预期。** 180 条模型的内部一致性（id 唯一、`displayDate` 与 `datePrecision` 逐条相符、`predecessors`/`successors` 无悬空引用、无 2026-11-02 之后的日期）**全部通过**，未发现 `verificationStatus=verified` 却只有二手来源的情况，也没有把「Claude 5」「GPT-6」这类代际名当成模型单独建条。
2. **用户点名项的研究结论有一处实质性错误。** 生产团队的 notes 判定「GPT-6.1 Sol 不存在」，但该模型确实存在（2026-09-29 发布），只是**未入库**。反过来，数据里已有的 GPT-6 Astra 与 GPT-6.1 Terra 均为真实型号。
3. **发现 2 处日期硬错误**（GPT-6 Astra 月份错、Kimi K3 月份错），均为「有更强证据但未采信」的情形，不是无据可查。
4. **另有 1 处 id 错配在核查期间被并发修复**：`anthropic-model-spec-2026-10-29` 已由写作方改为 `openai-model-spec-2026-10-29`，本次复核通过，留档于 §4-P0-4（已闭环，不计入 FAIL）。

---

## 2. 用户点名项结论表

| 点名项 | 数据中的记录 | 是否存在 | 结论 | 依据与说明 |
|---|---|---|---|---|
| **GPT-6 Astra** | `gpt-6-astra`，`2026-10`（month） | ✅ 存在 | ❌ **FAIL（日期错）** | 官方页 `openai.com/index/gpt-6-astra/` 标题与正文确认名称，但**页面无 `datePublished`、无正文日期**（与研究员 notes 一致）。首发实际在 **2026 年 9 月初**：Amazon Bedrock 模型卡标注「Model launch date: **September 8, 2026**」；《上海证券报》**2026-09-04**《GPT-6 Astra 正式发布》；Rai News 2026-09-29 称其为「**rilasciato all'inizio di settembre**」。数据写的 2026-10 无任何来源支持，且 notes 用 2026-10-29 的「GPT-6 in ChatGPT update」倒推发布月，逻辑上该文恰恰证明 10 月 29 日之前 GPT-6 已上线。 |
| **GPT-6.1 Terra** | `gpt-6-1-terra`，`2026-10-26`（day，api） | ✅ 存在 | ✅ **PASS** | OpenAI Model Release Notes 有独立条目「**GPT-6.1 Terra (October 26, 2026)**」，正文给出 `gpt-6.1-terra` API 标识、$1/$0.05 cache/$5 定价、视觉推理与 computer use、不进 Chat、不支持 UAE 推理驻留——与数据完全一致。 |
| **GPT-6.1 Sol** | **无此记录** | ✅ **存在**（2026-09-29） | ❌ **数据缺失 + 研究结论错误** | Amazon Bedrock 模型卡「GPT-6.1 Sol / Model launch date: **September 29, 2026**」；Rai News 2026-09-29《OpenAI lancia GPT-6.1 Sol al posto di GPT-6.1 Astra》报道其在 DevDay 发布、定位低于 GPT-6 Astra、成本约为旗舰的 1/5。生产 notes §2.1 与 §2.3 的「没有任何官方来源显示存在 GPT-6.1 Sol」**不成立**，属漏收而非误收。 |
| **Claude Opus 5** | `claude-opus-5`，`2026-07`（month） | ✅ 存在 | ✅ **PASS** | 官方 `anthropic.com/system-cards` 索引：Claude Opus 5 / **July 2026**；`anthropic.com/news/claude-opus-5` 可读且正文以「available today」发布，含 `claude-opus-5` 型号名与 $5/$25 定价。按月精度记录符合规范。 |
| **Claude Opus 5.5** | `claude-opus-5-5`，`2026-09-22`（day） | ✅ 存在 | ✅ **PASS** | 官方页首行即「**September 22, 2026**」；正文确认其为 Claude 5.5 家族首个模型、较 Opus 5 便宜约 40%，并给出与 Opus 5 / Fable 5.1 / GPT-6 Astra / GPT-5.6 Sol 的对照表。日精度站得住。 |
| **DeepSeek-V4**（Pro / Flash） | `deepseek-v4-pro`、`deepseek-v4-flash`，均 `2026-04-24`（day） | ✅ 存在 | ✅ **PASS** | 官方 `api-docs.deepseek.com/news/news260424`「DeepSeek-V4 Preview Release **2026/04/24**」，正文明确 V4-Pro 1.6T total / 49B active、V4-Flash 284B / 13B active，API 当日可用。 |
| **DeepSeek-V4-Pro** | 同上 | ✅ 存在 | ✅ **PASS** | 同上；另有 `news260813.md`（V4-Pro GA）作为第二来源可读。 |
| **DeepSeek-V4.1-Flash** | `deepseek-v4-1-flash`，`2026-09-10`（day） | ✅ 存在 | ✅ **PASS** | `news260910`「DeepSeek-V4.1-Flash Release **2026/09/10**」，Hugging Face 页同为 2026-09-10；导航栏亦列出该日期。 |

**给 lead 的一句话**：本次点名的 8 个名称**全部真实存在**，不存在「误收传闻型号」；真正的风险方向相反——**漏收了 GPT-6.1 Sol**，且生产 notes 把「未找到来源」写成了「不存在」。

---

## 3. 抽查明细表

### 3.1 用户点名项与 2026 年新条目

| # | id | 名称 | 声明日期（精度） | 核对来源（可读性） | 结论 | 备注 |
|---|---|---|---|---|---|---|
| 1 | gpt-6-astra | GPT-6 Astra | 2026-10（month） | openai.com 官方页（200，无日期）；help.openai.com（200，仅 10-29 update） | **FAIL** | 应为 2026-09，见 §4-P0-1 |
| 2 | gpt-6-1-terra | GPT-6.1 Terra | 2026-10-26（day） | help.openai.com 发布说明（200，条目自带日期） | PASS | 名称、日期、API 标识、定价均一致 |
| 3 | gpt-5-6-sol | GPT-5.6 Sol | 2026-07-09（day） | help.openai.com（200） | PASS | 原文「Introducing GPT-5.6 Sol in ChatGPT (July 9, 2026)」 |
| 4 | deepseek-v4-pro | DeepSeek-V4-Pro | 2026-04-24（day） | api-docs.deepseek.com/news/news260424（200，「2026/04/24」）；news260813.md（200） | PASS | 1.6T/49B 参数、当日 API 可用均与正文一致 |
| 5 | deepseek-v4-flash | DeepSeek-V4-Flash | 2026-04-24（day） | news260424（200）；/updates（200，含 2026-04-24） | PASS | 284B/13B，与 V4-Pro 同日预览 |
| 6 | deepseek-v4-1-flash | DeepSeek-V4.1-Flash | 2026-09-10（day） | news260910（200，「2026/09/10」）；/updates（200）；HF（200） | PASS | 三来源同日 |
| 7 | claude-opus-5 | Claude Opus 5 | 2026-07（month） | system-cards（200）；news/claude-opus-5（200，正文无日期） | PASS | 系统卡索引写 July 2026 |
| 8 | claude-opus-5-5 | Claude Opus 5.5 | 2026-09-22（day） | anthropic.com/claude-opus-5-5（200） | PASS | 页首日期与日精度一致 |
| 9 | claude-sonnet-5 | Claude Sonnet 5 | 2026-06（month） | system-cards（200） | PASS | 索引写 June 2026 |
| 10 | claude-sonnet-5-5 | Claude Sonnet 5.5 | 2026-09-28（day） | 官方页（200） | PASS | 「September 28, 2026」 |
| 11 | claude-haiku-5-5 | Claude Haiku 5.5 | 2026-10-07（day） | 官方页（200） | PASS | 「October 7, 2026」 |
| 12 | claude-fable-5 | Claude Fable 5 | 2026-06（month） | news/claude-fable-5-mythos-5（200，**Published Jun 9, 2026**） | PASS | 可精确到 2026-06-09，月精度不违规 |
| 13 | claude-mythos-5 | Claude Mythos 5 | 2026-06（month） | 同上 | PASS | 与 Fable 5 同底模，同页发布 |
| 14 | claude-mythos-preview | Claude Mythos Preview | 2026-04（month） | system-cards（200，「Mythos Preview / April 2026」）；Fable 5 页「In April we began Project Glasswing」 | PASS | 名称微差：官方作「Mythos Preview」，数据加「Claude」前缀（低） |
| 15 | claude-opus-4-6 | Claude Opus 4.6 | 2026-02（month） | system-cards（200） | PASS | February 2026 |
| 16 | claude-opus-4-7 | Claude Opus 4.7 | 2026-04（month） | system-cards（200） | PASS | April 2026 |
| 17 | claude-opus-4-8 | Claude Opus 4.8 | 2026-05（month） | system-cards（200） | PASS | May 2026 |
| 18 | kimi-k3 | Kimi K3 | 2026-06（month） | platform.kimi.com 文档（200，无日期）；HF（200，无建仓日） | **FAIL** | 应为 2026-07，见 §4-P0-2 |
| 19 | minimax-m3 | MiniMax-M3 | 2026-06（month） | HF 模型卡（200，含 2026-06）；证券时报 2026-06-01 | PASS | 媒体与模型卡互证「6 月 1 日发布」 |
| 20 | glm-5 | GLM-5 | 2026-02（month） | HF zai-org/GLM-5（200，含 2026-02）；证券时报 2026-02-12 | PASS | 参数 744B/40B 与 28.5T 数据亦对得上 |
| 21 | qwen3-5 | Qwen3.5 | 2026-02-16（day） | alibabagroup 新闻稿（200，「2026 年 2 月 16 日」）；HF（200，2026-02-16） | PASS | 中文稿 + 模型卡同日 |
| 22 | gemma-4 | Gemma 4 | 2026-04-03（day） | deepmind.google Gemma 页（200，「April 2026」） | PASS | 日精度仅由媒体支撑，`partially-verified` 分类正确 |
| 23 | gpt-5-4 | GPT-5.4 | 2026-03-05（day） | help.openai.com（200，「GPT-5.4 Thinking in ChatGPT (March 5, 2026)」） | PASS | — |
| 24 | gpt-5-4-mini | GPT-5.4 mini | 2026-03-18（day） | help.openai.com（200，同名日期） | PASS | — |
| 25 | gpt-5-3-codex | GPT-5.3-Codex | 2026-02-05（day） | help.openai.com（200，「Introducing GPT-5.3-Codex (February 5, 2026)」） | PASS | — |
| 26 | gpt-5-5 | GPT-5.5 | 2026-04（month） | 官方发布说明无独立首发条目；TechCrunch 2026-04-23、新华网 2026-04-27、OpenAI 韩文页「2026년 4월 24일」 | PASS（间接） | 月份正确；**建议补一条可直接读日期的官方来源**，否则月精度缺一手支撑 |
| 27 | step-5-preview | Step-5-Preview | 2026-09（month） | HF stepfun-ai（200，含 2026-09）；stepfun.com 页仅 6 字节（JS 渲染） | PASS | — |
| 28 | deepseek-v4-1-flash-1017 | DeepSeek-V4.1-Flash-1017 | 2026-10-17（day） | news261017（200，「2026/10/17」）；HF（200） | PASS | 截止日前最后一个 DeepSeek 条目 |
| 29 | gpt-6-rosalind-research | GPT-6 Rosalind Research | 2026-10-30（day） | help.openai.com（200，「October 30, 2026」） | PASS | 名称写作 `gpt-6-rosalind`，正文自洽 |

### 3.2 关键历史节点（2018–2025）

| # | id | 名称 | 声明日期（精度） | 核对来源（可读性） | 结论 | 备注 |
|---|---|---|---|---|---|---|
| 30 | gpt-1 | GPT-1 | 2018-06-11（day） | openai.com 官方博客（200，正文「**June 11, 2018**」）；GitHub（200） | PASS | — |
| 31 | bert | BERT | 2018-10-11（day） | arXiv 1810.04805（200，「**Submitted on 11 Oct 2018**」） | PASS | 日精度与 arXiv v1 一致 |
| 32 | gpt-3 | GPT-3 | 2020-05-28（day） | arXiv 2005.14165（200，「**Submitted on 28 May 2020**」） | PASS | — |
| 33 | chatgpt | ChatGPT | 2022-11-30（day） | openai.com/index/chatgpt/（200，正文「**November 30, 2022**」） | PASS | 主时间轴锚点无误 |
| 34 | gpt-4 | GPT-4 | 2023-03-14（day） | openai.com/index/gpt-4-research/（200，「**March 14, 2023**」） | PASS | — |
| 35 | claude-3-opus | Claude 3 Opus | 2024-03-04（day） | news/claude-3-family（200，「**Published Mar 4, 2024**」） | PASS | 同族 Haiku/Sonnet/Opus 三条同日，一致 |
| 36 | gemini-1-0 | Gemini 1.0 | 2023-12-06（day） | blog.google（200，「**Dec 06, 2023**」） | PASS | — |
| 37 | llama-2 | Llama 2 | 2023-07-18（day） | about.fb.com（200，「**July 18, 2023**」）；arXiv 2307.09288（200） | PASS | ai.meta.com 本条连接失败（环境） |
| 38 | o1 | OpenAI o1 | 2024-12-05（day） | openai.com o1 System Card（200，「**December 5, 2024**」；另见 2024-09-11/12 preview） | PASS | notes 对「12-05 面向 Pro、12-17 才进 API」的说明准确 |
| 39 | gpt-5 | GPT-5 | 2025-08-07（day） | openai.com/index/introducing-gpt-5/（200，「**August 7, 2025**」） | PASS | — |
| 40 | deepseek-r1 | DeepSeek-R1 | 2025-01-20（day） | news250120（200）；官方站导航「DeepSeek-R1 Release **2025/01/20**」；HF（200） | PASS | — |
| 41 | qwen3-235b-a22b | Qwen3 | 2025-04-29（day） | qwenlm.github.io/blog/qwen3/（200，「**April 29, 2025**」）；HF（200） | PASS | notes 关于「HF 建仓 04-27、博客 04-29」的取舍合理 |
| 42 | kimi-k2 | Kimi K2 | 2025-07-11（day） | platform.kimi.ai changelog（200，「**July 11, 2025**」）；HF（200，2025-07-11） | PASS | — |
| 43 | glm-4-5 | GLM-4.5 | 2025-07（month） | HF zai-org/GLM-4.5（200，2025-07）；z.ai 博客正文为空（JS） | PASS | 月精度正确 |
| 44 | minimax-m2 | MiniMax-M2 | 2025-10（month） | HF MiniMaxAI/MiniMax-M2（200，2025-10） | PASS | — |
| 45 | grok-4 | Grok 4 | 2025-07-09（day） | x.ai/news/grok-4（200，正文 **2025-07-09**） | PASS | **建议升级为 `verified`**：本环境 x.ai 可读且含日期，notes 的「无法访问 x.ai」已不成立 |
| 46 | gemini-3-pro | Gemini 3 Pro | 2025-11-18（day） | blog.google（200，「**Nov 18, 2025**」）；deepmind.google（200） | PASS | — |

### 3.3 历史事件（1950–2017）与 2026 年事件

| # | id | 事件 | 声明日期（精度） | 核对来源（可读性） | 结论 | 备注 |
|---|---|---|---|---|---|---|
| 47 | transformer-2017 | Transformer 论文 | 2017-06-12（day） | arXiv 1706.03762（200，「**Submitted on 12 Jun 2017**」） | PASS | 归属 google-deepmind 的说明合理 |
| 48 | alexnet-2012 | AlexNet | 2012（year） | NIPS 2012 摘要页（200，年份命中） | PASS | 年精度恰当 |
| 49 | eliza-1966 | ELIZA | 1966-01（month） | dl.acm.org（**403 反爬**） | PARTIAL（环境限制） | 卷期 CACM 9(1):36–45 与「1966 年 1 月」自洽；正文不可读，未取得替代官方页 |
| 50 | turing-computing-machinery-1950 | 图灵《计算机器与智能》 | 1950-10（month） | academic.oup.com（**403 反爬**） | PARTIAL（环境限制） | Mind Vol. LIX No. 236（1950 年 10 月）自洽；建议补 DOI/Crossref 可读页 |
| 51 | anthropic-fable-mythos-suspension-2026 | 暂停 Fable 5 / Mythos 5 访问 | 2026-06-12（day） | news/fable-mythos-access（200，「**Published Jun 12, 2026**」） | PARTIAL | 日期正确；但**归因不准**：官方原文是「美国政府出口管制指令要求暂停」，非 Anthropic 主动暂停，见 §4-P1-3 |
| 52 | anthropic-s1-ipo-2026 | Anthropic 提交 S-1 | 2026-10-26（day） | news/s1-sec（200，「**Published Oct 26, 2026**」） | PASS | 与 model-spec 事件同日但主体不同，勿混 |
| 53 | openai-model-spec-2026-10-29 | OpenAI 重构模型规范 | 2026-10-29（day） | model-spec.openai.com/2026-10-29.html（200，正文含 2026/10/29）；help.openai.com（200） | PASS（复核时已修） | 核查初期该 event 的 id 为 `anthropic-model-spec-2026-10-29`（前缀与 OpenAI 内容错配），核查期间已被并发合并改为 `openai-model-spec-2026-10-29`；改后复核通过，见 §4-P0-4 |
| 54 | openai-gpt6-rosalind-research-2026 | GPT-6 Rosalind Research 发布 | 2026-10-30（day） | help.openai.com（200） | PARTIAL | 日期对，但**与 model `gpt-6-rosalind-research` 完全重复**，违反 §6「模型发版只进 models」，见 §4-P1-2 |
| 55 | anthropic-project-glasswing-2026 | Project Glasswing 启动 | 2026-04（month） | anthropic.com/glasswing（200，页面为时间线 hub）；Fable 5 页「**In April we began Project Glasswing**」 | PASS | 月精度有直接文本支撑 |
| 56 | openai-retire-gpt4o-2026 | 下线 GPT-4o / GPT-5 等 | 2026-02-13（day） | help.openai.com（200，「Retiring GPT-4o and other legacy models (February 13, 2026)」） | PASS | 与正文列出的 GPT-4o/4.1/4.1 mini/o4-mini/GPT-5 一致 |

---

## 4. 需要修正的问题清单（按严重度排序）

### P0 — 硬错误，必须改

**P0-1 `gpt-6-astra`：月份错一个月**

- 现值：`announcementDate: "2026-10"`、`displayDate: "2026.10"`、`datePrecision: "month"`。
- 建议值：`announcementDate: "2026-09"`、`displayDate: "2026.09"`、`datePrecision: "month"`；`availabilityDate` 保持 `null`（若采信 Bedrock 可用日，可填 `2026-09-08` 并把 `dateType` 留 `announcement`）。
- 证据：AWS Bedrock 模型卡「Model launch date: September 8, 2026」；《上海证券报》2026-09-04《GPT-6 Astra 正式发布》；Rai News 2026-09-29「rilasciato all'inizio di settembre」。
- 同时须改 `notes`：现有 notes 用「2026-10-29 GPT-6 in ChatGPT update」倒推首发月，属因果倒置（该 update 恰恰说明 10 月 29 日之前模型已在线上）。建议改为：「官方博客未在正文标注日期；首发时间依 Amazon Bedrock 模型卡（2026-09-08 上线）与 2026-09-04 起的官方发布报道，取月精度。」
- 建议补 `press` 来源一条（Rai News 或上证报），使非官方证据可追溯。

**P0-2 `kimi-k3`：月份错一个月**

- 现值：`"2026-06"` / `"2026.06"` / month。
- 建议值：`"2026-07"` / `"2026.07"` / month。
- 证据：科技日报《国产开源大模型参数规模冲击新高度》（2026-07-21）称「近日…发布新一代模型 Kimi K3」，并引「Kimi 在 **7 月 19 日**发布的公告」；新华网 2026-07-22、新华每日电讯 2026-07-23 同期报道；官方文档正文写「过去 12 个月（**2025/07–2026/07**）」。
- 现有 notes 的唯一依据是「官方 HF 仓库创建时间 2026-06-13」，但该页在本环境**无任何可见建仓日期**（全文无 2026-06/2026-07 字样），证据链不成立。建议改 notes 为「官方文档未标日期；据 2026-07-19 官方公告与 2026-07-21 起央媒报道，取月精度」，并补 `press` 来源。
- 备注：该条 `openWeights: true` 与 HF 权重页一致，无需改动；仅日期与 notes 需改。

**P0-3 缺失记录：GPT-6.1 Sol**

- 建议新增 id `gpt-6-1-sol`，`name: "GPT-6.1 Sol"`，`organization: "openai"`，`countryOrRegion: "US"`，`family: "GPT"`，`generation: "6.1"`，`announcementDate: "2026-09-29"`，`availabilityDate: "2026-09-29"`，`displayDate: "2026.09.29"`，`datePrecision: "day"`，`dateType: "announcement"`，`category: "language"`（或 `reasoning`），`openWeights: false`，`architecture: "未公开（闭源）"`。
- 证据：AWS Bedrock 模型卡「GPT-6.1 Sol / Model launch date: September 29, 2026 / context window 1M」；Rai News 2026-09-29 报道 DevDay 发布、定位低于 GPT-6 Astra、成本约为其 1/5。
- 关联建议：`predecessors: ["gpt-5-6-sol"]`（或留空，视技术继承判断），`successors: []`；GPT-6 Astra 的 `successors` 不必包含它（二者是不同档位，不是直接替代）。
- **必须同步修正 `research/frontier-2025-2026-notes.md` §2.1 / §2.3 的结论**：把「❌ 未核实，不存在」改为「✅ 存在，2026-09-29，原判为漏收」。这是本次核查与生产结论**唯一实质性冲突**，请 lead 拍板是否补录。
- 附带线索（可留待后续，不影响本轮通过）：同一生态中还存在 GPT-6.1 Astra（被弃用）、GPT-6 Sol、GPT-6 Luna 等名称，均出现在官方对比表中；若主线叙事需要「6.1 更便宜档」的完整链条，建议一并核查。

**P0-4 `anthropic-model-spec-2026-10-29`：id 与内容错配（核查期间已修复，留档）**

- 核查初期现状：id 前缀为 `anthropic-`，但 `title` 为「OpenAI 重构模型规范为五项价值」、`titleEn` 为「Updates to the OpenAI Model Spec」、`organizations: ["openai"]`、来源全为 OpenAI。
- 处理结果：**本次核查期间该条已被并发合并修正为 `openai-model-spec-2026-10-29`**，2026-10-29 的日期与内容不变。复核后判定 PASS，不再计入 FAIL。
- 留档原因：说明该缺陷确实存在过；若后续有分支或快照仍带旧 id，需要按新 id 对齐前端路由、锚点与 `relatedModels`。日期 2026-10-29 无需改动。

### P1 — 应改

**P1-1 4 条来源 URL 已 404**（全量 URL 扫描顺带发现，均不在本次 56 条样本内，但属硬缺陷）

| 所属记录 | 失效 URL | 建议 |
|---|---|---|
| `us-ai-bill-of-rights-2022`、`white-house` | `https://www.whitehouse.gov/ostp/ai-bill-of-rights/` | 换 whitehouse.gov 现行存档页或 NIST/OSTP 镜像 |
| `us-ai-executive-order-2023`、`white-house` | `https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-...` | 换 federalregister.gov 对应 EO 14110 条目 |
| `openai-board-crisis-2023` | `https://openai.com/index/sam-altman-returns-as-ceo/` | 换 openai.com 现行 `/index/sam-altman-returns-as-ceo/` 的可用路径或官方致员工信存档 |
| `amazon-anthropic-2023`、`amazon` | `https://www.aboutamazon.com/news/aws/amazon-aws-anthropic-ai` | 换 aboutamazon.com 现行路径或 AWS 新闻稿 |

**P1-2 `openai-gpt6-rosalind-research-2026` 与 model 重复**

- 事件与 `gpt-6-rosalind-research` 描述同一发布，违反 §6/§7「模型发版进 models.json，事件与模型不重复」。
- 建议：删除该 event（保留 model），或改写为不重复的事件口径（例如仅保留「OpenAI 把生命科学业务拆为 Rosalind 产品线」这类组织/产品事件，且不与 model 同日同义）。

**P1-3 `anthropic-fable-mythos-suspension-2026` 归因与标题**

- 现值标题「Anthropic 暂停 Claude Fable 5 与 Mythos 5 访问」；官方原文是《Statement on the US government directive to suspend access to Fable 5 and Mythos 5》，即**美国政府出口管制指令**导致，且 `titleEn` 现写作「Claude Mythos 5 and Fable 5 Access Unavailable」与官方标题不符。
- 建议：标题改为「美国出口管制指令迫使 Anthropic 暂停 Fable 5 与 Mythos 5 访问」，`titleEn` 用官方原文；notes 补时间线（06-12 暂停 → 06-26 Mythos 5 对部分美国机构恢复 → 06-30 管制解除 → 07-01 Fable 5 全球恢复）。
- 顺带核对：`anthropic-fable-mythos-redeploy-2026` 记 2026-07-01 与官方「Fable 5 于 7 月 1 日恢复」一致，但 Mythos 5 的恢复是 6 月 26 日获批、范围有限，建议该事件 notes 注明差异。

**P1-4 `grok-4` 核实等级偏保守**

- 现值 `partially-verified`，notes 写「本环境无法访问 x.ai」。本次核查 `https://x.ai/news/grok-4` 返回 200，正文含 **2025-07-09**，已满足 §0 对 `verified` 的要求。
- 建议：升级为 `verified`，删除 notes 中「无法访问」的表述（保留 Bloomberg 作为第二来源亦可）。

### P2 — 数据规范（批量，不影响事实正确性）

**P2-1 `openWeights: true` 但 sources 无 `weights` 类链接（36 条）**

§1 规定「有官方权重页才算 true」。以下记录声明开放权重却没有任何 `weights` 来源（多以 official/paper/docs 代替）：
`bert`、`gpt-2`、`t5`、`clip`、`glm-130b`、`stable-diffusion`、`whisper`、`llama`、`chatglm-6b`、`qwen-7b`、`llama-2`、`baichuan2`、`mistral-7b`、`chatglm3`、`yi-34b`、`mixtral-8x7b`、`internlm2`、`qwen1-5`、`gemma`、`llama-3`、`phi-3`、`deepseek-v2`、`qwen2`、`llama-3-1`、`qwen2-vl`、`qwen2-5`、`llama-3-2`、`qwen2-5-coder`、`qwq-32b-preview`、`gemma-3`、`llama-4-maverick`、`llama-4-scout`、`gpt-oss-120b`、`gemma-4`、`deepseek-v4-flash`、`deepseek-v4-pro`。
建议：逐条补 HF/GitHub 权重页（优先补 2026 年四条 DeepSeek/Gemma），或将其 `openWeights` 降级为 `null`。

**P2-2 `summary` 超出 60–140 字上限（14 条）**

超限最多者：`gpt-6-rosalind-research`(170)、`claude-opus-5-5`(163)、`claude-opus-4-7`(160)、`claude-mythos-5-1`(159)、`claude-opus-5`(156)、`deepseek-v3`(154)、`gemini-3-pro`(154)、`gpt-6-astra`(151)、`claude-fable-5-1`(150)；其余：`deepseek-v2-5`(141)、`nano-banana`(144)、`claude-opus-4-6`(143)、`claude-sonnet-5`(146)、`gpt-6-1-terra`(147)。建议统一压到 140 字内。

**P2-3 `generation` 字段语义**

`claude-fable-5`（`"Fable 5"`）、`claude-mythos-5`（`"Mythos 5"`）、`claude-fable-5-1`（`"Fable 5.1"`）、`claude-mythos-5-1`（`"Mythos 5.1"`）、`claude-mythos-preview`（`"Mythos-preview"`）把产品线名写进了 `generation`。§1 要求 `generation` 是版本号字符串（如 `3.5`/`V3`/`K2`）。建议改为 `"5"`/`"5.1"`，产品线差异放 `tags` 或 `name`。

**P2-4 名称细节**

`claude-mythos-preview` 的 `name` 写「Claude Mythos Preview」，官方系统卡索引为「Mythos Preview」，建议与官方一致（低）。

### 专项检查结果（用户指定）

| 检查项 | 结果 |
|---|---|
| 是否出现 2026-11-02 之后的日期 | **无**。全量 180 模型 + 93 事件的最大日期为 `2026-10-30`（`gpt-6-rosalind-research`），未越界。 |
| `verified` 但只有二手来源 | **无**。142 条 `verified` 全部至少含一条 `official`/`paper`/`docs`/`weights`。 |
| 把「代际名」当模型（如 `claude-5`） | **无**。未建 `claude-5`、`gpt-6` 这类裸代际条目；`claude-2`、`claude-2-1`、`gemini-1-0`、`gemini-2-0` 均为真实型号名。 |
| 把传闻型号入库 | 抽查范围内**未发现**误收。反向问题更突出：**漏收 GPT-6.1 Sol**（§4-P0-3）。 |
| `displayDate` 与 `datePrecision` 一致 | **180/180 通过**（脚本逐条比对点分格式）。 |
| id 唯一性 | **通过**（模型、事件均无重复）。 |
| `predecessors`/`successors` 悬空引用 | **通过**（0 条指向不存在的 id）。 |
| `chapter` 与年份映射 | **通过**（93 条事件全部符合 §2 的章节规则）。 |

---

## 5. 方法与局限

### 5.1 方法

1. **结构化预检（全量，不只抽样）**：用脚本对 180 模型 + 93 事件做机器校验——日期越界、`displayDate`/`datePrecision` 一致性、id 唯一性、`predecessors`/`successors` 完整性、`verified` 是否含一手来源、`openWeights` 是否含权重来源、文案长度、`chapter` 映射。这一步用于找出「不必逐条外网核对就能判定的规范错误」。
2. **URL 可达性全量扫描**：对 `models/events/organizations` 的全部 **351 个唯一来源 URL** 做并发 ≤6、超时 15s 的 GET 探测，记录 HTTP 状态与重定向终点。
3. **逐条内容核对（本次 56 条）**：打开来源页 → 取正文纯文本 → ① 检查模型/事件名是否出现（含 id 变形、去空格归一化）② 抽取全部 `YYYY-MM-DD` / `Month D, YYYY` / `YYYY/MM/DD` / `YYYY年M月D日` 片段 → ③ 判断页面日期是否支持声明的精度（day 必须有日，month 有月即可，不得越级）。
4. **交叉验证**：当官方页为 JS 渲染或无可读日期时，用「平台方文档（AWS Bedrock 模型卡）+ 央媒/权威媒体」双向比对；对同一发布若出现两个不同月份，以能给出「发布」而非「更新/退役」语义的一方为准。
5. **来源真实性抽样**：专门检查是否存在「照抄 `DATA_SCHEMA.md` 示例 URL 而未核实」的痕迹——`DATA_SCHEMA.md` §1 的示例链接是 `anthropic.com/claude-opus-5-5`。实测该 URL **真实可用**（200，落在官方落地页），因此本次**未发现**此类伪造；但示例路径与 Anthropic 现行的 `/news/…` 路径并不一致，建议在 schema 中改用已验证的 `/news/` 形式，减少后续研究员按示例拼 URL 的风险。

### 5.2 环境限制（不据此判 FAIL）

- **web_fetch 直连在部分域失败**：`huggingface.co`(45)、`ai.meta.com`(7)、`arxiv.org`(5)、`x.ai`(5)、`blog.google`(4)、`mistral.ai`(3)、`research.google`(2)、`qwenlm.github.io`、`bloomberg.com`、`reuters.com`、`gov.uk` 等，node `fetch` 与 `web_fetch` 均报 `fetch failed`，但 **PowerShell `Invoke-WebRequest` 对同一 URL 返回 200**。判定为本机到这些域的 TLS/HTTP2 通道问题，非目标页缺陷。上述域内的核对改用 IWR 完成。
- **openai.com / help.openai.com 对 IWR 返回空**（`status=0`），但对 `web_fetch` 与 node fetch 正常；因此 OpenAI 系条目改用 node 抓取 HTML 后抽取 `Month D, YYYY`，并成功读到 `June 11, 2018`、`November 30, 2022`、`March 14, 2023`、`August 7, 2025`、`December 5, 2024` 等正文日期。
- **403 属反爬而非死链**：`dl.acm.org`、`academic.oup.com`、`pnas.org`、`doi.org`（MIT Press / MIT 系）、`blogs.microsoft.com`、`techlusive.in`。按任务要求**不判 FAIL**，涉及条目（`eliza-1966`、`turing-computing-machinery-1950`）标 PARTIAL 并注明环境限制。
- **202 状态**（`doi.org/10.1147/rd.33.0210`、`10.1109/5.726791`、`10.1109/CVPR.2009.5206848`、`eur-lex.europa.eu`、NLM PDF）视为可达，不影响结论。
- **官方页无可读日期**：`openai.com/index/gpt-6-astra/` 无 `datePublished` 元数据、无正文日期（与研究员 notes 一致），只能依平台文档与媒体报道判定月份；`stepfun.com`、`z.ai/blog` 返回的正文长度为 1–6 字节（纯 JS 壳），只能改用 HF 模型卡。
- **无法覆盖的面**：本次为抽样（56/273 条记录，20.5%），未对全部 180 条模型逐条外网核对；中国条目高度依赖 HF 与厂商文档，HF 直连不稳定，若有镜像需求建议下次改用 IWR 通道批量跑。此外 `organizations.json` 仅做了 URL 可达性检查（发现 2 条 404），未核对其 `founded`、`summary` 等字段。
- **数据在核查期间被并发改写**：`models.json` / `events.json` / `organizations.json` 在本轮核查进行中（约 14:27）被 `scripts/merge-data.mjs` 重写过一次；本报告结论以 **2026-11-02 14:35 的最终文件状态**为准，并对关键条目做了二次回读确认（条数仍为 180/93/44，样本日期未变）。唯一受影响的是 `anthropic-model-spec-2026-10-29` 的 id 被同步修正（见 §4-P0-4）。若后续再次合并，建议对 §4 的 P0/P1 清单重新回归。

### 5.3 与生产团队的结论分歧（供 lead 决策）

| 议题 | 生产团队结论 | 本次核查结论 | 建议 |
|---|---|---|---|
| GPT-6.1 Sol 是否存在 | ❌ 不存在，判为命名混淆 | ✅ 存在，2026-09-29，Bedrock 模型卡 + Rai News 双证据 | 补录 `gpt-6-1-sol`，并更正 notes |
| GPT-6 Astra 首发月 | 2026-10 | 2026-09（且早于 09-08） | 改月 + 重写 notes |
| Kimi K3 首发月 | 2026-06（依 HF 建仓日） | 2026-07（依官方公告 07-19 与央媒） | 改月 + 换证据链 |

> 报告结束。本次核查未修改任何数据或源码，仅新增本文件。


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

> 结论：三项 P0 已处理；数据重新合并并通过 `validate-data.mjs`。本报告第 2–4 节保留核查时的原始结论，供审计追溯。
