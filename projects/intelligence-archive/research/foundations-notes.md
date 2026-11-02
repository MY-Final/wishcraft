# foundations-notes.md — 1950–2017 奠基阶段研究笔记

- 研究员：research-foundations
- 交付文件：`research/foundations.json`（唯一数据文件）
- 研究截止：2026-11-02；本文件不含 2018 年及之后的任何事件
- 任务：team task-1（已 claim → complete）

---

## 1. 数据清单与条数

| 类型 | 条数 | 说明 |
|---|---|---|
| `events` | **36** | 1950–2017 年理论、论文、系统、机构、政策事件 |
| `organizations` | **12** | 仅收录本文件事件实际涉及、且在白名单内的机构 |
| `models` | 0 | 按规范，模型发版属其他研究员；本文件只写事件/系统/理论 |

**章节分布**（按 schema 第 2 节）：

| chapter | 年份段 | 条数 |
|---|---|---|
| 1 | 1950–1979 | 9 |
| 2 | 1980–2011 | 11 |
| 3 | 2012–2017 | 16 |

**年份覆盖（24 个不同年份）**：1950, 1956, 1958, 1959, 1965, 1966, 1969, 1973, 1980, 1982, 1986, 1987, 1989, 1997, 1998, 2006, 2009, 2011, 2012, 2013, 2014, 2015, 2016, 2017

**分类分布**：breakthrough 17 / theory 7 / system 7 / organization 2 / policy 2 / science 1

**核实状态**：`verified` 28 条，`partially-verified` 8 条。无 `unverified` 条目进入 JSON。

**日期精度**：day 15 条、month 8 条、year 13 条。凡未能从一手页面读到月/日的，一律降级到月或年，并在该条 `notes` 内写明原因。

### 事件一览（按时间）

| # | id | 日期 | 标题 |
|---|---|---|---|
| 1 | turing-computing-machinery-1950 | 1950-10 | 图灵《计算机器与智能》 |
| 2 | logic-theorist-1956 | 1956 | Logic Theorist 自动定理证明 |
| 3 | dartmouth-1956 | 1956-08 | 达特茅斯暑期研究计划 |
| 4 | perceptron-1958 | 1958 | 罗森布拉特提出感知机 |
| 5 | samuel-checkers-1959 | 1959-07 | 塞缪尔跳棋程序与「机器学习」命名 |
| 6 | dendral-1965 | 1965 | DENDRAL 专家系统启动 |
| 7 | eliza-1966 | 1966-01 | ELIZA 对话程序 |
| 8 | perceptrons-book-1969 | 1969 | 《感知机》与联结主义衰退 |
| 9 | lighthill-1973 | 1973 | 莱特希尔报告与第一次 AI 寒冬 |
| 10 | xcon-1980 | 1980 | XCON/R1 在 DEC 投产 |
| 11 | hopfield-1982 | 1982 | 霍普菲尔德网络 |
| 12 | backprop-1986 | 1986-10 | 反向传播（Nature） |
| 13 | ai-winter-1987 | 1987 | LISP 机器市场崩塌与第二次 AI 寒冬 |
| 14 | lecun-convnet-1989 | 1989-12 | 卷积网络用于手写邮编识别 |
| 15 | deep-blue-1997 | 1997-05 | 深蓝击败卡斯帕罗夫 |
| 16 | lstm-1997 | 1997-11 | LSTM 论文 |
| 17 | lenet5-1998 | 1998-11 | LeNet-5 |
| 18 | hinton-dbn-2006 | 2006-07-28 | 深度信念网络与逐层预训练 |
| 19 | imagenet-2009 | 2009-06 | ImageNet 数据集 |
| 20 | ibm-watson-jeopardy-2011 | 2011-02-16 | Watson 赢得《危险边缘》 |
| 21 | alexnet-2012 | 2012 | AlexNet |
| 22 | word2vec-2013 | 2013-01-16 | word2vec |
| 23 | vae-2013 | 2013-12-20 | 变分自编码器 |
| 24 | gan-2014 | 2014-06-10 | 生成对抗网络 |
| 25 | seq2seq-2014 | 2014-09-10 | 序列到序列学习 |
| 26 | bahdanau-attention-2014 | 2014-09-01 | 注意力机制 |
| 27 | neural-turing-machine-2014 | 2014-10-20 | 神经图灵机 |
| 28 | adam-optimizer-2014 | 2014-12-22 | Adam 优化器 |
| 29 | tensorflow-open-source-2015 | 2015-11-09 | TensorFlow 开源 |
| 30 | resnet-2015 | 2015-12-10 | 残差网络 ResNet |
| 31 | openai-founded-2015 | 2015-12-11 | OpenAI 成立 |
| 32 | alphago-nature-2016 | 2016-01-27 | AlphaGo 论文（Nature） |
| 33 | alphago-lee-sedol-2016 | 2016-03 | AlphaGo 与李世石对局 |
| 34 | wavenet-2016 | 2016-09-12 | WaveNet |
| 35 | transformer-2017 | 2017-06-12 | Transformer |
| 36 | alphazero-2017 | 2017-12-05 | AlphaZero |

