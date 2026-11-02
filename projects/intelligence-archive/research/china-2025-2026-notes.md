# 中国模型与事件研究笔记（2025-01-01 → 2026-11-02）

研究员：china-2025-2026 ｜ 截止日：2026-11-02（Asia/Shanghai）
交付：`research/china-2025-2026.json` + 本文件

---

## 1. 数据清单与条数

| 项目 | 数量 | 说明 |
|---|---|---|
| models | **41** | 全部为 2025-01-01 至 2026-11-02 首次公开的中国机构模型 |
| events | **11** | 政策 2、科学 2、会议/机构 2、产品 2、算力基建 1、理论 1、生态规模 1 |
| organizations | **0** | 按分工只写 models/events，机构条目交由整合员统一撰写，避免与 foundation 研究员重复 |
| verificationStatus = verified | models 40 / events 8 | 均有至少 1 个一手来源（官方公告、官方文档、官方模型卡、官方仓库），日期可从来源读到 |
| verificationStatus = partially-verified | models 1 / events 3 | 仅取得权威二手或地方政府转载来源，已在 `notes` 字段写明原因 |

按机构分布（models）：

```
deepseek 13 · alibaba-qwen 8 · moonshot 6 · zhipu 4 · minimax 3
bytedance 1 · baidu 1 · shanghai-ai-lab 1 · stepfun 1
ant-group 1 · meituan 1 · xiaomi 1
```

覆盖家族：DeepSeek-V / DeepSeek-R、Qwen、GLM、Kimi、MiniMax-M、Seed-OSS、ERNIE、Intern、Step、Ling、LongCat、MiMo。

### 1.1 日期证据方法（重要）

对开放权重模型，除官方公告外，本次系统性地使用了 **Hugging Face 官方组织仓库的 `createdAt`**（经 `https://huggingface.co/api/models/<repo>` 读取）作为一手时间证据；同时用 **GitHub API 的 `created_at`** 交叉核对（如 `deepseek-ai/DeepSeek-R1` = 2025-01-20，与官方公告完全一致）。
规则：**官方公告有明确日期时以公告为准；只有仓库时间时，降级为「月」精度**，并在该条 `notes` 中注明仓库创建时间。这样既不补假日，也不丢节点。

---

## 2. DeepSeek-V4 系列与 V4.1 Flash 核验结论（重点）

**结论：DeepSeek-V4.1-Flash 真实存在，已按官方来源写入 models；「V4.1」（非 Flash 的基座 / V4.1-Pro）截至 2026-11-02 尚未发布。**

核验路径与证据：

| 事实 | 依据 | 判定 |
|---|---|---|
| V4 发布（2026-04-24，预览 + 开源权重） | `api-docs.deepseek.com/news/news260424`，正文写明 V4-Pro 1.6T/49B、V4-Flash 284B/13B、默认 1M 上下文 | 确认 |
| V4-Pro GA（2026-08-13） | `api-docs.deepseek.com/news/news260813.md`（指定 URL，HTTP 200）＋ Change Log 同日条目 | 确认 |
| V4-Flash-0731 更新（2026-07-31） | Change Log：架构尺寸不变、仅重做后训练 | 确认（未单列 model，避免与 V4-Flash 重复） |
| V4-Flash-Vision-Exp（2026-08-21） | Change Log 同日条目 | 确认，已写入 |
| **V4.1-Flash（2026-09-10）** | `news260910`：552B MoE、因果编码器—解码器、输入 8B / 输出 16B 激活、原生多模态、KV cache 1/4 HBM；Change Log 同日条目；HF `deepseek-ai/DeepSeek-V4.1-Flash` 仓库创建于 2026-09-10 02:17 UTC | **确认存在，已写入** |
| V4.1-Flash-1017（2026-10-17） | `news261017` ＋ Change Log；HF 仓库创建于 2026-10-17 | 确认，已写入 |
| V4.1（基座）/ V4.1-Pro | `news260910` 原文：`deepseek-v4-pro` 请求路由到 V4.1-Flash「until V4.1-Pro launches」；`/news` 最新条目为 2026-10-17，无 V4.1-Pro 或 V4.1 基座公告；DeepSeek HF 组织最新仓库为 V4.1-Flash-1017 | **未发布，不写入** |
| R2 | `/news` 与 Change Log 全量索引（2024-05-17 至 2026-10-17）中**没有任何 R2 条目**；HF/GitHub 组织下无对应权重仓库 | **无官方证据，不写入（视为未发布）** |

补充说明：Change Log 2026-10-17 条目中「Compared with the previous DeepSeek V4.1」一句，指的是上一版 V4.1-Flash（0910），不是独立的 V4.1 基座模型 —— 这是本次最容易误判的一处，已在 models 的 `notes` 与本节标注。

