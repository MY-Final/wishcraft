# THE INFERENCE / 推理现场

> 当你按下发送，AI 的世界发生了什么？

一次大语言模型请求的完整生命周期，被做成一段可以走进、点击、暂停和重播的三维叙事。

从聊天框里的十个字开始，经过 HTTPS、API 网关、Tokenizer、Embedding、Transformer、Prefill、Decode，最后以流式文本回到屏幕。九个章节连成一条闭环路线；每一个数字都标注来源，每一个“真实”都注明真实到什么程度。

- 在线入口（作品集内）：`https://120403.xyz/wishcraft/` → `projects/inference/`
- 本地入口：`pnpm dev` → `http://127.0.0.1:5181/`
- 技术：Vite 8 + React 19 + TypeScript 7 + Three.js 0.187，纯静态前端，无后端、无真实 API 调用

---

## 九段章节

| # | 章节 | 三维主体 | 观众看到的事 |
|---|---|---|---|
| 01 | 发送 / THE REQUEST | 浏览器、聊天屏、数据胶囊 | 一句话被包成带 model / messages / stream / 参数的请求体；Web 对话与 API JSON 两种入口 |
| 02 | 网络 / THE NETWORK | DNS、TLS 隧道、API 网关、认证、限流、路由、队列、GPU 集群 | 胶囊穿过协议栈与调度层；网关是可选层，不是每次请求都必须经过 |
| 03 | 分词 / TOKENIZER | 原文条、玻璃切刀、六块 Token 板 | 10 个字符（9 个汉字 + 问号）通过 Qwen2.5 BPE 变成 6 个 Token；切在真实边界上，并展示真实整数 ID |
| 04 | 嵌入 / EMBEDDING | 4096 维矩阵墙、六条概念向量 | Token ID 变成向量；三维空间只是高维向量的可读投影，不是模型权重本身 |
| 05 | 计算 / TRANSFORMER | Q/K/V、因果注意力矩阵、MLP、可切换 MoE | 注意力决定看哪里，MLP 逐位置变换；模型不是一片逐个点亮的生物神经元 |
| 06 | 预填 / PREFILL | 28 层 × 24 个近期位置的 KV Cache 墙 | 整段上下文并行写入缓存；这是首 Token 延迟里最大的一块，但 TTFT 还包含网络与排队 |
| 07 | 解码 / DECODE | 输出头、概率辐条、采样面板 | 每一步只生成一个 Token；重新跑模型、带回上下文，再生成下一个 |
| 08 | 返回 / THE STREAM | detokenizer、SSE 事件、5 个网络 Chunk、Token 粒子 | 55 个 Token ≠ 5 个 Chunk；SSE 按字节/事件到达，边界由网络决定，不由语义决定 |
| 09 | 抵达 / ARRIVAL | 客户端屏幕、逐段出现的回答 | 文本在屏幕上长出来；最后拉远看到整条闭环 |

主时间轴 120 秒。每章有自己的相机轨迹，切换章节时会从当前世界坐标平滑过渡。

---

## 交互

- **播放**：开始探索、暂停/继续、重播、上一章/下一章、直接点击章节索引
- **时间**：可拖拽的 120 秒时间轴、0.5× / 1× / 2×
- **镜头**：拖拽旋转、滚轮/双指缩放、重置镜头；4 秒不操作后自动回到导演机位
- **点击**：所有带解释的 3D 节点（网关、Token 切刀、QKV、KV Cache、输出头、Chunk 等）；Embedding 向量还可以打开对应 Token 检视器
- **切换**：01 的 Web / API、05 的 Dense / MoE
- **实验**：07 的 Temperature 滑块；同一组 logits，只改变采样温度与概率柱
- **深潜**：每章“深入了解”打开公式、数据结构、常见误解与来源
- **底稿**：顶部“技术档案”收录 10 个验收问题、真实/模拟边界、来源与制作说明
- **自由探索**：暂停线性播放，隐藏阅读面板，打开鼠标/触控环绕；再次点击退出
- **键盘**：`Space` 播放/暂停，`←` / `→` 换章，`E` 自由探索，`M` 模拟指标，`?` 技术档案；对话框内 `Esc` 关闭
- **移动端**：隐藏章节导轨，改为底部章节工作表；自动简化粒子与背景细节；竖屏会把主体上移到阅读卡片之上
- **可访问性**：原生 `<dialog>`、可见焦点、按钮名称、`prefers-reduced-motion` 降低环境动画

---

## 真实数据与模拟边界

这部作品的原则：**宁可把“模拟”写大，也不把概念图伪装成模型内部。**

### 真实

