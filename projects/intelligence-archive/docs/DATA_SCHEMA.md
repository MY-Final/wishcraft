# THE INTELLIGENCE ARCHIVE — 数据规范与研究方法

> 本文件是所有研究员的唯一契约。所有数据必须严格按此结构输出，禁止自由发挥字段名。
> 项目根目录：`D:\workspace\许愿池\projects\intelligence-archive`

## 0. 时间与真实性铁律

- 研究截止时间：**2026-11-02 23:59（Asia/Shanghai）**。晚于该日期的消息一律忽略，不得写入。
- 不得编造模型名称、发布日期、参数、能力、论文或链接。
- 只写「已核实」的东西：
  - `verified`：至少 1 个一手来源（官方公告 / 官方文档 / 官方论文 / 官方仓库 / 官方模型卡），且日期能从页面正文直接读到。
  - `partially-verified`：只有权威二手来源（主流科技媒体、学术索引）或官方只给了月份/季度。
  - `unverified`：仅见于传闻/聚合站/无日期。**unverified 条目不要放进 models.json / events.json**，只写进 notes 文件待查。
- 日期精度：宁可只写 `2026-08`，也不要补一个假的日。`displayDate` 必须与 `datePrecision` 一致。
- 严格区分日期类型 `dateType`：
  - `paper` 论文预印/发表
  - `announcement` 官方博客/新闻稿正式公布
  - `product` 产品上线/进入产品
  - `api` API 开放
  - `weights` 开放权重发布（Hugging Face 等）
  - `conference` 会议主题演讲 / 现场发布
  - `policy` 法规、行政令生效或签署
- 同一模型可能有多个日期：`announcementDate` 填「首次正式公开」，`availabilityDate` 填「首次公开可用」，`dateType` 填主时间轴采用的日期类型。主时间轴优先 `announcement`。
- 链接必须真实可访问。不允许用 `example.com`、搜索页、跳转短链。若只有论文，给 arXiv/期刊链接；若官方页面已迁移，给现状可用的官方页面。
- 文案：`summary` 用简体中文，60–140 字，陈述事实与机制，禁止营销词（"史上最强""碾压""彻底超越人类"）。`significance` 用简体中文，40–100 字，回答「它改变了什么」。
- 技术描述必须准确；不确定的规格（参数量、上下文长度、benchmark 分数）**留空**，不要猜。

## 1. 模型对象 Model

```json
{
  "id": "claude-opus-5-5",
  "name": "Claude Opus 5.5",
  "organization": "anthropic",
  "countryOrRegion": "US",
  "family": "Claude",
  "generation": "5.5",
  "announcementDate": "2026-09-22",
  "availabilityDate": "2026-09-22",
  "displayDate": "2026.09.22",
  "datePrecision": "day",
  "dateType": "announcement",
  "category": "agent",
  "tags": ["LLM", "Agent", "Coding"],
  "openWeights": false,
  "architecture": "未公开（闭源）",
  "parameters": null,
  "contextWindow": null,
  "capabilities": ["Agentic Coding", "Computer Use", "长任务执行"],
  "summary": "……",
  "keyAdvancement": "相对前代的主要变化，一句话，40–80 字。",
  "significance": "……",
  "predecessors": ["claude-opus-5"],
  "successors": [],
  "sources": [
    {"label": "Anthropic — Introducing Claude Opus 5.5", "url": "https://www.anthropic.com/claude-opus-5-5", "kind": "official"}
  ],
  "verificationStatus": "verified",
  "notes": null
}
```

字段规则：

