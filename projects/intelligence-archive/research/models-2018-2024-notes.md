# models-2018-2024 研究笔记

> 研究员：`research-intl-2018-24`｜交付文件：`research/models-2018-2024.json`｜生成时间：2026-11-02｜研究窗口：2018-01-01 至 2024-12-31
> 字段与枚举严格遵循 `docs/DATA_SCHEMA.md`；所有条目均为国际（非中国实验室）模型与事件。

## 0. 交付与校验口径

- 顶层结构：`{ models, events, organizations, meta }`；`organizations` 留空（机构对象由 foundations / 整合阶段统一维护，避免多研究员 id 冲突）。
- 自动校验（node 脚本）全部通过：JSON 可解析；`id` 全局唯一（50 models + 20 events 无重复）；`datePrecision` 与 `announcementDate` / `displayDate` 格式一致；无 2025 及以后日期；`predecessors` / `successors` / `relatedModels` 无悬空引用；每条 model 与 event 至少 1 条 `kind: "official"` 来源；`organization` 全部命中白名单。
- 文案字数口径：按**去除空白后的字符数**统计（中文标点、数字、英文算 1 字）。`summary` 60–140、`significance` 40–100、`keyAdvancement` 40–80，已逐条校验通过。

## 1. 数据清单与条数

**50 个模型 + 20 条事件。**

按机构分布（models）：openai 16、anthropic 9、google-deepmind 9、meta 5、mistral 3、xai 2、cohere 2、stability-ai 1、microsoft 1、amazon 1、nvidia 1。

按年份分布（models）：2018 年 2、2019 年 2、2020 年 1、2021 年 4、2022 年 7、2023 年 11、2024 年 23。

模型清单（按时间序）：

| 日期 | id | 名称 |
|---|---|---|
| 2018.06.11 | gpt-1 | GPT-1 |
| 2018.10.11 | bert | BERT |
| 2019.02.14 | gpt-2 | GPT-2 |
| 2019.10.23 | t5 | T5 |
| 2020.05.28 | gpt-3 | GPT-3 |
| 2021.01.05 | dall-e | DALL·E |
| 2021.01.05 | clip | CLIP |
| 2021.05.18 | lamda | LaMDA |
| 2021.08.10 | codex | Codex |
| 2022.01.27 | instructgpt | InstructGPT |
| 2022.04.04 | palm | PaLM |
| 2022.04.06 | dall-e-2 | DALL·E 2 |
| 2022.05.23 | imagen | Imagen |
| 2022.09.21 | whisper | Whisper |
| 2022.11.30 | chatgpt | ChatGPT |
| 2023.02.24 | llama | LLaMA |
| 2023.03.14 | claude | Claude |
| 2023.03.14 | gpt-4 | GPT-4 |
| 2023.07.11 | claude-2 | Claude 2 |
| 2023.07.18 | llama-2 | Llama 2 |
| 2023.09.27 | mistral-7b | Mistral 7B |
| 2023.11 | grok-1 | Grok-1（月精度） |
| 2023.11.06 | gpt-4-turbo | GPT-4 Turbo |
| 2023.11.21 | claude-2-1 | Claude 2.1 |
| 2023.12.06 | gemini-1-0 | Gemini 1.0 |
| 2023.12.11 | mixtral-8x7b | Mixtral 8x7B |
| 2024.02.15 | sora | Sora |
| 2024.02.15 | gemini-1-5 | Gemini 1.5 Pro |
| 2024.02.21 | gemma | Gemma |
| 2024.02.26 | mistral-large | Mistral Large |
| 2024.03.04 | claude-3-opus / claude-3-sonnet / claude-3-haiku | Claude 3 家族 |
| 2024.03.11 | command-r | Command R |
| 2024.04.04 | command-r-plus | Command R+ |
| 2024.04.18 | llama-3 | Llama 3 |
| 2024.04.23 | phi-3 | Phi-3 |
| 2024.05.13 | gpt-4o | GPT-4o |
| 2024.06.14 | nemotron-4-340b | NVIDIA Nemotron-4 340B |
| 2024.06.20 | claude-3-5-sonnet | Claude 3.5 Sonnet |
| 2024.07.23 | llama-3-1 | Llama 3.1 |
| 2024.08.13 | grok-2 | Grok-2 |
| 2024.09.12 | o1-preview | OpenAI o1-preview |
| 2024.09.25 | llama-3-2 | Llama 3.2 |
| 2024.10.22 | claude-3-5-sonnet-20241022 | Claude 3.5 Sonnet (new) |
| 2024.10.22 | claude-3-5-haiku | Claude 3.5 Haiku |
| 2024.12.03 | amazon-nova | Amazon Nova |
| 2024.12.05 | o1 | OpenAI o1 |
| 2024.12.11 | gemini-2-0 | Gemini 2.0 |

