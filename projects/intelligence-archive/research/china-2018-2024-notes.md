# 中国模型与技术事件研究笔记（2018–2024）

- 研究员：research-china-2018-24
- 交付文件：`research/china-2018-2024.json`
- 研究截止：2026-11-02（Asia/Shanghai）
- 契约：`docs/DATA_SCHEMA.md`

## 1. 数据清单与条数

| 类型 | 条数 | 说明 |
|---|---|---|
| models | 38 | DeepSeek 5、Qwen/QwQ 8、智谱 6、月之暗面 1、MiniMax 2、字节 2、百度 3、讯飞 1、腾讯 1、上海 AI Lab 2、阶跃 1、零一万物 2、商汤 1、华为 1、百川 2 |
| events | 10 | 政策/治理 7、产品/行业 2、国际治理 1 |
| organizations | 0 | 见第 6 节，机构档案留给整合阶段统一核实 |

时间分布：2021 年 2 条（PanGu-α、ERNIE 3.0 Titan）、2022 年 1 条（GLM-130B）、2023 年 19 条、2024 年 16 条；事件 2019 年 1 条、2023 年 5 条、2024 年 4 条。

自检结果：JSON 可被 `JSON.parse` 解析；models + events 共 48 个 id 全局唯一；所有 `predecessors`/`successors`/`relatedModels` 均指向本文件内真实存在的 id；68 条来源 URL 逐条 HTTP 校验可访问（arxiv/Hugging Face 在 node fetch 下偶发 TLS 失败，用 PowerShell 复核均为 200）；`summary` 60–140 字、`significance` 40–100 字、`keyAdvancement` 40–80 字全部落在区间内。

## 2. 无法核实项与处理

| 项 | 结论 | 原因/处置 |
|---|---|---|
| Qwen2.5-Max（2025-01） | **不写入** | 属 2025 年发布，按数据规范第 6 节归 `china-2025-2026` 研究员。任务书虽然列为「若可核实」，但与「禁止写 2025–2026 新模型」冲突，以后者为准。 |
| Kimi k1.5（2025-01） | **不写入** | 同上，2025 年发布。 |
| MiniMax-Text-01（2025-01） | **不写入** | 同上；其官方仓库 `MiniMax-AI/MiniMax-01` 创建于 2025-01-14，可确认属 2025 年。 |
| 豆包大模型 1.5（2025-01） | **不写入** | 同上。 |
| 智源「悟道 2.0」（2021-06） | **不写入** | 数据规范第 4 节机构白名单无 BAAI/智源，无法合法填 `organization`；作为背景叙事写在这里，不改规范。 |
| 商汤「日日新 5.0」、讯飞星火 V4.0、腾讯混元后续版本 | **未收录** | 官方发布页均为动态渲染，未找到带日期的静态公告；且已有 1.0 代条目覆盖，避免为凑数量牺牲可核实性。 |
| 《生成式人工智能服务安全基本要求》（TC260-003）发布 | **未收录为 event** | 无法从 tc260.org.cn 现有页面读到发布日（页面只剩专家解读与后续条目），按「宁可少写」处理。 |
| 美国 2023-10 对华 AI 芯片出口管制 | **不写入** | 属国际/硬件叙事，本文件定位为中国模型与生态；且 commerce.gov 对抓取返回 403，联邦公报页面对应文件不是同一份，避免误引。可在总叙事中由其他研究员处理。 |
| 「豆包」App 上线精确日 | 只记到月 | 官方未公布日期，证券时报 2023-08-18 报道「上线」且仍为邀请制；行业多记 8 月 17 日，不补假日。 |
| DeepSeek Coder 首发日 | 只记到月 | 官方公众号原文不可访问；仓库 2023-10-20 创建、33B 权重 2023-11-01 上线、媒体多记 11 月 2 日，三个日期不一致。 |
| Yi-34B 首发日 | 只记到月 | Hugging Face 权重 2023-11-01、媒体发布报道 2023-11-06，二者不同源。 |
| Baichuan-7B 首发日 | 只记到月 | 仓库/权重 2023-06-13–14（UTC）、媒体多记 6 月 15 日。 |
| Kimi Chat 上线日 | 只记到月 | 官方无公告页；媒体 2023-10-11 报道「近日推出」，行业多记 10 月 9 日。 |

## 3. 日期冲突与取舍