---

## 3. 无法核实 / 未写入的名称与传闻

原则：查不到官方含日期来源的，一律只记在这里，不写进 models / events。

### 3.1 存在但细节未核实（仓库/页面确认，缺官方技术说明）

| 名称 | 可确认的事实 | 未写入原因 |
|---|---|---|
| MiniMax-M2.1 / M2.5 / M2.7 / M3.1-Flash | 官方 HF 仓库存在，创建于 2025-12-20 / 2026-02-12 / 2026-04-09 / 2026-10-17 | 未取得官方架构与评测说明，`keyAdvancement` 无法基于事实撰写 |
| GLM-5.1 / GLM-5.2 / GLM-5.3 | 官方 HF 仓库创建于 2026-04-03 / 2026-06-16 / 2026-08-25 | 同上；GLM-5 主版本已入库 |
| Kimi K2.6 / K2.7-Code | 官方 HF 仓库创建于 2026-04-14 / 2026-06-11 | 同上 |
| Kimi K3.1 Pro | 官方文档已上线（`platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart`），文档称「完整模型权重将于 11 月 4 日前发布」 | 落在 2026-11-02 截止日边界，权重与正式公告日期均无法确证，故不入库 |
| InternLM3-8B（2025-01）、Intern-S2-397B（2026-09） | 官方 HF 仓库创建于 2025-01-13 / 2026-09-13 | 未取得含日期的官方技术说明 |
| Steps：Step-3 / Step-3.5-Flash / Step-3.7-Flash | HF 组织下 Step-3.5-Flash 与 Step-3.7-Flash 仓库存在（2026-03 / 2026-05）；`stepfun-ai/Step-3` 仓库 404 | Step-3 无法确认仓库与日期，改以已核实的 Step-5-Preview 入库 |
| LongCat-2.0（2026-07）、MiMo-V2.5 / V2.6（2026-04 / 2026-09） | 官方 HF 仓库存在 | 细节未取得 |

### 3.2 完全未取得官方来源（点名但未覆盖）

- **字节豆包 1.5（2025-01）/ 豆包 2.0（2026）/ Seed1.5 / Seed2 / Seedream / Seedance**：均为闭源产品，火山引擎与 Seed 官网为动态渲染页面，本次未能取得含日期的官方公告正文。已入库的字节条目只有开源的 `Seed-OSS-36B`（模型卡内含 2025-08-20 发布记录）。
- **百度 ERNIE 4.5 首发（2025-03）与 ERNIE 5.0（2025-11）**：仅有二手报道，未取得可访问的官方公告页。已入库的是开源的 `ERNIE-4.5-300B-A47B`（HF 模型卡信息完整）。
- **讯飞星火 X1 / X2**：`xinghuo.xfyun.cn` 与 `xfyun.cn` 均为动态渲染，未取得含日期的官方页面；讯飞在 Hugging Face 无官方组织。
- **腾讯混元 TurboS**：未取得官方含日期页面。`HunyuanVideo` 的 HF 仓库创建于 2024-12-01，早于本文件时间窗口，归 2024 条目。
- **华为盘古 5.0**：闭源，未取得官方公告页。
- **Qwen4**：官方在 `Qwen3.8-Flash-Next` 博客中明确其为「Qwen4 所用架构的早期预览」，并称「将继续朝 Qwen4 演进」——**即 Qwen4 尚未发布**。Qwen3.6 / Qwen3.7 系列在官方文中被提及（Qwen3.7-Plus 作为对照基线），但未取得逐条公告日期，故未入库。
- **Yi（01.AI）、Baichuan、商汤日日新**：本次未分配到核验时间预算，未覆盖。
- **生成式 AI 备案的具体数量**：`2025 年生成式 AI 服务已备案信息` 只取到地方政府转载页，为避免转述误差，事件条目未写具体备案数字。

---

## 4. 日期冲突与取舍

