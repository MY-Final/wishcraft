# THE INTELLIGENCE ARCHIVE · 智能编年史

> 从图灵的第一个问题，到能够自主执行任务的人工智能。
> 一部可滚动、可探索、可查证的交互式人工智能史（1950 — 2026.11.02）。

这不是一份时间轴网站。它是一个由滚动叙事、三维几何与可核查档案组成的交互式纪录片：序章从一条光标开始，经过符号主义、连接主义、深度学习、Transformer、生成式模型、推理模型，最终抵达能够调用工具、执行任务的智能体。终点没有结论，只有一个新的问题。

---

## 快速开始

环境要求：Node.js ≥ 20，pnpm ≥ 9。

```bash
pnpm install
pnpm dev          # http://127.0.0.1:5178
pnpm build        # 类型检查 + 生产构建，产物在 dist/
pnpm preview      # 预览构建产物
```

数据工具：

```bash
pnpm merge:data      # 合并 research/*.json → src/data/*.json
pnpm validate:data   # 校验数据契约（日期精度、来源、引用、章节等）
pnpm check:links     # 检查所有 source URL 是否可访问
```

> 首次运行前 `src/data/*.json` 已包含合并后的完整数据，无需联网即可完整体验。
> 当前数据规模：**181 个模型 / 93 条历史事件 / 44 家机构**（截至 2026-11-02）；其中 142 个模型、76 条事件为 `verified`，其余为 `partially-verified`。

---

## 体验结构

| 章节 | 标题 | 年份 | 核心问题 |
|---|---|---|---|
| 序章 | THE FIRST QUESTION | 1950 | 机器能够思考吗？ |
| 01 | THE BIRTH OF A QUESTION | 1950–1979 | 智能如何成为一个可研究的问题？ |
| 02 | MACHINES LEARN | 1980–2011 | 规则失效之后，机器如何从数据中学习？ |
| 03 | THE DEEP LEARNING REVOLUTION | 2012–2017 | 深度网络与注意力机制改变了什么？ |
| 04 | LANGUAGE BECOMES GENERATIVE | 2018–2022 | 机器如何开始生成语言？ |
| 05 | THE GLOBAL MODEL RACE | 2023–2024 | 模型为什么变成一场全球竞赛？ |
| 06 | THE AGE OF REASONING | 2025 | 从回答问题到进行推理，发生了什么？ |
| 07 | THE AGE OF ACTION | 2026 | 从生成答案到执行任务，边界在哪里？ |
| 终章 | THE QUESTION REMAINS | 1950–2026 | 当智能不再只属于人类，我们如何理解自己？ |

除主叙事外，`#/archive` 提供完整模型档案：实时搜索、按年份/机构/家族/类别/国家/核实状态筛选、日期排序、模型详情、真实继承关系图谱与历史事件档案。

---

## 项目结构

```
intelligence-archive/
├─ docs/
│  ├─ BUILD_BRIEF.md       设计系统、章节母题、架构与协作规范
│  ├─ DATA_SCHEMA.md       数据契约与研究方法（日期类型、核实等级）
│  ├─ DATA_REPORT.md       数据统计、冲突、无法核实项、死链报告
│  ├─ VERIFICATION.md      独立核查记录（PASS / PARTIAL / FAIL 与修正状态）
│  ├─ QA_REPORT.md         构建、交互、性能、降级验收报告
│  ├─ SOURCES.md           模型 → 一手来源索引（人工抽查用）
│  └─ screens/             桌面 / 移动端验收截图
├─ research/
│  ├─ foundations.json     1950–2017 事件
│  ├─ models-2018-2024.json
│  ├─ china-2018-2024.json
│  ├─ frontier-2025-2026.json
│  ├─ china-2025-2026.json
│  ├─ *-notes.md           每位研究员的方法、冲突与剔除记录
│  └─ quarantine.json      整合时被隔离的条目（保留原始内容）
├─ scripts/
│  ├─ merge-data.mjs       合并、去重、规范化、隔离
│  ├─ validate-data.mjs    数据契约校验
│  └─ check-links.mjs      来源可达性检查
├─ src/
│  ├─ data/                types.ts · index.ts · chapters.ts · *.json
│  ├─ lib/                 滚动状态、滚动编排、格式化、reveal
│  ├─ styles/              tokens.css · base.css · fonts.css
│  ├─ components/          TopNav · YearRail · Provenance
│  ├─ three/               NarrativeCanvas · NetworkStage · ConstellationStage
│  ├─ sections/            prologue · ch01–ch07 · finale
│  ├─ archive/             搜索、筛选、详情、关系图谱
│  └─ views/               NarrativeView · ArchiveView · AboutView
├─ public/fonts/           自托管拉丁字体子集
├─ tools/                  截图与字体抓取脚本
└─ index.html
```