模型条目中 2022 年之前仅 1 个 2020 年条目（GPT-3），因为 **AlphaFold 2 按 DATA_SCHEMA §2 作为 event 建模**（里程碑系统不进 models），同理 AlphaFold 3、诺贝尔奖、EU AI Act 均为事件。

事件清单（20 条，按时间序）：

| 日期 | id | 类型 |
|---|---|---|
| 2019.02.14 | gpt-2-staged-release | policy |
| 2019.10.25 | bert-search-rollout | product |
| 2020.01.23 | scaling-laws-2020 | theory |
| 2020.06.11 | openai-api-launch | product |
| 2020.11.30 | alphafold-2-2020 | science |
| 2021.04.21 | eu-ai-act-proposal-2021 | policy |
| 2022.03.29 | chinchilla-2022 | theory |
| 2022.10.04 | us-ai-bill-of-rights-2022 | policy |
| 2022.12.15 | constitutional-ai-2022 | theory |
| 2023.01.23 | microsoft-openai-expand-2023 | organization |
| 2023.01.26 | nist-ai-rmf-2023 | policy |
| 2023.04.20 | google-deepmind-merger-2023 | organization |
| 2023.09.25 | amazon-anthropic-2023 | organization |
| 2023.10.30 | us-ai-executive-order-2023 | policy |
| 2023.11.01 | bletchley-declaration-2023 | policy |
| 2023.11.17 | openai-board-crisis-2023 | organization |
| 2024.03.13 | eu-ai-act-adopted-2024 | policy |
| 2024.05.08 | alphafold-3-2024 | science |
| 2024.10.08 | nobel-physics-2024 | science |
| 2024.10.09 | nobel-chemistry-2024 | science |

## 2. 无法核实的名称 / 传闻及原因

| 对象 | 处理 | 原因 |
|---|---|---|
| Midjourney（2022 公开测试） | **未收录**，仅在此记录 | 官方站点没有带日期的发布公告，公开测试日期只见于媒体与 Discord 社群记录；无法找到「日期可从官方页面读到」的一手来源，按 §0 不写入 models。整合阶段若要收，需用 `press` 来源并标 `partially-verified`。 |
| GPT-4 参数量、训练数据 | `parameters: null` | OpenAI 从未公开，技术报告亦明确不披露。 |
| ChatGPT 底层模型标识 | `parameters/contextWindow: null`，architecture 只写「基于 GPT-3.5 的对话微调模型（RLHF）」 | 官方公告未给出确切模型名与规格，`gpt-3.5-turbo` 与 `text-davinci-003` 的对应关系官方从未确认。 |
| o1 正式版上下文 / 参数 | `null` | 未公开；本环境无法读取 platform 文档中的官方规格表。 |
| Gemini 2.0 上下文 / 参数 | `null` | 公告页只讲能力与分发，未给出规格数字。 |
| Phi-3 上下文长度 | `null` | 官方博客只说 mini 默认短上下文、另有长上下文变体，未同时给出截图可核的数值。 |
| Amazon Nova 参数量 | `null` | 官方只披露分档与价格，不披露参数。 |
| DALL·E 2 开放测试日 | `availabilityDate: null` | 2022 年 7 月起分批开放，具体日期未从官方页面读到。 |
| Grok-1 精确公告日 | `datePrecision: "month"`，`2023-11` | x.ai 在本研究环境不可达；多方记载公布于 2023-11-03 至 11-05 之间，按 §0「宁可只写月份」处理，标 `partially-verified`。 |
| Grok-2 公告日 | 日期保留 `2024-08-13`，标 `partially-verified` | 同上，x.ai 页面不可直接读取。 |
| Veo（2024.05.14 I/O） | 暂未收录 | 条目数按任务上限控制在 50；视频线已由 Sora 与 Gemini 覆盖，建议 2025–2026 研究员补 Veo 2/3。 |