| 模型/事件 | 冲突 | 取舍 |
|---|---|---|
| Qwen3 | HF 仓库 2025-04-27 vs 官方博客 2025-04-29 | 取 2025-04-29（公告日），在 notes 注明仓库时间 |
| Qwen3-Next | HF 2025-09-09 vs 官方博客 2025-09-12 | 取 2025-09-12 |
| Qwen3-Omni / Qwen3-VL / Qwen3-Max | 官方只在云栖大会（9 月下旬）与产品页发布，无独立英文公告日 | 统一取 `2025-09` 月份精度 |
| GLM-4.5 | HF/GitHub 仓库 2025-07-20 vs 公开宣布约 2025-07-28 | **取月份精度 2025-07**，不猜日 |
| GLM-4.6 / GLM-5 / GLM-4.5V | 官方博客 JS 渲染，正文日期不可抓取 | 以官方仓库创建时间定月份（2025-09 / 2026-02 / 2025-08） |
| Kimi K2 | GitHub 仓库 2025-07-03（提前建仓）vs 官方发布日志 2025-07-11 | 取 2025-07-11 |
| Kimi K2 Thinking | HF 2025-11-04 vs 官方发布日志 2025-11-06 | 取 2025-11-06 |
| MiniMax-M1 | HF 2025-06-05 / GitHub 2025-06-14 | 取月份 2025-06 |
| MiniMax-M2 | HF 2025-10-22 / GitHub 2025-10-25 | 取月份 2025-10 |
| DeepSeek-V3.2-Speciale | HF 2025-11-28 vs 官方公告 2025-12-01 | 取公告日 2025-12-01 |
| 云栖大会 2025 | 会议 9 月下旬，官方新闻稿 2025-09-29 | 事件取月份 2025-09 |
| 国务院「人工智能+」意见 | 成文 2025-08-21 / 发布 2025-08-26 | 事件取**发布日期** 2025-08-26，notes 注明成文日期 |

原则回顾：宁可只写月份，也不补一个看起来精确的假日子；`displayDate` 与 `datePrecision` 严格一致。

---

## 5. 关键来源 URL

**DeepSeek（全部一手）**
- 变更日志（含 2025-01-20 至 2026-10-17 全部条目）：https://api-docs.deepseek.com/updates
- R1 发布：https://api-docs.deepseek.com/news/news250120
- V3.1：https://api-docs.deepseek.com/news/news250821
- V3.2-Exp：https://api-docs.deepseek.com/news/news250929
- V3.2 / Speciale：https://api-docs.deepseek.com/news/news251201
- V4 预览：https://api-docs.deepseek.com/news/news260424
- V4-Pro GA：https://api-docs.deepseek.com/news/news260813.md
- **V4.1-Flash**：https://api-docs.deepseek.com/news/news260910
- V4.1-Flash-1017：https://api-docs.deepseek.com/news/news261017

**阿里 / Qwen**
- Qwen3：https://qwenlm.github.io/blog/qwen3/
- Qwen3-Coder：https://qwenlm.github.io/blog/qwen3-coder/
- Qwen3-Next：https://www.alibabacloud.com/blog/qwen3-next-a-new-generation-of-ultra-efficient-model-architecture-unveiled_602536
- Qwen3-Omni：https://www.alibabacloud.com/blog/qwen3-omni-natively-omni-modal-foundation-models_602581
- 云栖大会 2025（Qwen3-Max / VL / Omni）：https://www.alibabagroup.com/document-1911884625546838016
- Qwen3.5：https://www.alibabagroup.com/zh-HK/document-1960233590314762240
- Qwen3.8-Flash-Next：https://www.alibabacloud.com/blog/qwen3-8-flash-next-a-new-architecture-towards-ultimate-cost-efficiency_603501
- 2025 年回顾（3800 亿投资、NeurIPS 最佳论文、千问 App、夸克眼镜、Baguan-Seasonal）：https://www.alibabacloud.com/blog/from-models-to-momentum-how-alibaba-turned-artificial-intelligence-into-a-real-world-utility-in-2025_602797

**智谱 / 月之暗面 / MiniMax**（模型卡为首要事实来源）
- https://huggingface.co/zai-org/GLM-4.5 ｜ `/GLM-4.5V` ｜ `/GLM-4.6` ｜ `/GLM-5`
- Kimi 开放平台发布日志（含逐条日期）：https://platform.kimi.ai/blog/posts/changelog
- Kimi K3 文档（2.8T / KDA / 1M）：https://platform.kimi.com/docs/guide/kimi-k3-quickstart
- https://huggingface.co/moonshotai/Kimi-K2-Instruct ｜ `/Kimi-K2-Instruct-0905` ｜ `/Kimi-K2-Thinking` ｜ `/Kimi-K2.5` ｜ `/Kimi-K3`
- https://huggingface.co/MiniMaxAI/MiniMax-M1 ｜ `/MiniMax-M2` ｜ `/MiniMax-M3`