---

## 数据模型

历史事件与 AI 模型分开建模，均包含 `sources`、`verificationStatus` 与日期精度字段。

- **Model**：`id` `name` `organization` `countryOrRegion` `family` `generation` `announcementDate` `availabilityDate` `displayDate` `datePrecision` `dateType` `category` `architecture` `capabilities` `summary` `keyAdvancement` `significance` `predecessors` `successors` `sources` `verificationStatus`
- **HistoryEvent**：`id` `date` `displayDate` `datePrecision` `dateType` `title` `titleEn` `category` `summary` `significance` `organizations` `people` `relatedModels` `chapter` `sources` `verificationStatus`
- **Organization**：`id` `name` `nameZh` `countryOrRegion` `founded` `focus` `summary` `sources`

日期遵守三条规则：

1. 严格区分 `paper` / `announcement` / `product` / `api` / `weights` / `conference` / `policy`；
2. 主时间轴采用**首次官方公开发布日期**，并标注日期类型；
3. 只查到年月就只写年月，绝不补齐不存在的日。

核实等级：`verified`（一手来源且日期可读证）· `partially-verified`（二手来源或官方只给月份/季度）· `unverified`（不得进入档案，只留在研究笔记）。

---

## 维护与更新

### 新增一条模型记录

1. 在对应 `research/*.json` 的 `models` 数组中追加对象（字段见 `docs/DATA_SCHEMA.md`）；
2. 确认 `sources` 至少一条指向官方公告 / 文档 / 论文 / 权重页，并能从页面读到日期；
3. 运行：

```bash
pnpm merge:data
pnpm validate:data
pnpm check:links
pnpm dev
```

4. 打开 `#/archive` 检查详情与关系图；若新增了 `predecessors`，合并脚本会自动补全对方的 `successors`。

### 修改叙事章节

章节文件位于 `src/sections/`。文字与日期必须从 `src/data` 读取，不要硬编码历史日期或型号。滚动编排使用 `useStageProgress` 写入 CSS 变量 `--p`，避免每次滚动触发 React 重渲染。

### 数据合并规则

- 同一 `id` 只保留一条模型记录，合并 `sources` / `capabilities`，取更早的 `announcementDate` 与更完整的文案；
- 缺少 `id` / `name` / 日期 / `sources` 的条目不进入档案，写入 `research/quarantine.json` 并在 `DATA_REPORT.md` 说明；
- 晚于研究截止日（2026-11-02）的记录一律拒绝；
- `successors` 由 `predecessors` 反推补全，不凭空推断机构内的「技术继承」。

---

## 真实性声明

- 所有历史资料来自公开的官方公告、论文与技术文档。链接为真实来源，不使用跳转短链或伪造页面。
- 研究截止于 **2026 年 11 月 2 日**。此后发布不进入本档案。
- 独立核查阶段（`docs/VERIFICATION.md`）发现并修正了三处问题：**GPT-6.1 Sol 真实存在**（2026-09-29，AWS Bedrock 模型卡 / OpenAI Release Notes），已补录；**GPT-6 Astra** 公告月份由 2026-10 更正为 2026-09（availability 2026-09-08）；**Kimi K3** 月份由 2026-06 更正为 2026-07 并降为部分核实。修正过程保留在 `docs/DATA_REPORT.md` 顶部。
- 无法核实的型号、日期与规格不会被补全；`docs/DATA_REPORT.md` 保留这些空白与冲突。
- 本作品为独立的交互式研究项目，与任何模型厂商无隶属关系；所有模型与机构名称归其各自所有者。
- 叙事中的注意力连线、推理树、Agent 工作系统均为**概念性可视化**，不代表任何模型的真实内部状态。

---

## 技术

Vite · React 19 · TypeScript（strict）· Three.js / React Three Fiber · 原生 CSS（设计 token + 每组件样式）· 自托管 Inter Tight / IBM Plex Mono。

- 单一 WebGL 上下文承载全站纪念碑演化；交互场景（第二章网络、第五章星图）在章节内独立初始化并在不可见时暂停。
- 尊重 `prefers-reduced-motion`；WebGL 不可用时页面以排印与 CSS/SVG 完整降级。
- 无后端、无外部 API、无追踪脚本；构建产物可静态部署。