1. **Qwen2.5：2024-09-19 而非 09-18**。`qwenlm.github.io/blog/qwen2.5/` 页面标注 September 19, 2024；部分海外报道因时区记为 09-18。以官方页面为准并在 `notes` 字段注明。
2. **Qwen1.5：2024-02-04 而非 02-05**。官方博客页标注 February 4, 2024，中文媒体多记 2 月 5 日；取官方页面。
3. **Qwen2-VL：2024-08-29**。官方博客页 August 29, 2024；Hugging Face `Qwen2-VL-7B-Instruct` 仓库 2024-08-28（UTC），可解释为时区差。
4. **ChatGLM-6B / ChatGLM2-6B：按北京时间**。权重仓库 `createdAt` 分别为 2023-03-13 16:28 UTC、2023-06-24 16:26 UTC，换算为北京时间分别是 03-14、06-25 凌晨，与中文报道一致。
5. **GLM-130B：2022-08（发布）/ 2022-10-05（论文）**。`dateType` 取 `weights`，时间轴用发布月；论文日期写进来源。同类处理：ERNIE 3.0 Titan、PanGu-α（只有论文，`dateType` 取 `paper`）。
6. **DeepSeek-V2：2024-05-06 标注为 `partially-verified`**。官方发布页已下线，arXiv v1 为 2024-05-07，5 月 6 日是媒体与当年 API 定价公告的一致说法，如实降级并写进 `notes`。
7. **DeepSeek-V2.5 / V3 / V2.5-1210**：直接采用官方 Change Log 的日期（2024-09-05、2024-12-26、2024-12-10），这些是本文件最硬的时间锚点。
8. **同日双发**：2024-01-16 同时是 GLM-4 发布日与 MiniMax abab6 上线日，二者独立核对，不是复制错误。
9. **「暂行办法」拆成公布与施行两条 event**：2023-07-13（公布）与 2023-08-15（施行）在同一官方页面均可读到，属两个时间轴节点，不构成 model/event 重复。

## 4. 关键来源 URL

官方公告 / 官方文档

- https://www.deepseek.com/news/deepseek-v3/
- https://api-docs.deepseek.com/updates
- https://www.minimax.cn/news/%E9%80%9A%E7%94%A8%E5%A4%A7%E6%A8%A1%E5%9E%8Babab65%E7%B3%BB%E5%88%97
- https://qwenlm.github.io/blog/qwen1.5/ ； https://qwenlm.github.io/blog/qwen2/ ； https://qwenlm.github.io/blog/qwen2.5/ ； https://qwenlm.github.io/blog/qwen2.5-coder-family/ ； https://qwenlm.github.io/blog/qwen2-vl/ ； https://qwenlm.github.io/blog/qwen2.5-turbo/ ； https://qwenlm.github.io/blog/qwq-32b-preview/
- https://www.alibabagroup.com/zh-HK/document-1582482069362049024
- https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm
- https://www.most.gov.cn/kjbgz/201906/t20190617_147107.html
- https://www.jswx.gov.cn:8888/fwhd/tzgg/202409/t20240914_106660.shtml
- https://fr.china-embassy.gov.cn/zgyw/202407/t20240704_11448196.htm
- https://www.shlab.org.cn/news/5443847

论文（arXiv）

- https://arxiv.org/abs/2405.04434 （DeepSeek-V2，MLA + DeepSeekMoE，236B/21B，128K）
- https://arxiv.org/abs/2412.19437 （DeepSeek-V3，671B/37B）
- https://arxiv.org/abs/2401.02954 （DeepSeek LLM）、 https://arxiv.org/abs/2401.14196 （DeepSeek Coder）
- https://arxiv.org/abs/2309.16609 （Qwen）、 https://arxiv.org/abs/2407.10671 （Qwen2）
- https://arxiv.org/abs/2210.02414 （GLM-130B）、 https://arxiv.org/abs/2406.12793 （ChatGLM 家族 → GLM-4）
- https://arxiv.org/abs/2112.12731 （ERNIE 3.0 Titan）、 https://arxiv.org/abs/2104.12369 （PanGu-α）
- https://arxiv.org/abs/2403.04652 （Yi）、 https://arxiv.org/abs/2309.10305 （Baichuan 2）、 https://arxiv.org/abs/2403.17297 （InternLM2）

权威媒体（二手，用于 `partially-verified` 条目的日期）

