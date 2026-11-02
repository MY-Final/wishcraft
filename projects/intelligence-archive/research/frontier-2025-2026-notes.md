# 2025–2026 国际前沿模型研究说明（frontier-2025-2026）

- 研究员：`research-frontier-25-26`
- 研究截止：**2026-11-02**（Asia/Shanghai），无任何晚于该日的内容
- 交付文件：`research/frontier-2025-2026.json`
- 覆盖范围：仅国际机构（OpenAI / Anthropic / Google DeepMind / Meta / xAI），**不含中国实验室**

---

## 1. 数据清单与条数

| 项目 | 条数 |
|---|---|
| models | **51** |
| events | **16**（chapter 6 = 2025 年 7 条，chapter 7 = 2026 年 9 条） |
| organizations | 5（openai / anthropic / google-deepmind / meta / xai） |

按机构分布：

| 机构 | 模型数 | 覆盖版本 |
|---|---|---|
| OpenAI | 20 | o3-mini、GPT-4.5、GPT-4.1、o3、o4-mini、o3-pro、gpt-oss-120b、GPT-5、GPT-5-Codex、GPT-5.1、GPT-5.1-Codex-Max、GPT-5.2、GPT-5.3-Codex、GPT-5.4、GPT-5.4 mini、GPT-5.5、GPT-5.6 Sol、GPT-6 Astra、GPT-6.1 Terra、GPT-6 Rosalind Research |
| Anthropic | 20 | Claude Opus/Sonnet 4、Opus 4.1、Sonnet 4.5、Haiku 4.5、Opus 4.5、Opus 4.6、Sonnet 4.6、Opus 4.7、Mythos Preview、Opus 4.8、Fable 5、Mythos 5、Sonnet 5、Opus 5、Fable 5.1、Mythos 5.1、Opus 5.5、Sonnet 5.5、Haiku 5.5 |
| Google DeepMind | 7 | Gemini 2.5 Pro、Gemma 3、Veo 3、Nano Banana、Gemini 3 Pro、Gemini 3 Flash、Gemma 4 |
| Meta | 2 | Llama 4 Maverick、Llama 4 Scout |
| xAI | 2 | Grok 3、Grok 4 |

质量分布：**verified 41 / partially-verified 10**（模型），事件 16 条全部 verified。
日期精度：day 38 / month 13；年份分布 2025 年 28 个、2026 年 23 个。

---

## 2. 无法核实的名称与传闻（重点：用户点名项）

### 2.1 用户点名核验结论

| 名称 | 结论 | 依据 |
|---|---|---|
| **GPT-6 Astra** | ✅ **真实存在**，OpenAI 官方页面 `openai.com/index/gpt-6-astra/`（已成功抓取，HTTP 200，标题「GPT-6 Astra: A new generation of intelligence」）。首发只确认到 **2026-10**：官方页面正文未给出精确日；官方 Model Release Notes 中 2026-10-29 的「GPT-6 in ChatGPT update」是其已上线的正式证据。故 `datePrecision = month`。 | 官方页面 + 官方发布说明 |
| **GPT-6.1 Terra** | ✅ **真实存在**，**2026-10-26**，官方发布说明有独立条目，API 标识 `gpt-6.1-terra`，定价 $1/$0.05 cache/$5，支持视觉推理、computer use、写作，不进入 Chat、不支持 UAE 推理驻留。 | 官方 Model Release Notes |
| **GPT-6.1 Sol** | ❌ **未核实，未写入 models**。全部金属线索指向的是 **GPT-5.6 Sol**（2026-07-09 官方条目），而「Terra 比 Sol 便宜一半」的报道中的 Sol 即指 GPT-5.6 Sol。**没有任何官方来源显示存在 GPT-6.1 Sol 这一名称。** 判定为误传/命名混淆。 | 官方发布说明无此条目 |
| **Claude Opus 5** | ✅ **真实存在**，官方系统卡页标注 **July 2026**（按月精度写入）。另有独立公告页 `anthropic.com/news/claude-opus-5`（sitemap 确认存在）。Opus 5.5 发布页把它作为直接前代并给出逐项基准对照。 | 官方系统卡索引 + Opus 5.5 发布页 |
| **Claude Opus 5.5** | ✅ **真实存在**，**2026-09-22**（官方页面正文直接标注「September 22, 2026」，已成功抓取）。官方称其为 Claude 5.5 家族首个模型，多数工作达到 Fable 5.1 水平，成本比 Opus 5 低约 40%。 | `anthropic.com/claude-opus-5-5` |

### 2.2 其他 Anthropic 名称核验