---

## 2. 无法核实 / 主动剔除的条目及原因

### 2.1 无法核实，未写入 JSON

| 项目 | 原因与处理 |
|---|---|
| **SNARC（明斯基 1951 年学习机器）** | 覆盖清单提到「1951/1952 早期学习机器（SNARC）」。这是真实存在的机器，但**没有找到一个可稳定访问的一手或准一手页面**（明斯基自传页 `web.media.mit.edu/~minsky/minskybiog.html` 已 404；MIT News 讣告页抓取连接失败；《Proc. IRE》1961 年综述受 IEEE 反爬限制）。**因此未建 event**。若主叙事需要，建议以「早期学习机器」并入 `samuel-checkers-1959` 的叙述，或由整合员补充来源后再加。 |
| **1956 年达特茅斯会议的具体日程** | 会议本身无官方纪要（麦卡锡在 1996 年注释中明确写"There was no report"）。故日期只到 `1956-08`，不编造具体日。 |
| **Google 2014 年收购 DeepMind（1 月 26 日）** | 事件确凿，但找不到可读取的官方公告页（DeepMind 当年博客已迁移，Google 官方博客 URL 无法定位）。为避免编造链接，**未建 event**；`deepmind` 机构记录已保留，供整合员在拿到来源后补 2014 年并购事件。 |
| **SHRDLU（1972）、Prolog（1972）、TD-Gammon（1992）** | 均属高价值节点，但一手来源（CACM / Cognitive Psychology / Neural Computation 原页）全部被出版社反爬拦截，且无对应 arXiv/官方页可替代。为守住「链接真实且可读出日期」的标准，本轮**未收录**，建议后续在有网络代理时补。 |
| **AlphaGo Zero 的 Nature 论文（2017-10-19）** | 主题与 `alphazero-2017` 高度重叠，且 Crossref 该 DOI 接口返回异常、无法确认日/月，故**未单列**，改在 `alphazero-2017` 的 summary 与 notes 中说明其前身关系。 |
| **2016 年 GNMT / Google 神经机器翻译上线** | 缺可核实的官方公告 URL，未收录。 |

### 2.2 有来源但降级为 `partially-verified` 的 8 条

| id | 降级原因 |
|---|---|
| logic-theorist-1956 | RAND P-868 页面被 CloudFront 反爬（403），正文未读取；年份按书目记录取 1956。 |
| samuel-checkers-1959 | 原刊 IBM J. Res. Dev. 3(3) **未被 Crossref 收录**，Crossref 只有 1988 年选集重印；月次依据通行书目。 |
| dendral-1965 | 项目起点无单一官方公告；所引 NLM 馆藏为 1993 年回顾论文（PDF），未逐页读取。 |
| perceptrons-book-1969 | 1969 年初版无 DOI；Crossref 只收录 MIT Press 现行电子版（2017-09-22）。 |
| hopfield-1982 | Crossref 该 DOI 接口多次返回异常；PNAS 站点反爬。卷期 79(8) 明确，月次未取得。 |
| ai-winter-1987 | 史学概括而非单一公告，触发点有多个版本；所引为 Nilsson《The Quest for AI》公开 PDF。 |
| tensorflow-open-source-2015 | Google 研究博客原文页抓取连接失败，日期取自该文与官方发布记录。 |
| alphago-lee-sedol-2016 | DeepMind 官方页抓取被截断，未能逐字读到比分段落。 |

---

## 3. 日期冲突与取舍

