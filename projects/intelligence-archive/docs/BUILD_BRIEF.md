# THE INTELLIGENCE ARCHIVE — BUILD BRIEF（设计系统 · 架构 · 分工）

> 所有开发者开工前必读。数据契约见 `docs/DATA_SCHEMA.md`。项目根：`D:\workspace\许愿池\projects\intelligence-archive`

## 1. 作品定义

一件可滚动的数字纪录片 / 未来博物馆档案。主题：从图灵的第一个问题，到能够自主执行任务的人工智能（1950—2026.11.02）。
三个关键词：**极简、震撼、真实**。不是时间轴网站，不是企业官网，不是 AI 模板 Demo。

## 2. WHITE MIRROR 设计系统

### 2.1 色彩（只允许这些，禁止彩色）

```
--paper:    #FAFAF8   页面底色
--white:    #FFFFFF   卡片/浮层
--ink:      #161616   主文字
--graphite: #2A2A2A   次强调
--muted:    #747474   辅助文字
--faint:    #A8A8A4   极弱文字
--hairline: #E6E6E3   分割线
--void:     #111111   深色章节背景
--void-ink: #F2F2EF   深色章节文字
```
禁止蓝紫渐变、霓虹、玻璃拟态、大面积阴影、彩色标签。只用灰阶与半透明黑（rgba(22,22,22,α)）。

### 2.2 字体

- 拉丁显示/正文：`Inter Tight`（自托管 woff2，变量字体），fallback `Helvetica Neue, Arial`。
- 等宽元数据：`IBM Plex Mono`，fallback `ui-monospace, SFMono-Regular`。
- 中文：`"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`。
- 字号阶梯（clamp，桌面优先）：
  - `--text-mega: clamp(6rem, 22vw, 26rem)` 巨型年份
  - `--text-display: clamp(3.5rem, 9vw, 9rem)` 章节大标题
  - `--text-h1: clamp(2.25rem, 4.6vw, 4.5rem)`
  - `--text-h2: clamp(1.5rem, 2.4vw, 2.25rem)`
  - `--text-body: clamp(1rem, 1.05vw, 1.125rem)` 中文正文，行高 1.85
  - `--text-small: 0.8125rem`
  - `--text-meta: 0.6875rem` 全大写 mono，字距 0.14em
- 标题字距收紧（-0.04em），正文中文不加字距。年份使用 `font-variant-numeric: tabular-nums`。

### 2.3 网格与留白

- 12 列栅格，页边距 `clamp(20px, 5vw, 88px)`，栏距 24px。
- 内容最大宽度 1440px；正文单栏宽度 640–720px。
- 垂直节奏基准 8px；章节间距 160–240px。
- 分割线 1px `--hairline`，只在信息层级需要时使用。

### 2.4 签名元素

1. **THE MONOLITH**：一条从光标生长出的极细黑线，贯穿全站，在 3D 中演化为几何平面 → 网络 → 注意力矩阵 → 语义空间 → 推理路径 → Agent 系统 → 黑色镜面。
2. **PROVENANCE LINE（出处行）**：每个历史断言下方一行等宽小字，如
   `VERIFIED · 2026-09-22 · ANTHROPIC OFFICIAL` —— 可点击跳转来源。这是「真实」的视觉证明，也是全站唯一允许的装饰。
3. **GIANT YEAR**：年份是版面的主角，可占屏幕 1/3 以上。数字从纸面「长」出来，不做发光。

### 2.5 动效原则

- 动画服务于叙事，不服务于炫技。禁止满屏粒子、悬浮机器人、每屏相同的 fade-up。
- 文字：逐行/逐字 mask 揭示（clip-path + translateY），时长 600–900ms，缓动 `cubic-bezier(.16,1,.3,1)`。
- 滚动：只有 transform / opacity / clip-path；不做布局抖动。
- 3D：相机缓慢推拉，阻尼 0.06–0.12；禁止抖动、快速旋转。
- 尊重 `prefers-reduced-motion`：关闭视差与自动动画，只保留必要状态变化。
- 深色章节仅用于 2017 Transformer、2026 Agent 高潮、终章镜面；其余保持纸白。

### 2.6 反模式清单

蓝紫渐变、霓虹、玻璃卡片、大圆角、满屏阴影、彩色机构标识、每屏都是卡片网格、无意义 3D 球体、自动播放视频、伪造数据、假链接、营销词（"史上最强""碾压"）。

## 3. 章节与视觉母题