| 字段 | 必填 | 说明 |
|---|---|---|
| id | 是 | kebab-case，全局唯一，建议 `org-family-version` |
| name | 是 | 官方名称，保留大小写（GPT-4o、DeepSeek-V3.2-Exp） |
| organization | 是 | 只能使用第 4 节的机构 ID |
| countryOrRegion | 是 | `US` `CN` `UK` `FR` `CA` `IL` `AE` `EU` 等 |
| family | 是 | 模型家族：`GPT` `o-series` `Claude` `Gemini` `Gemma` `Llama` `Grok` `Mistral` `DeepSeek-V` `DeepSeek-R` `Qwen` `QwQ` `GLM` `Kimi` `MiniMax-M` `Doubao` `ERNIE` `Spark` `Hunyuan` `Phi` `Nova` `Nemotron` `DALL·E` `Sora` `Stable Diffusion` `Veo` `Imagen` `Whisper` 等 |
| generation | 是 | 版本号字符串，如 `3.5` `V3` `K2` |
| announcementDate | 是 | `YYYY-MM-DD` / `YYYY-MM` / `YYYY` |
| availabilityDate | 可空 | 同上；未知填 null |
| displayDate | 是 | 展示用，点分格式，与精度一致：`2026.09.22` / `2026.08` / `2026` |
| datePrecision | 是 | `day` / `month` / `year` |
| dateType | 是 | 见第 0 节 |
| category | 是 | `language` `reasoning` `multimodal` `coding` `agent` `image` `video` `audio` `science` `other` |
| tags | 是 | 2–5 个短标签，可中文可英文 |
| openWeights | 是 | true / false / null（未知），有官方权重页才算 true |
| architecture | 是 | 如 `decoder-only Transformer` `MoE` `diffusion` `Mamba 混合`；闭源未披露写「未公开（闭源）」 |
| parameters | 可空 | 仅官方确认时填写，如 `671B total / 37B active` |
| contextWindow | 可空 | 仅官方确认，如 `1M tokens` |
| capabilities | 是 | 2–4 条，短词组 |
| summary | 是 | 中文 60–140 字 |
| keyAdvancement | 是 | 相对前代变化，40–80 字；无前代则写它首次做到什么 |
| significance | 是 | 中文 40–100 字 |
| predecessors | 是 | 指向本数据集内 id 数组；只连**真实技术继承或同家族直接前代**，不确定就留空 |
| successors | 是 | 同上，可留空（由整合时补全） |
| sources | 是 | 1–3 条；type 用 `official` `paper` `docs` `weights` `press` |
| verificationStatus | 是 | `verified` / `partially-verified` |
| notes | 可空 | 争议、日期差异说明 |

## 2. 历史事件对象 Event

```json
{
  "id": "dartmouth-1956",
  "date": "1956-08",
  "displayDate": "1956.08",
  "datePrecision": "month",
  "dateType": "conference",
  "title": "达特茅斯会议",
  "titleEn": "The Dartmouth Workshop",
  "category": "theory",
  "summary": "……（60–140 字）",
  "significance": "……（40–100 字）",
  "organizations": ["dartmouth-college"],
  "people": ["John McCarthy", "Marvin Minsky", "Claude Shannon", "Nathaniel Rochester"],
  "relatedModels": [],
  "chapter": 1,
  "sources": [{"label": "……", "url": "……", "kind": "official"}],
  "verificationStatus": "verified",
  "notes": null
}
```

- `category`：`theory` `breakthrough` `system` `product` `organization` `science` `policy` `hardware`
- `chapter` 使用整数：0 序章 / 1 = 1950–1979 / 2 = 1980–2011 / 3 = 2012–2017 / 4 = 2018–2022 / 5 = 2023–2024 / 6 = 2025 / 7 = 2026 / 8 终章。
- 事件与模型分开：**具体模型发版进 models.json**；理论、论文、机构、政策、并购、人物事件进 events.json。里程碑系统（Deep Blue、AlphaGo、Watson、AlexNet、AlphaFold）作为 event 建模，不放进 models。
- 事件不需要 `keyAdvancement`。
- 每个事件至少 1 个来源；理论类可给论文 DOI/arXiv 链接。

## 3. 机构对象 Organization