| 名称 | 结论 |
|---|---|
| Claude 4.6 / 4.7 / 4.8 | ✅ 全部真实，分别 2026-02 / 2026-04 / 2026-05（官方系统卡索引按月标注） |
| Claude Fable 5.1 / Mythos 5.1 | ✅ 真实，2026-09，官方页面 `anthropic.com/claude-fable-and-mythos-5-1` 与系统卡索引确认 |
| Claude Fable 5 / Mythos 5 | ✅ 真实，2026-06。两者同底模，Mythos 5 解除部分网络防护，仅经 Project Glasswing 与受信任访问计划提供 |
| Claude Mythos Preview | ✅ 真实，2026-04，首个 Mythos 级模型，仅限少数网络防御方 |
| **「Claude 5」作为独立模型名** | ⚠️ **不存在单一名为「Claude 5」的模型**。官方口径中 Claude 5 是**代际**（含 Claude Opus 5 与 Claude Sonnet 5，均为 2026 年 6–7 月）；「Claude 5.5 家族」同理包含 Opus 5.5 / Sonnet 5.5 / Haiku 5.5。因此未建 `claude-5` 条目，避免与真实条目重复。 |

### 2.3 明确排除的传闻（未写入 JSON）

- **Gemini 3.5 Pro**：有报道称其在 Google I/O 上被宣布但长期未上线（"still MIA"）。**未找到官方发布证据，未写入。**
- **Gemini 4**：DeepMind 的 `deepmind.google/models/gemini/` 页面正文出现过「Gemini 4」标题，但 `deepmind.google/models/gemini/gemini-4/` 返回 **HTTP 404**，且权威媒体报道为「Gemini 4 is in post-training / almost ready」。判定为**尚未发布**，未写入。
- **Grok 5**：仅有 Musk 的公开发言与追踪类博客，**无官方发布证据**，未写入。
- **GPT-6.1 Sol**：见上，无官方来源。
- **Llama 4 Behemoth**：官方当时仅称仍在训练中/教师模型，未以相同口径开放权重，未写入。

### 2.4 覆盖缺口（本轮未取得可读官方来源，故未写入，留待补查）

以下方向本轮**未能产出可核实的条目**，属于交付缺口而非否定其存在：

- **Amazon Nova 2**、**Microsoft Phi-4/Phi-5**、**Apple 基础模型**、**Cohere**、**Stability AI**、**Black Forest Labs（FLUX 系列）**、**Mistral**、**NVIDIA Nemotron**、**Midjourney**、**Runway**、**ElevenLabs**。
- 其中 **Mistral Large 3** 已通过 AWS Bedrock 模型卡（`docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-mistral-large-3.html`）确认存在，但模型卡未给出可从正文直接读到的发布日期，本轮未取得 Mistral 官方公告页可读文本，故按铁律不写入，仅在此登记线索。
- **Meta 后续开放权重模型**（Llama 4 之后）与 **Apple** 的 2026 年动向，本轮未取得官方可读来源。

---

## 3. 日期冲突与取舍

1. **`dateType` 与「首发 vs 可用」的取舍**
   - GPT-4.1：API 首发 2025-04-14，ChatGPT 上线 2025-05-14。主时间轴取 **API 首发**，`dateType = api`，在 `notes` 中记录 ChatGPT 上线日。
   - GPT-6.1 Terra：`dateType = api`（官方以 API 标识与定价方式发布）。
   - gpt-oss-120b、Gemma 3、Gemma 4、Llama 4：`dateType = weights`。

2. **只给月份的一律不补日**（`datePrecision = month`，共 13 条）
   - Anthropic 的 4.6 / 4.7 / 4.8 / Fable 5 / Mythos 5 / Sonnet 5 / Opus 5 / Fable 5.1 / Mythos 5.1 / Mythos Preview：官方系统卡索引页只给到月份，**不臆造具体日**。
   - GPT-5.5：官方页面只给「2026 年 4 月」为发布月，另标注 2026-04-24 为 API 可用日；`announcementDate` 写 `2026-04`。
   - GPT-6 Astra：见 2.1，只到月。
   - 「We must pace the frontier」一文：官方只说明 Opus 5.5 是该文之后的首个发布，未给文章日期，故 `datePrecision = year`（2026）。

3. **GPT-5.2 首发日**
   - 官方发布说明确认 GPT-5.2 存在及其 2026 年初多次更新，但未在该页给出首发日；首发日 **2025-12-11** 取自路透社报道（URL 内嵌日期与正文一致）。条目内同时列官方与 `press` 两类来源，`verificationStatus = verified`（因为「存在」由官方确认、日期由权威媒体+URL 双重佐证）。

4. **Grok 4 的时区差**
   - 彭博社日文版标注 2025-07-10，与官方口径 2025-07-09（美国时间）相差一天。取 **2025-07-09**，在 `notes` 说明。