## 3. 日期冲突与取舍

1. **LLaMA**：官方博客 2023-02-24；arXiv 论文 v1 提交 2023-02-27。主时间轴取 **2023-02-24**（announcement），并在 `notes` 注明论文日期。
2. **DALL·E 2**：官方页面本身不显示日期；arXiv 2204.06125 于 2022-04-13 提交；媒体与多方记载公布日为 **2022-04-06**。采用 2022-04-06 且标 `partially-verified`，`notes` 写明取舍。
3. **PaLM**：官方博客 2022-04-04，论文 2022-04-05。取 2022-04-04，两个来源都列出。
4. **Whisper**：博客 2022-09-21（开源发布），论文 2022-12-06。取 2022-09-21，`dateType: weights`。
5. **GPT-2**：`announcementDate` 2019-02-14，`availabilityDate` 2019-11-05（15 亿参数完整权重发布）。
6. **o1 正式版**：2024-12-05 进入 ChatGPT 并发布系统卡；开发者侧快照 `o1-2024-12-17` 于 12 月 17 日进 API。主时间轴取 **2024-12-05**，`notes` 说明 API 日期。
7. **Claude 3 Haiku / Claude 3.5 Haiku**：均在公告日（2024-03-04 / 2024-10-22）公布、当月稍后上线，官方未给确切上线日，故 `availabilityDate: null`。
8. **EU AI Act 三个时点**：2024-03-13 欧洲议会通过（事件主日期）、2024-05-21 理事会批准、2024-08-01 生效。三者写入 `notes` 与 `summary`，只建一条 event 避免重复。另一条 `eu-ai-act-proposal-2021`（2021-04-21 提案）单独成事件，因它是立法进程起点，非同一事实。
9. **AlphaFold 2**：事件取 CASP14 结果公布 **2020-11-30**；《自然》论文 2021-07-15 写入 `notes`。
10. **模型发布 vs 事件去重（§7）**：GPT-4、ChatGPT、Claude 3、Gemini 1.0、Llama 2、o1 等「发版」只进 `models`，未另建同名 event；事件留给论文、政策、机构变动、科学里程碑。因此任务清单里提到的「ChatGPT 上线 / GPT-4 发布 / Claude 3 发布 / Gemini 发布 / Llama 开源 / o1 推理范式」以 model 条目的 `summary + significance` 承载，避免 model/event 重复描述同一发布。**若整合时确实需要产品发布类事件，建议从 models 中引用而不复制文案。**
11. **Grok-1 与 xAI 时间线**：`2023-11`（月精度）+ `partially-verified`；权重开放 2024-03-17 写入 `notes`。

## 4. 关键来源 URL 列表

官方公告 / 官方文档（openai.com 全部可直接访问，日期在页面正文顶部）：

- https://openai.com/index/language-unsupervised/ （GPT-1，2018-06-11）
- https://openai.com/index/better-language-models/ （GPT-2，2019-02-14）
- https://openai.com/index/gpt-2-1-5b-release/ （GPT-2 1.5B，2019-11-05）
- https://openai.com/index/language-models-are-few-shot-learners/ （GPT-3，2020-05-28）
- https://openai.com/index/dall-e/ ｜ https://openai.com/index/clip/ （2021-01-05）
- https://openai.com/index/openai-codex/ （2021-08-10）
- https://openai.com/index/instruction-following/ （InstructGPT，2022-01-27）
- https://openai.com/index/dall-e-2/ ｜ https://openai.com/index/whisper/ （2022）
- https://openai.com/index/chatgpt/ （2022-11-30）
- https://openai.com/index/gpt-4-research/ （2023-03-14）
- https://openai.com/index/new-models-and-developer-products-announced-at-devday/ （GPT-4 Turbo，2023-11-06）
- https://openai.com/index/video-generation-models-as-world-simulators/ （Sora，2024-02-15）
- https://openai.com/index/hello-gpt-4o/ （2024-05-13）
- https://openai.com/index/introducing-openai-o1-preview/ （2024-09-12）
- https://openai.com/index/openai-o1-system-card/ （2024-12-05）
- https://openai.com/index/openai-api/ （2020-06-11）
- https://openai.com/index/openai-announces-leadership-transition/ ｜ https://openai.com/index/sam-altman-returns-as-ceo/ （2023-11）
- https://openai.com/index/openai-and-microsoft-extend-partnership/ （2023-01-23）