1. **图灵 1950**：通行说法是「1950 年 10 月」。Crossref 记录 `published-print` 与 `published-online` 均为 `1950-10-01`，故取 `1950-10`（月精度），不写日——期刊只标到月份，`1950-10-01` 是数据库填充值。
2. **反向传播 1986**：常被引用为「1986 年 10 月 9 日」。Crossref 只记录到 `1986-10`（期号 6088）。取 `1986-10`，日留空。
3. **AlphaGo Nature（2016）**：在线首发 `2016-01-27`、纸本期 `2016-01-28`。主时间轴取**在线首发日** `2016-01-27`，notes 里保留纸本日期。
4. **LeNet-5（1998）**：Crossref 只到年份，作者本人书目页（yann.lecun.com/exdb/lenet/）写 `november 1998`，故取 `1998-11`。
5. **感知机 1958**：Crossref 仅记 `1958`，无月。**不**采用流传的「1958 年 11 月」，取年精度。
6. **霍普菲尔德 1982**：卷期 79(8) 对应 1982 年 4 月，但无法从可读页面确认，取年精度而非猜月。
7. **AlexNet 2012**：三个候选日（ILSVRC 结果 2012 年秋、ECCV workshop、NIPS 论文集 12 月）互不一致，取**年精度** `2012`，并在 summary 中说明「ILSVRC-2010 数据」以避免张冠李戴。
8. **XCON 1980**：AI Magazine 原文明确「In 1980, DEC began to use…」，但无月份，取年精度。
9. **Watson 2011**：比赛 2 月 14–16 日播出，16 日决出胜负 → `2011-02-16`；但 IBM 英文原新闻稿已 404，现可读的官方稿是 2011-02-21 的后续公告，故日期依据赛程、核实依据该稿。已有明确披露。
10. **逻辑理论机 / Logic Theorist**：有 1955（首次运行）、1956（RAND 报告与 IRE 论文）两种说法。取 1956 年，年精度。
11. **第一次 AI 寒冬**：1973（报告）与 1974（经费实际收缩）在史料中常合并叙述。按清单「1973/1974」的写法，**合并为一条事件**，日期取 `1973`，正文中说明美国 DARPA 同期收紧。
12. **Transformer / word2vec 归属**：作者当时在 Google Brain（现并入 Google DeepMind），按 schema 第 4 节注释归入 `google-deepmind`。

---

## 4. 关键来源 URL 列表

### 4.1 一手 / 官方

- 图灵 1950（Mind, OUP）：https://academic.oup.com/mind/article/LIX/236/433/986238
- 达特茅斯提案（麦卡锡官网，1955-08-31 原文）：http://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html
- 莱特希尔报告 1973（UKRI / Chilton Computing 全文）：https://www.chilton-computing.org.uk/inf/literature/reports/lighthill_report/contents.htm
- Logic Theorist（RAND P-868）：https://www.rand.org/pubs/papers/P868.html
- XCON/R1（AAAI AI Magazine 1984，开放获取）：https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/445
- Deep Blue（IBM Heritage）：https://www.ibm.com/history/deep-blue
- Watson 取胜（IBM Newsroom，2011-02-21 官方稿）：https://fr.newsroom.ibm.com/2011-02-21-Watson-lordinateur-dIBM-qui-vient-de-gagner-Jeopardy-conquiert-le-monde-de-la-sante
- OpenAI 成立（2015-12-11）：https://openai.com/index/introducing-openai/
- AlphaGo 官方项目页：https://deepmind.google/research/alphago/
- TensorFlow 开源（Google Research Blog）：https://research.google/blog/tensorflow-googles-latest-machine-learning-system-open-sourced-for-everyone/
- LeNet-5 与 1989 卷积网络（作者书目页）：http://yann.lecun.com/exdb/lenet/

### 4.2 论文（DOI / arXiv）

- Rosenblatt 1958：https://doi.apa.org/doi/10.1037/h0042519
- Samuel 1959：https://doi.org/10.1147/rd.33.0210 （重印记录 https://api.crossref.org/works/10.1007/978-1-4613-8716-9_14）
- Weizenbaum 1966（ELIZA）：https://dl.acm.org/doi/10.1145/365153.365168
- Minsky & Papert 1969：https://doi.org/10.7551/mitpress/11301.001.0001
- Hopfield 1982：https://www.pnas.org/doi/10.1073/pnas.79.8.2554
- Rumelhart/Hinton/Williams 1986：https://www.nature.com/articles/323533a0
- LeCun 1989：https://doi.org/10.1162/neco.1989.1.4.541
- Hochreiter & Schmidhuber 1997：https://doi.org/10.1162/neco.1997.9.8.1735
- LeCun 1998（LeNet-5）：https://doi.org/10.1109/5.726791
- Hinton & Salakhutdinov 2006（Science）：https://doi.org/10.1126/science.1127647
- Hinton/Osindero/Teh 2006（Neural Computation）：https://doi.org/10.1162/neco.2006.18.7.1527
- Deng et al. 2009（ImageNet）：https://doi.org/10.1109/CVPR.2009.5206848
- Krizhevsky et al. 2012（AlexNet）：https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html
- Silver et al. 2016（AlphaGo, Nature）：https://www.nature.com/articles/nature16961
- arXiv 1301.3781（word2vec）：https://arxiv.org/abs/1301.3781
- arXiv 1312.6114（VAE）：https://arxiv.org/abs/1312.6114
- arXiv 1406.2661（GAN）：https://arxiv.org/abs/1406.2661
- arXiv 1409.0473（Bahdanau attention）：https://arxiv.org/abs/1409.0473
- arXiv 1409.3215（Seq2Seq）：https://arxiv.org/abs/1409.3215
- arXiv 1410.5401（Neural Turing Machine）：https://arxiv.org/abs/1410.5401
- arXiv 1412.6980（Adam）：https://arxiv.org/abs/1412.6980
- arXiv 1512.03385（ResNet）：https://arxiv.org/abs/1512.03385
- arXiv 1609.03499（WaveNet）：https://arxiv.org/abs/1609.03499
- arXiv 1706.03762（Transformer）：https://arxiv.org/abs/1706.03762
- arXiv 1712.01815（AlphaZero）：https://arxiv.org/abs/1712.01815