| # | 标题 | 年份 | 视觉母题 | 3D |
|---|---|---|---|---|
| 0 | THE FIRST QUESTION | 1950 | 白屏 + 光标 + 打字机问题 | 一条线 |
| 1 | THE BIRTH OF A QUESTION | 1950–1979 | 纸白 + 等宽字符排版 + 逻辑式 | 线 → 平面 |
| 2 | MACHINES LEARN | 1980–2011 | 节点与连线、可旋转网络 | 网络 |
| 3 | THE DEEP LEARNING REVOLUTION | 2012–2017 | Token 分裂、注意力连线、黑底高潮 | 注意力矩阵 |
| 4 | LANGUAGE BECOMES GENERATIVE | 2018–2022 | 横向模型序列 + ChatGPT 对话框 | 语义空间 |
| 5 | THE GLOBAL MODEL RACE | 2023–2024 | 3D 模型星图 + 二维标签 | 星图 |
| 6 | THE AGE OF REASONING | 2025 | 推理树、被剪枝的路径 | 决策空间 |
| 7 | THE AGE OF ACTION | 2026 | 档案墙 + Agent 工作系统 | 工作系统 |
| 8 | THE QUESTION REMAINS | 2026 | 纯白 + 静止黑色镜面 | 收束 |

每个章节必须有独立的版式骨架（不是同一模板换文案）。

## 4. 技术架构

- Vite + React 19 + TypeScript + Three.js（R3F）+ 原生 CSS（每组件一个 `.css`，无 Tailwind）。
- 无后端、无外部 API；数据为本地 JSON + TS 模块；字体自托管；构建产物可静态部署。
- 路由：hash 路由，`#/`（叙事）、`#/archive`、`#/archive/<model-id>`（深链）、`#/about`、`#/chapter/<n>`（跳章）。
- 状态：`src/lib/narrative-store.ts` 单一滚动状态源。React 组件只订阅粗粒度值（chapter/year），3D 在 `useFrame` 中读取原始值，避免每帧 React 重渲染。
- 滚动：原生滚动 + rAF 计算，不用平滑滚动劫持。每个 `<section data-scene data-chapter="n" data-year-start data-year-end>` 自带 sticky 舞台。

### 4.1 目录与所有权（写代码前确认你只改自己的目录）

```
src/data/          types.ts index.ts chapters.ts        ← Lead
src/data/*.json    models events organizations papers   ← data-integrator
src/data/story.ts  叙事选材与章节文案                      ← narrative
src/lib/           narrative-store.ts scroll-director.ts format.ts  ← Lead
src/styles/        tokens.css base.css                    ← Lead
src/components/    TopNav / YearRail / common primitives  ← Lead
src/three/         NarrativeCanvas + scenes + materials   ← three
src/sections/      prologue + ch01..ch07 + finale         ← narrative
src/archive/       ArchiveView + search/filter/detail     ← archive
src/views/         NarrativeView.tsx AboutView.tsx        ← Lead
src/App.tsx main.tsx index.html vite.config.ts            ← Lead
scripts/           merge-data / validate-data / check-links ← data-integrator
docs/                                              ← Lead + 各自报告
```

禁止跨目录改文件。需要联调时发消息给对应 owner，或由 Lead 协调。

### 4.2 数据 API（`src/data/index.ts`，Lead 提供，勿改签名）

```ts
models: Model[]                       // 已按日期升序
events: HistoryEvent[]                // 已按日期升序
organizations: Organization[]
getModel(id): Model | undefined
getEvent(id): HistoryEvent | undefined
getOrganization(id): Organization | undefined
modelsBetween(from: string, to: string): Model[]
eventsForChapter(chapter: number): HistoryEvent[]
modelEdges(model): { predecessors: Model[]; successors: Model[] }
searchArchive(query: string): SearchHit[]
archiveFacets(): { years; organizations; families; categories; countries; tags }
chapters: ChapterMeta[]               // 8 章元数据
```

### 4.3 滚动状态（`src/lib/narrative-store.ts`）

```ts
interface NarrativeState {
  scrollY: number; pageProgress: number;
  chapter: number;          // 0..8 当前章节
  chapterProgress: number;  // 0..1 当前章节进度
  year: number;             // 展示年份（按章节区间插值）
  velocity: number; direction: 1 | -1;
  reducedMotion: boolean;
}
useNarrative(selector)      // React 订阅，只选原始值
narrative.get()             // 3D / rAF 读取
scrollToChapter(n, opts?)   // 点击年份轨道
```