论文（arXiv 提交日可直接读取，作为 `paper` 来源）：

- https://arxiv.org/abs/1810.04805 （BERT）
- https://arxiv.org/abs/1910.10683 （T5）
- https://arxiv.org/abs/2005.14165 （GPT-3）
- https://arxiv.org/abs/2103.00020 （CLIP）
- https://arxiv.org/abs/2102.12092 （DALL·E）
- https://arxiv.org/abs/2107.03374 （Codex）
- https://arxiv.org/abs/2203.02155 （InstructGPT）
- https://arxiv.org/abs/2204.06125 （DALL·E 2 / unCLIP）
- https://arxiv.org/abs/2212.04356 （Whisper）
- https://arxiv.org/abs/2201.08239 （LaMDA）
- https://arxiv.org/abs/2204.02311 （PaLM）
- https://arxiv.org/abs/2205.11487 （Imagen）
- https://arxiv.org/abs/2302.13971 （LLaMA）
- https://arxiv.org/abs/2307.09288 （Llama 2）
- https://arxiv.org/abs/2303.08774 （GPT-4 技术报告）
- https://arxiv.org/abs/2312.11805 （Gemini 1.0）
- https://arxiv.org/abs/2403.05530 （Gemini 1.5）
- https://arxiv.org/abs/2310.06825 （Mistral 7B）
- https://arxiv.org/abs/2401.04088 （Mixtral）
- https://arxiv.org/abs/2404.14219 （Phi-3）
- https://arxiv.org/abs/2001.08361 （Scaling Laws）
- https://arxiv.org/abs/2203.15556 （Chinchilla）
- https://arxiv.org/abs/2212.08073 （Constitutional AI）
- https://arxiv.org/abs/2112.10752 （Latent Diffusion，Stable Diffusion 方法基础）

其他一手来源：

- https://www.anthropic.com/news/introducing-claude ｜ /news/claude-2 ｜ /news/claude-2-1 ｜ /news/claude-3-family ｜ /news/claude-3-5-sonnet ｜ /news/3-5-models-and-computer-use ｜ /news/constitutional-ai-harmlessness-from-ai-feedback
- https://blog.google/technology/ai/google-gemini-ai/ ｜ https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/ ｜ https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/ ｜ https://blog.google/technology/developers/gemma-open-models/ ｜ https://blog.google/technology/ai/lamda/ ｜ https://blog.google/products/search/search-language-understanding-bert/ ｜ https://blog.google/technology/ai/google-deepmind-isomorphic-alphafold-3-ai-model/
- https://research.google/blog/pathways-language-model-palm-scaling-to-540-billion-parameters-for-breakthrough-performance/ ｜ https://imagen.research.google/
- https://ai.meta.com/blog/large-language-model-llama-meta-ai/ ｜ https://ai.meta.com/blog/llama-2/ ｜ https://about.fb.com/news/2023/07/llama-2/ ｜ https://ai.meta.com/blog/meta-llama-3/ ｜ https://ai.meta.com/blog/meta-llama-3-1/ ｜ https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/
- https://mistral.ai/news/announcing-mistral-7b/ ｜ https://mistral.ai/news/mixtral-of-experts/ ｜ https://mistral.ai/news/mistral-large
- https://x.ai/news/grok ｜ https://x.ai/news/grok-2 ｜ https://github.com/xai-org/grok-1
- https://stability.ai/news/stable-diffusion-public-release
- https://azure.microsoft.com/en-us/blog/introducing-phi-3-redefining-whats-possible-with-slms/
- https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/ ｜ https://aws.amazon.com/ai/generative-ai/nova/
- https://blogs.nvidia.com/blog/nemotron-4-synthetic-data-generation-llm-training/ ｜ https://huggingface.co/nvidia/Nemotron-4-340B-Instruct
- https://cohere.com/blog/command-r ｜ https://cohere.com/blog/command-r-plus-microsoft-azure
- https://deepmind.google/science/alphafold/ ｜ https://deepmind.google/blog/announcing-google-deepmind/ ｜ https://www.nature.com/articles/s41586-021-03819-2 ｜ https://www.nature.com/articles/s41586-024-07487-w
- https://www.europarl.europa.eu/news/en/press-room/20240308IPR19015/artificial-intelligence-act-meps-adopt-landmark-law ｜ https://eur-lex.europa.eu/eli/reg/2024/1689/oj ｜ https://digital-strategy.ec.europa.eu/en/library/proposal-regulation-laying-down-harmonised-rules-artificial-intelligence
- https://www.nobelprize.org/prizes/physics/2024/press-release/ ｜ https://www.nobelprize.org/prizes/chemistry/2024/press-release/
- https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/ ｜ https://www.whitehouse.gov/ostp/ai-bill-of-rights/
- https://www.nist.gov/itl/ai-risk-management-framework ｜ https://www.gov.uk/government/publications/ai-safety-summit-2023-the-bletchley-declaration ｜ https://www.aboutamazon.com/news/aws/amazon-aws-anthropic-ai ｜ https://blogs.microsoft.com/blog/2023/01/23/microsoftandopenaiextendpartnership/