- 输入文本：`为什么天空是蓝色的？`
- Tokenizer：`Qwen/Qwen2.5-0.5B-Instruct`，revision `7ae557604adf67be50417f59c2c2f167def9a775`
- 10 个字符（9 个汉字 + 全角问号）→ 6 个 Token；真实 ID 为 `100678, 101916, 20412, 105681, 9370, 11319`
- 回答 55 个 Token 的文本与边界来自同一个 tokenizer；每个 Token 的真实 ID、位置与展示文本在 `src/data/tokenization.ts`
- 校验：`tokenizers==0.23.3`（Python 3.12.14），本地 `tokenizer.json` SHA-256 `C0382117EA329CDF097041132F6D735924B697924D6F6FC3945713E96CE87539`
- SSE 事件序列与请求体结构是技术上合理的示例，不是对某一家厂商 API 的逐字复刻

### 模拟或概念

- 全部延迟、吞吐、TTFT、KV Cache 占用与显存估算（演示模型：7B、28 层、32 头、head dim 128、FP16）
- 注意力权重、logits、概率、采样结果与温度实验
- 三维 Embedding 坐标；只是把 4096 维向量压到 3 维的**概念性投影**，不声称与真实权重对应
- 网络拓扑、GPU 集群与“在队列里等了多久”的节奏
- 模型架构图不展示任何隐藏思维链；作品只解释可观察的输入/输出与公开的推理机制

所有模拟数值在 UI 里都标了 `SIMULATED` / “模拟值”；技术档案里有更细的逐项说明。

---

## 运行与验证

```bash
pnpm install
pnpm dev        # http://127.0.0.1:5181
pnpm build      # tsc --noEmit && vite build
pnpm preview    # http://127.0.0.1:4173

# 浏览器验收：先让 preview 跑在 5190
pnpm exec vite preview --host 127.0.0.1 --port 5190 --strictPort
pnpm qa         # 33 项桌面/移动/reduced-motion 验收
```

`pnpm qa` 使用系统 Chrome + `playwright-core`，会写出：

- `docs/QA_FINAL.json`（机器可读结果）
- `docs/qa/*.png`（本地截图，不提交）

最近一次结果：**33 / 33 通过，0 console/page error**。详见 [`docs/QA_REPORT.md`](docs/QA_REPORT.md)。

### 实测规模

- 单章可见 draw calls：约 20–141；全景（全部章节 + 地标）约 440–493
- 三角面：全景约 196k
- 构建产物：约 1.05 MB JS / 294 KB gzip（Vite 会提示 >500 KB chunk；这是 Three.js + React 单页应用的已知体积，不是构建失败）
- 桌面 1440×900、1024×768 与移动 390×844 均通过无横向溢出检查

---

## 目录

```text
projects/inference/
├─ src/
│  ├─ data/              章节、真实 Token、模拟指标、请求/SSE、采样、深潜、节点解释
│  ├─ lib/               JourneyClock / journeyStore / useClock
│  ├─ three/
│  │  ├─ World.ts        共享连续世界、拾取、相机、地标、全景
│  │  ├─ scenes/client/  01 发送 + 09 抵达
│  │  ├─ scenes/transit/ 02 网络 + 08 返回
│  │  ├─ scenes/language/03 分词 + 04 嵌入
│  │  ├─ scenes/model/   05 Transformer + 06 Prefill + 07 Decode
│  │  └─ kit/            材质、几何、纹理、粒子、节点
│  ├─ components/        Landing / 章节面板 / 播放器 / 遥测 / 对话框
│  └─ styles/            tokens / base / landing / chrome / overlays / responsive
├─ scripts/              tokenizer 数据生成、中文子集字体生成
├─ research/             tokenizer 校验脚本、来源说明、样例 JSON
├─ tools/                shot.mjs（截图）、qa.mjs（验收）
├─ docs/                 SCENE_CONTRACT.md、QA_REPORT.md、QA_FINAL.json
└─ wish.json             WISHCRAFT 作品集清单
```

---

## 设计约束（制作时遵守）

- 页面文案使用简体中文；技术名词保留英文
- 不用 React Three Fiber；场景以命令式 Three.js 构建，React 只负责外部 UI
- 动画由可拖拽的 `JourneyClock` 驱动，不从 wall clock 直接取状态；所以暂停、倍速、跳章和拖动时间轴都确定
- 所有场景实现同一 `StageScene` 契约：局部坐标、可点击节点、局部相机、确定性更新、可释放资源
- 桌面优先；手机不是缩小的桌面，而是独立的信息层级与相机安全区
- 不使用付费 API、不发送用户输入、不做真实监控；全部前端静态

## 来源与致谢

- Tokenizer 数据与校验：`research/TOKENIZER_NOTES.md`、`research/tokenize_qwen.py`、`research/verify_example_json.py`
- 字体：Inter Tight（SIL OFL）、IBM Plex Mono（SIL OFL）、Noto Sans SC（SIL OFL，子集化）
- 三维场景与 UI：本项目原创；Three.js 及其示例环境贴图遵循对应许可
- WISHCRAFT / 许愿池：把愿望做成可运行世界的仓库