**其他中国机构**
- 字节：https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct
- 百度：https://huggingface.co/baidu/ERNIE-4.5-300B-A47B-PT
- 上海 AI Lab：https://huggingface.co/internlm/Intern-S1
- 阶跃：https://huggingface.co/stepfun-ai/Step-5-Preview ｜ https://www.stepfun.com/step-5-preview
- 蚂蚁：https://huggingface.co/inclusionAI/Ling-1T
- 美团：https://huggingface.co/meituan-longcat/LongCat-Flash-Chat
- 小米：https://huggingface.co/XiaomiMiMo/MiMo-7B-RL

**政策**
- 国务院「人工智能+」意见：https://www.gov.cn/zhengce/zhengceku/202508/content_7037862.htm

---

## 6. 主叙事建议：15 个「不可错过节点」

按时间顺序，建议作为 2025–2026 中国线主干的节点（均已在 JSON 中）：

1. **2025-01-20 · DeepSeek-R1** — MIT 许可开源 o1 级推理模型，点燃全球开源复现潮，中国模型首次成为能力定义者。
2. **2025-04-29 · Qwen3** — Apache 2.0 全尺寸矩阵 + 双思考模式，此后长期占据全球衍生模型榜首。
3. **2025-07-11 · Kimi K2** — 1T MoE 配 MuonClip 零不稳定训练，把开源上限推到万亿参数。
4. **2025-07-22 · Qwen3-Coder** — 执行驱动代码 RL + 两万并行环境，开源模型首次真正进入软件工程流水线。
5. **2025-08-26 · 国务院「人工智能+」意见** — 首次把智能体普及率写成量化国家目标。
6. **2025-09-12 · Qwen3-Next** — 混合线性注意力（Gated DeltaNet + Gated Attention）落地，成为后续 Qwen3.5/3.8 的架构母体。
7. **2025-09-29 · DeepSeek-V3.2-Exp** — DSA 稀疏注意力 + API 降价 50%，成本战开打。
8. **2025-10 · MiniMax-M2** — 230B/10B 激活的 MIT 模型，证明「小激活 + Agent 数据」可替代参数堆叠。
9. **2025-11-06 · Kimi K2 Thinking** — 思考模式并入 K2 主线，推理能力商品化。
10. **2025-12-01 · DeepSeek-V3.2 与 Speciale** — 思考嵌入工具调用；Speciale 在 IMO/IOI 2025 达金牌级。
11. **2026-02-16 · Qwen3.5-397B-A17B** — 原生多模态 + 201 语言 + 8.6 倍解码吞吐，效率叙事取代规模叙事。
12. **2026-02 · GLM-5** — 744B/40B 并**跨机构采纳 DeepSeek 的 DSA**，稀疏注意力成为行业公共设施。
13. **2026-04-24 · DeepSeek-V4** — 1M 上下文成为默认，中国开源旗舰与闭源前沿同档。
14. **2026-06 · Kimi K3** — 2.8T 参数 + KDA 线性注意力，开源权重规模再上一个量级。
15. **2026-09-10 · DeepSeek-V4.1-Flash** — 因果编码器—解码器非对称架构、KV cache 压到 1/4，成本优势直接转化为旧型号退役。

若只能保留 5 个：R1 → Qwen3 → Kimi K2 → V3.2-Exp(DSA) → V4.1-Flash。

---

## 7. 给整合员的提示

1. **不要重复**：DeepSeek-V4-Pro 的 GA（2026-08-13）与 V4.1-Flash 对 V4-Pro 的路由，都已写进对应 model 的 `notes`，不要再做成独立 event。
2. **跨文件继承关系**：`deepseek-v3-0324` 的 `predecessors` 留空，因为 2024-12-26 的 DeepSeek-V3 由 models-2018-2024 研究员负责，整合时请手工接上。
3. **同一模型只出现一次**：V4-Flash-0731、V4-Pro 的 GA 版本、V4.1-Flash-1017 中，前者与 GA 未单列（作为 notes），1017 因有独立权重与独立 API 行为而单列。
4. **partially-verified 三条事件**（R1 Nature 封面、WAIC 2025、2025 年备案公告）建议在终稿前补一次一手页直连核验，尤其 Nature 的 DOI 页面。
5. `organizations` 数组按分工留空，请勿视为缺漏。


---

## 核查后更正（Lead 处理，2026-11-02）

- `gpt-6-astra`：月份 2026-10 → 2026-09，availabilityDate 补为 2026-09-08（AWS Bedrock 模型卡），并补 context window 1,050,000 tokens。
- 新增 `gpt-6-1-sol`：2026-09-29，来源 OpenAI Model Release Notes + AWS Bedrock 模型卡。此前 notes 中「GPT-6.1 Sol 不存在」的结论作废。
- `kimi-k3`：月份 2026-06 → 2026-07，核实状态降为 partially-verified（官方文档无日期，媒体与公告窗口指向 7 月）。