### 抓取环境限制（重要，供整合时抽查）

本会话可直接读取正文的官方站点：`openai.com`、`arxiv.org`、`anthropic.com`、`about.fb.com`、`aws.amazon.com`、`github.com`、部分 `blog.google/intl`。以下站点在本环境抓取失败或正文被截断到仅剩标题（403 / 跨域重定向 / 网络失败）：`blog.google`（主域）、`research.google`、`ai.meta.com`、`mistral.ai`、`x.ai`、`stability.ai`、`nature.com`、`europarl.europa.eu`、`wikipedia.org`、`web.archive.org`。

因此上述站点的日期依据是：官方公告页标题/URL 中的年月 + 与 arXiv 论文提交日或多家独立记载交叉核对。**建议整合阶段对 `blog.google`、`ai.meta.com`、`mistral.ai`、`x.ai`、`stability.ai`、`azure.microsoft.com`、`cohere.com`、`deepmind.google`、`nature.com` 的链接做一次 HTTP 200 抽查**；若发现失效，优先换成同域名的现行官方页面（例如 Google 的 `research.google/blog/...` 替代旧的 `ai.googleblog.com`）。

## 5. 主叙事必须采用的「不可错过节点」

1. **2018.06.11 — GPT-1**：确立「预训练 + 微调」范式，整条时间线的起点。
2. **2018.10.11 — BERT**：双向预训练 + 全量开源，一年内进入搜索，研究落地分水岭。
3. **2019.02.14 — GPT-2 分阶段发布**：第一次把「发布策略」当成安全工具，开放权重争议的源头。
4. **2020.05.28 — GPT-3**：175B 与 few-shot，提示词取代微调，模型变成可出租的基础设施。
5. **2020.11.30 — AlphaFold 2**：AI for science 的第一个决定性成果。
6. **2022.08.22 — Stable Diffusion**：开放权重让图像生成平民化，同时引爆版权与深度伪造争论。
7. **2022.11.30 — ChatGPT**：大众化转折点，全球生成式 AI 竞赛的起点。
8. **2023.02.24 / 2023.07.18 — LLaMA / Llama 2**：开放权重生态形成，开源与闭源成为两条并行路线。
9. **2023.03.14 — GPT-4**：多模态 + 系统卡，前沿模型进入「能力与风险披露并行」阶段。
10. **2023.12.06 — Gemini 1.0**：Google 完成产品线统一，前沿格局从两强变三强。
11. **2024.03.04 — Claude 3**：多模态 + 200K 上下文成为旗舰标配，三强正式成形。
12. **2024.03.13 — EU AI Act 通过**：全球首部综合性 AI 法律，合规成为产品设计的约束条件。
13. **2024.05.13 — GPT-4o**：原生实时多模态，交互方式从打字转向语音。
14. **2024.09.12 — o1-preview**：推理时计算成为新范式，2024 年后的竞争主轴。
15. **2024.10.08 / 10.09 — 诺贝尔物理学奖与化学奖**：AI 与 AI for science 被主流科学界正式承认。

（备选第 16 条：**2024.02.15 — Sora**，视频生成进入「世界模拟器」叙事；若叙事需要 8 条以内，可删去 BERT 搜索落地与 NIST 框架这类「治理类」节点。）