5. **Claude Fable 5 的「发布—暂停—恢复」**
   - 2026-06 首发 → 2026-06-12 暂停访问 → 2026-07-01 恢复。模型条目的 `announcementDate` 只写首发月份，**未把暂停日混入模型日期**；暂停与恢复各自建为 event，避免「模型与事件重复描述同一发布」。

6. **Gemini 3 Pro 与 Gemini 3 Flash 的关系**
   - Pro 2025-11-18 首发，Flash 2025-12-17 首发并成为 Gemini 应用默认模型。两者分别建条目，Flash 的 `predecessors` 指向 Pro（同代下压），不写为版本继承。

---

## 4. 关键来源 URL 列表

### 官方（一手，均可访问）
- OpenAI 模型发布说明（本数据集 OpenAI 条目最核心的一手日期来源，正文含逐条日期）：
  https://help.openai.com/en/articles/9624314-model-release-notes
- OpenAI — GPT-6 Astra（「新一代智能」，已成功抓取，HTTP 200）：
  https://openai.com/index/gpt-6-astra/
- OpenAI — gpt-oss 开放权重：https://openai.com/open-models/
- OpenAI — GPT-5.1（官方发布说明中被引用为退役前公告）：
  https://openai.com/index/gpt-5-1/
- OpenAI — GPT-5.5：https://openai.com/index/introducing-gpt-5-5/
- OpenAI — GPT-5.3-Codex：https://openai.com/index/introducing-gpt-5-3-codex/
- OpenAI — GPT-5.1-Codex-Max：https://openai.com/index/gpt-5-1-codex-max/
- OpenAI — GPT-5.4 mini / nano：https://openai.com/index/introducing-gpt-5-4-mini-and-nano/
- OpenAI — Model Spec：https://model-spec.openai.com/ 与 https://model-spec.openai.com/2026-10-29.html
- OpenAI — Stargate 计划：https://openai.com/index/announcing-the-stargate-project/
- OpenAI — Codex 编码 Agent：https://openai.com/index/introducing-codex/
- Anthropic — 官方系统卡索引（**Anthropic 全部 20 个模型月份口径的一手来源**）：
  https://www.anthropic.com/system-cards
- Anthropic — Claude Opus 5.5（正文标注 September 22, 2026）：
  https://www.anthropic.com/claude-opus-5-5
- Anthropic — Claude Sonnet 5.5：https://www.anthropic.com/claude-sonnet-5-5
- Anthropic — Claude Haiku 5.5：https://www.anthropic.com/claude-haiku-5-5
- Anthropic — Claude Fable 5.1 and Mythos 5.1：https://www.anthropic.com/claude-fable-and-mythos-5-1
- Anthropic — Claude Fable 5 and Claude Mythos 5（含分类器、降级到 Opus 4.8、受信任访问、暂停/恢复时间线）：
  https://www.anthropic.com/news/claude-fable-5-mythos-5
- Anthropic — Claude Opus 5：https://www.anthropic.com/news/claude-opus-5
- Anthropic — Claude Sonnet 5：https://www.anthropic.com/news/claude-sonnet-5
- Anthropic — Project Glasswing：https://www.anthropic.com/glasswing
- Anthropic — S-1 申报：https://www.anthropic.com/news/s1-sec
- Anthropic — 公共利益基金：https://www.anthropic.com/news/public-benefit-fund
- Google — Gemini 3（已成功抓取，HTTP 200）：
  https://blog.google/products-and-platforms/products/gemini/gemini-3/
- Google DeepMind — Gemini 家族页：https://deepmind.google/models/gemini/
- Google DeepMind — Gemma 家族页与 Gemma 4：https://deepmind.google/models/gemma/ 、https://deepmind.google/models/gemma/gemma-4/
- Google DeepMind — Nano Banana：https://deepmind.google/models/gemini-image/
- Google DeepMind — Veo：https://deepmind.google/models/veo/
- Google — Introducing Gemma 3: The Developer Guide：https://developers.googleblog.com/en/introducing-gemma3/
- EU — AI Act 监管框架：https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai

### 二手（仅用于 corroboration，条目标 `partially-verified`）
- Reuters — GPT-5.2 首发：https://www.reuters.com/technology/openai-launches-gpt-52-ai-model-with-improved-capabilities-2025-12-11/
- TechCrunch — Gemini 3 Flash 成为 Gemini 应用默认模型（2025-12-17）：https://techcrunch.com/2025/12/17/google-launches-gemini-3-flash-makes-it-the-default-model-in-the-gemini-app/
- 新华社 — Google 发布开放模型 Gemma 4（2026-04-03）：http://english.news.cn/20260403/ffa97a09c94843ffb1aef4e539de7c57/c.html
- Techlusive — Meta 发布 Llama 4 多模态模型：https://www.techlusive.in/news/meta-released-llama-4-ai-multimodal-models-with-10-million-token-context-window-check-details-1553545/
- Bloomberg — Grok 4 公开报道（2025-07-10）：https://www.bloomberg.com/jp/news/articles/2025-07-10/SZ63V4DWRGG000