- https://www.news.cn/tech/20240515/0cbd896c16e14a398c26f4195a360410/c.html （豆包大模型，2024-05-15）
- http://www.xinhuanet.com/tech/20240116/19d92dc316544dfba1cdc8bbba6b566f/c.html （GLM-4，2024-01-16）
- http://www.news.cn/fortune/2023-04/12/c_1212027993.htm （日日新，2023-04-10）
- https://tech.cnr.cn/techph/20230907/t20230907_526411008.shtml （混元）、 https://tech.cnr.cn/techph/20231017/t20231017_526453859.shtml （文心 4.0）、 http://tech.cnr.cn/techph/20240118/t20240118_526562018.shtml （InternLM2）、 https://tech.cnr.cn/techph/20231106/t20231106_526476893.shtml （Yi-34B）
- https://stcn.com/article/detail/1210492.html （价格战，2024-05-21）、 https://m.cnfin.com/yw-lb//zixun/20240522/4051572_1.html
- http://t.cj.sina.com.cn/articles/view/1686546714/6486a91a02001xs8q （首批备案，2023-08-31）
- http://www.chinanews.com.cn/cj/2023/10-11/10091972.shtml （Kimi 20 万汉字）
- http://ex.chinadaily.com.cn/exchange/partners/82/rss/channel/cn/columns/j3u3t6/stories/WS65f802d6a3109f7860dd5ed7.html （Kimi 200 万字，2024-03-18）
- https://m.ithome.com/html/792135.htm （GLM-4-Plus，2024-08-29）
- https://www.ncsti.gov.cn/kjdt/ztbd/rgzn/zxjz/202309/t20230908_133239.html （Baichuan 2，2023-09-06）
- https://www.163.com/dy/article/ITV6KJ7205198CJN.html （Step 系列，2024-03-23）
- http://www.chinadevelopment.com.cn/news/cj/2024/05/1894951.shtml （Yi-Large，2024-05-13）

## 5. 不可错过的节点（建议主叙事采用）

1. **2023-03-14 ChatGLM-6B 开源**——中文对话模型第一次能跑在单张消费级显卡上，中文微调生态由此起量。
2. **2023-07-06 书生·浦语 InternLM-7B 开源**——「模型 + 工具链 + 评测」整体开放，中文开源转入基建化。
3. **2023-07-13 / 2023-08-15《生成式人工智能服务管理暂行办法》公布与施行**——确立备案制，决定此后所有产品的上线节奏。
4. **2023-08-31 首批 8 款服务通过备案对外开放**——规则落到产品，豆包、文心、通义、智谱、百川、商汤、MiniMax 同日进入公众市场。
5. **2023-10-18《全球人工智能治理倡议》**——中国首份面向全球的 AI 治理立场文件。
6. **2024-01-16 GLM-4 发布 / MiniMax abab6 上线**——闭源旗舰开始对标 GPT-4；同日 MoE 进入中国商用 API。
7. **2024-03-18 Kimi 支持 200 万字上下文**——长上下文成为产品竞争维度。
8. **2024-05-06 DeepSeek-V2**——MLA + DeepSeekMoE 把推理成本压到百分之一量级，价格战的架构起点。
9. **2024-05 大模型 API 价格战**——字节、阿里（部分模型降价 97%）、百度、智谱跟进，MaaS 定价基线被重置。
10. **2024-06-07 Qwen2 改用 Apache 2.0**——宽松许可把 Qwen 推成全球微调主基座。
11. **2024-07-01 联大通过中国主提 AI 能力建设决议**——治理话语从国内规则外溢到多边机制。
12. **2024-09-14《AI 生成合成内容标识办法（征求意见稿）》**——内容标识与溯源进入规则化阶段。
13. **2024-09-19 Qwen2.5（18T tokens）**——同尺寸开源能力的又一次整体上移。
14. **2024-11-15 Qwen2.5-Turbo 1M 上下文**——百万上下文从指标变成可调用服务。
15. **2024-12-26 DeepSeek-V3**——671B/37B、FP8 训练、原生 FP8 开源权重，开源与闭源的差距被公开压缩。

## 6. 留给整合阶段的说明

- **organizations 为空数组**：机构档案（成立年份、团队来源、融资）需要独立核实，本轮未做，避免为凑字段写入未验证信息。建议整合时统一补齐 `deepseek` `alibaba-qwen` `zhipu` `moonshot` `minimax` `bytedance` `baidu` `iflytek` `tencent` `shanghai-ai-lab` `stepfun` `01ai` `sensetime` `huawei` `baichuan` 共 15 个机构。
- **跨文件 id 边界**：本文件只覆盖 2024-12-31 及以前首发/首发的模型。DeepSeek-R1、Qwen3、Kimi k1.5、MiniMax-01、Qwen2.5-Max、豆包 1.5 等 2025 年条目应由 `china-2025-2026` 建立。
- **技术事实口径**：MLA、DeepSeekMoE、FP8 训练、14.8T tokens、671B/37B、236B/21B、128K、1M 上下文等数字均来自官方公告或对应 arXiv 论文正文，未使用媒体转述数字。