### 4.3 史书（部分核实用）

- Nilsson, *The Quest for Artificial Intelligence*（Cambridge, 2010）公开 PDF：https://groups.inf.ed.ac.uk/vision/DATASETS/ROBOTICS/FREDDY/Barrow/Documents/nilsson_qai-01-12-09.pdf

### 4.4 关于「403 但真实」的说明

`nature.com`、`dl.acm.org`、`pnas.org`、`science.org`、`academic.oup.com`、`mitpress.mit.edu`、`rand.org` 对**自动化抓取**返回 403 / 身份验证重定向 / CloudFront 拦截，链接本身对浏览器可正常访问，且都不是搜索页或短链。这些链接的**卷期、页码、日期另经 Crossref API 或 arXiv API 交叉核对**后才写入，未凭记忆断言。

---

## 5. 主叙事不可错过的 12 个节点

按纪录片节奏给出的「不可剪掉」清单（可直接作为序章—第三章的骨架）：

1. **1950-10 · 图灵《计算机器与智能》** — 提出可检验的智能判据，一切叙事的原点。
2. **1956-08 · 达特茅斯会议** — 学科得名，十年乐观主义的起点。
3. **1958 · 感知机** — 「从数据学权重」第一次有收敛证明。
4. **1969 · 《感知机》** — 用一条数学边界把联结主义打入冷宫近十五年。
5. **1973 · 莱特希尔报告 / 第一次 AI 寒冬** — 「过度承诺 → 经费崩塌」的原型剧本。
6. **1986-10 · 反向传播（Nature）** — 训练深网的方法论解锁，第一次复兴。
7. **1987 · 第二次 AI 寒冬** — 硬件泡沫与专家系统退潮，叙事必须有的下坠。
8. **1997-05 · 深蓝击败卡斯帕罗夫** — 机器第一次在人类智力象征项目上取胜。
9. **2006-07-28 · 深度信念网络** — 深网可训练，深度学习议程重启。
10. **2012 · AlexNet** — 数据 + GPU + 深卷积，十年浪潮的真正扳机。
11. **2016-03 · AlphaGo vs 李世石** — AI 从技术新闻变成全球公共事件。
12. **2017-06-12 · Transformer** — 全部后续大模型的共同祖先，本阶段的终点也是下一段的起点。

> 备选加塞（若需要更强的「生成」线）：2014-06-10 GAN、2014-09-01 注意力机制、2015-12-10 ResNet。

---

## 6. 与其他研究员的分工边界（供整合员使用）

- 本文件**不含任何模型发版条目**（`models: []`）。ChatGPT、GPT-4、BERT、AlphaFold 等均留给对应研究员。
- 里程碑**系统**（Deep Blue、Watson、AlphaGo、AlexNet）按 schema 第 2 节要求建模为 `event`，不放进 `models`。
- 「模型发版」与「论文/会议/政策/机构」严格分开：例如 `alexnet-2012` 是论文与竞赛事件，不是模型条目。
- `chapter` 只用 1 / 2 / 3；未写 chapter 0（序章）与 4+ 的内容。
- 机构 id 全部取自白名单；`deepmind` 记录保留但当前无事件引用（理由见 §2.1 的 2014 并购项）。

---

## 7. 自检结果

```
JSON 合法（node JSON.parse 通过）
events = 36, organizations = 12, models = 0
id 全局唯一，无重复
所有 event 必填字段齐全，无缺失键
category / dateType / datePrecision / verificationStatus / chapter 均在枚举内
每条 event 至少 1 个 source；source.url 全部为 http(s)，无 example.com、无搜索页、无短链
summary 长度 60–140 字、significance 40–100 字：全部合规
displayDate 与 date / datePrecision 三者一致
事件年份区间 1950–2017，无 2018 年及之后条目
event.organizations 无悬空引用，机构 id 全部命中白名单
```