### 本环境访问失败、已登记但未采信的线索
- `x.ai`（Grok 官方公告站）：多次 `fetch failed`，无法读取；Grok 3/4 因此标 `partially-verified`
- `ai.meta.com`（Llama 4 官方博客）：`fetch failed`；Llama 4 两条因此标 `partially-verified`
- `developers.openai.com/api/docs/changelog`：HTTP 403
- `ai.google.dev/gemini-api/docs/changelog`、`cloud.google.com` Vertex 文档：`fetch failed`
- `blog.google` 正文为前端渲染，抓取仅得到标题（因此 Google 条目的日期以媒体 corroboration 为准）

---

## 5. 主叙事必须采用的「不可错过节点」（12 个）

1. **2025-02-27 · GPT-4.5** — 预训练缩放路线的最后一次大规模公开实验，此后能力增量转向推理时计算。
2. **2025-04-16 · OpenAI o3 / o4-mini** — 推理过程与工具调用交织，「推理即带工具的搜索」范式确立。
3. **2025-05-22 · Claude Opus 4 / Sonnet 4 + Claude Code** — 编码被完整 Agent 化，模型开始「连续工作数小时」。
4. **2025-08-05 · gpt-oss-120b 开放权重** — 前沿实验室重回开源，推理模型交到本地部署者手里。
5. **2025-08-07 · GPT-5** — 模型即系统：路由器把「选哪个模型」变成服务端决策。
6. **2025-09-15 → 2025-11-19 · GPT-5-Codex → GPT-5.1-Codex-Max** — 上下文压缩让单任务跨越多个上下文窗口，长时程 Agent 成形。
7. **2025-11-18 · Gemini 3 Pro** — 思考默认开启 + 多模态代差，直接触发对手「红色警报」式重排。
8. **2026-02-05 · GPT-5.3-Codex** — 专用编码栈与通用栈合并，编码能力成为通用智能的一部分。
9. **2026-04 · Project Glasswing + Claude Mythos Preview** — 前沿能力首次按等级审核分发，受控发布制度诞生。
10. **2026-06 · Claude Fable 5 / Mythos 5** — 「同一权重 + 主题分类器 + 降级到 Opus 4.8」把 Mythos 级能力做成可公开发布产品；同月 6-12 暂停、7-01 恢复，证明发布可回滚。
11. **2026-04 → 2026-10 · GPT-5.5 → GPT-5.6 Sol → GPT-6 Astra** — 旗舰评价标准从对话质量转为「能否独立推进数小时专业任务」，并按行业裂出 Rosalind 变体与 6.1 低价档（Terra）。
12. **2026-09-22 · Claude Opus 5.5** — 以低于上代旗舰 40% 的成本逼近同门最强（Fable 5.1），前沿能力的价格曲线陡降，Agent 编码成为可按量采购的常规服务。

> 备选补充节点（如需 13–15 条）：2025-12-11 GPT-5.2（竞争牵引发布节奏）、2026-03-05 GPT-5.4（思考计划可中途中止纠偏）、2026-10-26 Anthropic 提交 S-1（前沿实验室进入公开财务监督）。

---

## 6. 自检记录

- [x] `node -e` 解析通过（51 models / 16 events / 5 organizations）
- [x] 无重复 id；`predecessors` / `successors` 全部指向本文件内真实 id，无悬空引用
- [x] 每个 model 至少 1 条 `kind = official` 来源
- [x] 每个 event 至少 1 条 `kind = official` 来源
- [x] `displayDate` 与 `datePrecision` 一致（day 38 / month 13 / year 1）
- [x] 无 2026-11-02 之后的内容
- [x] `summary` 60–140 字、`keyAdvancement` 40–80 字、`significance` 40–100 字（按中文字符计数）全部达标
- [x] `tags` 2–5 个、`capabilities` 2–4 条
- [x] 未写任何中国实验室模型；未修改 `research/` 之外的文件
- [x] 无营销词；对未证实的能力不作断言；参数量/上下文不确定处填 `null`


---

## 核查后更正（Lead 处理，2026-11-02）

- `gpt-6-astra`：月份 2026-10 → 2026-09，availabilityDate 补为 2026-09-08（AWS Bedrock 模型卡），并补 context window 1,050,000 tokens。
- 新增 `gpt-6-1-sol`：2026-09-29，来源 OpenAI Model Release Notes + AWS Bedrock 模型卡。此前 notes 中「GPT-6.1 Sol 不存在」的结论作废。
- `kimi-k3`：月份 2026-06 → 2026-07，核实状态降为 partially-verified（官方文档无日期，媒体与公告窗口指向 7 月）。