### 4.4 3D 契约

- `src/three/NarrativeCanvas.tsx` 默认导出 `NarrativeCanvas`：`position: fixed; inset: 0; pointer-events: none; z-index: 0`，由 `NarrativeView` 挂载一次。
- 场景内容由 `narrative.get()` 驱动；离开章节时停止动画（不渲染无意义内容）；`prefers-reduced-motion` 时静态构图。
- 移动端 / 低端设备：降低 DPR（≤1.5）、减少线段/节点数量、关闭后期与阴影。
- 不支持 WebGL：返回 null，页面 CSS 背景仍完整可读。
- 第 5 章星图允许独立 canvas 在章节内交互（拖拽旋转、点击节点），但不要劫持页面滚动；缩放用按钮 + 拖拽，滚轮仅在按住 Alt 或聚焦画布时生效。
- 所有几何、材质、纹理在 unmount 时 dispose。

### 4.5 数据真实性规则

- 页面只展示数据模块中的内容；不硬编码历史日期/模型名（排版装饰除外）。
- 每个模型/事件显示 `verificationStatus` 与 `sources[0]` 链接；`partially-verified` 必须显示「部分核实」标记。
- 不存在的模型绝不展示。若研究中发现用户点名的型号不存在，以 `docs/DATA_REPORT.md` 说明。

### 4.6 质量底线

- 桌面 1440×900 与 1280×800 主验收；移动端 390×844 可用。
- 键盘可达：Tab 顺序合理、focus-visible 清晰、Esc 关闭浮层、搜索支持 ↑↓ Enter。
- 无 console error；构建通过；首屏可交互 < 2s（本地）。
- TypeScript 严格模式；组件不超过 ~250 行，超了拆分。

### 4.7 叙事章节实现规范（narrative 必读）

**滚动编排不要用 React state。** 用 `useStageProgress` 把章节进度写成 CSS 变量 `--p`：

```tsx
import { useStageProgress } from '../../lib/use-stage-progress';
const stageRef = useStageProgress<HTMLDivElement>({ chapter: 3 });
// <div className="stage" ref={stageRef} style={{ '--p': 0 }}>
```

```css
.line { transform: translateX(calc((1 - var(--p)) * 100vw)); }
.beat { opacity: clamp(0, calc((var(--p) - 0.32) / 0.08), 1); }
```

- 区间淡入淡出：`opacity: clamp(0, calc((var(--p) - 0.3) / 0.1), 1);`
- 反向淡出：`opacity: calc(1 - clamp(0, calc((var(--p) - 0.5) / 0.1), 1));`
- 位移/缩放/旋转都用 `calc()` 和 `clamp()` 从 `--p` 推导。
- 入场元素用 `useReveal` / `data-reveal`，不要每个区块都 fade-up。
- 禁止在 scroll 中 setState，禁止每帧重渲染整章。

**章节骨架：**

```tsx
<section className="scene" data-scene data-chapter="2"
  data-year-start="1980" data-year-end="2011" aria-label="…">
  <div className="scene__stage">
    <div className="scene__content">…</div>
  </div>
</section>
```

每章高度 220–420vh，节奏不同；`scene__stage` 内是 sticky 舞台，`scene__content` 已 `position: relative; z-index: 2`，永远在 3D canvas（z-index: 1）之上。

**数据：**

```ts
import { eventsForChapter, modelsForChapter, findModel, getOrgName } from '../../data';
const events = eventsForChapter(2);
const models = modelsForChapter(4);
```

模型/事件名称与日期必须来自数据对象，禁止在 JSX 里手写历史日期。每条关键事实下方放 `<Provenance source={event.sources[0]} status={event.verificationStatus} date={event.displayDate} />`（`src/components/common/Provenance.tsx`）。数据暂空时渲染 `null` 或明确的占位说明，不要造假。

**3D 交互组件（three 团队提供，文件就绪后引入）：**

```tsx
import NetworkStage from '../../three/NetworkStage';        // props: { onSelectEvent?(id) }
import ConstellationStage from '../../three/ConstellationStage'; // props: { onSelectModel?(id) }
```

父容器负责宽高（建议 `position:absolute; inset:0;` 或固定比例），组件内部自己管理 Canvas。

**自测：**

```bash
pnpm exec tsc --noEmit
node tools/shot.mjs http://127.0.0.1:5178/ docs/screens 1440 900 ch03-050 5000 1200
```

用不同 scrollY 截图检查节奏；脚本会打印 console error。