```json
{
  "id": "anthropic",
  "name": "Anthropic",
  "nameZh": "Anthropic",
  "countryOrRegion": "US",
  "founded": "2021",
  "focus": ["前沿 LLM", "AI 安全", "Agent"],
  "summary": "……30–80 字",
  "sources": [{"label": "……", "url": "……", "kind": "official"}]
}
```

## 4. 机构 ID 白名单（必须使用这些 id）

美国/其他：`openai` `anthropic` `google-deepmind` `meta` `xai` `mistral` `cohere` `nvidia` `amazon` `microsoft` `apple` `ibm` `allen-ai` `stability-ai` `midjourney` `black-forest-labs` `runway` `elevenlabs` `hugging-face` `stanford` `mit` `cmu` `dartmouth-college` `princeton` `toronto` `montreal` `deepmind`（2010–2023 独立时期事件可用）`openai-foundation` `ai21` `reka` `character-ai` `perplexity`
中国：`deepseek` `alibaba-qwen` `zhipu` `moonshot` `minimax` `bytedance` `baidu` `iflytek` `tencent` `shanghai-ai-lab` `stepfun` `baichuan` `01ai` `sensetime` `huawei` `xiaomi` `meituan` `ant-group`
政策/其他：`eu` `united-nations` `nist` `uk-government` `white-house` `china-government` `oecd`

**注意**：DeepMind 2014 年被 Google 收购、2023 年与 Google Brain 合并。2014 年后的 DeepMind 成果 organization 用 `google-deepmind`；2014 年前可用 `deepmind`。Google Brain 归 `google-deepmind`。不要因为同属 Alphabet 就强行混用。

## 5. 输出文件（按研究员分工）

| 研究员 | 交付文件 |
|---|---|
| foundations | `research/foundations.json` + `research/foundations-notes.md` |
| models-2018-2024 | `research/models-2018-2024.json` + `research/models-2018-2024-notes.md` |
| frontier-2025-2026 | `research/frontier-2025-2026.json` + `research/frontier-2025-2026-notes.md` |
| china-2025-2026 | `research/china-2025-2026.json` + `research/china-2025-2026-notes.md` |

JSON 顶层结构统一为：

```json
{
  "models": [],
  "events": [],
  "organizations": [],
  "meta": { "researcher": "…", "generatedAt": "2026-11-02", "cutoff": "2026-11-02" }
}
```

notes.md 必须包含：
1. 数据清单与条数；
2. 无法核实的名称/传闻（例如 GPT-6.1 Sol 究竟是否存在）及原因；
3. 日期冲突与取舍；
4. 关键来源 URL 列表；
5. 你认为主叙事必须采用的 8–15 个「不可错过节点」。

## 6. 去重与归属

- 2018-01-01 至 2024-12-31 的模型归 `models-2018-2024`；2025-01-01 至 2026-11-02 的模型归两个 2025-2026 研究员（按机构分）。
- **同一模型只出现在一个文件里**。跨期：首发在 2024、重大更新在 2025 的，2024 原版归 models-2018-2024，2025 新版另建 id 归 2025 研究员。
- 事件按发生时间归属；历史背景早于 1950 的（如 McCulloch-Pitts 1943、Hebb 1949）可作为 foundations 的 1–3 条前史，但主时间轴从 1950 开始，`chapter` 填 1。
- 共享 id 冲突时由整合员以「发布日期更早者为父」的规则合并，研究员不要跨文件互连过多。

## 7. 质量自检（提交前必做）

- [ ] 每条 model 至少 1 个可访问来源，日期与来源正文一致
- [ ] 没有 model 与 event 重复描述同一发布（模型发版 → model；会议/论文/政策 → event）
- [ ] 所有 id 唯一，predecessors/successors 只引用真实存在的 id 或留空
- [ ] 没有把「传闻月份」写成精确日
- [ ] 没有 2026-11-02 之后的内容
- [ ] 中文文案无营销词、无「首个/最强」等未证实断言
