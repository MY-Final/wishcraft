# THREE_NOTES — 3D 视觉系统说明

> OWNER: three。范围：`src/three/**` 与本文档。设计系统见 `docs/BUILD_BRIEF.md`。
> 结论先行：全站 3D 是**背景层**，只画 1px 线框与半透明几何；没有任何发光 / 泛光 / 满屏粒子 / 悬浮机器人。

## 1. 层叠契约（重要）

```
.scene 背景（z-auto）  <  .three-backdrop（fixed; z-index: 1; pointer-events: none）  <  .scene__stage（z-index: 2）
```

- `NarrativeCanvas` 由 `NarrativeView` 挂载一次，`position: fixed; inset: 0; z-index: 1`，透明背景，不接收指针事件。
- 章节内容（`.scene__stage`，`src/styles/base.css` 中 z-index: 2）永远在 3D 之上，正文不会被线框或黑色几何遮挡。
- **因此全局层不画全屏不透明填充**：第七章 Agent 工作系统、第八章黑色镜面都由章节 DOM/CSS 承担；全局层在 ch8 只保留镜面下方一条极细收束线，不画矩形或文字。
- 深色章节（第三章）的 `.scene` 背景在 canvas 之下，`MonolithStage` 按 `chapters[n].tone` 把线色切到 `#F2F2EF`，无需 blend。
- 章节内嵌舞台（NetworkStage / ConstellationStage / ChatToActionStage）自带 canvas，`.three-stage { position: relative; z-index: 2; }`，父容器需 `position: relative` 且有明确高度。

## 2. 文件与职责

```
src/three/
  NarrativeCanvas.tsx        固定全屏背景层（唯一挂载点，默认导出）
  NetworkStage.tsx           第二章内嵌舞台（默认导出，自带 Canvas）
  ConstellationStage.tsx     第五章内嵌舞台（默认导出，自带 Canvas）
  ChatToActionStage.tsx      第七章内嵌舞台（**保留但未挂载**：第七章由 narrative 的 DOM/SVG 承担）
  dev/StagePreview.tsx       仅 DEV：?threePreview=network|constellation|action
  scene/
    MonolithStage.tsx        全站 MONOLITH（形态插值 + 相机）
    monolith-geometry.ts     九种形态的顶点目标 + 注意力弧线 + 推理树（纯数据，无 three 依赖）
    network-layout.ts        第二章布局：事件=节点、机构=枢纽、时间=经度
    NetworkScene.tsx         第二章 R3F 场景（拖拽、hover、点击）
    constellation-layout.ts  第五章布局：机构=轨道、时间=角度（真实天数插值）
    ConstellationScene.tsx   第五章 R3F 场景（轨道、标签、筛选透明度）
    ChatToActionScene.tsx    第七章场景：对话框 → 七模块 → 收束
  lib/
    math.ts                  clamp / damp / smoothstep / 确定性 PRNG
    quality.ts               WebGL 探测、dpr 上限、移动端判定
    geometry.ts              共享单位几何（矩形、圆、括号、线段）
    project.ts               3D → 屏幕像素投影（所有 DOM 标签共用）
    presence.ts              内嵌舞台可见性注册表（全局 MONOLITH 自动减弱）
    use-stage.ts             useInView / 页面可见性 / reduced-motion / 舞台活跃状态
  three.css                  3D 层全部样式
```

## 3. `NarrativeCanvas`（全局层）

```tsx
export default function NarrativeCanvas(): JSX.Element | null
```

- 驱动：`MonolithStage` 在 `useFrame` 里调用 `narrative.get()`，**不做任何每帧 React setState**。
- 帧循环：`frameloop={!pageVisible ? 'never' : reducedMotion ? 'demand' : 'always'}`。
  - `document.visibilityState === 'hidden'` → `never`，切后台完全停帧。
  - `prefers-reduced-motion` → `demand`，只在章节变化时 invalidate 一帧；同时所有阻尼被跳过，直接落到确定构图。
- dpr：`min(devicePixelRatio, 1.75)`；移动端 `min(dpr, 1.25)`。
- WebGL 不可用：`detectWebGL()` 失败返回 `null`，页面 CSS 背景与文字完整可读。
- `gl.toneMapping = NoToneMapping`，`setClearAlpha(0)`；无后期处理链、无阴影、无光照。

### 3.1 THE MONOLITH 演化

同一套 `46×28` 网格拓扑（移动端 `30×18`）贯穿九章，**同一个 1px LineSegments、一次 draw call**。
每章只提供一组目标顶点，运行时在两组目标之间逐顶点插值（形态索引 = `chapter + smoothstep(chapterProgress)`，指数阻尼 λ≈2.1）。

| 章节 | 形态 | 几何语言 |
|---|---|---|
| ch0 1950 | line | 一条横线（从光标长出的那根线） |
| ch1 1950–1979 | plane | 由线向上展开的极淡纸面网格（透明度 0.13） |
| ch2 1980–2011 | network | 平面收拢为球面网络（内嵌 NetworkStage 出现时自动减弱到 40%） |
| ch3 2012–2017 | attention | 压成注意力矩阵 + 22 条长程 / 34 条邻域注意力弧（二次贝塞尔采样） |
| ch4 2018–2022 | semantic | 8 层同心矩形环向深处退去的“文字隧道” + 6 个 token 点；线量约为原网格的 1/10 |
| ch5 2023–2024 | map | 只留一条极淡轴线，把画面让给章节星图（内嵌星图出现时再减弱到 25%） |
| ch6 2025 | tree | 收成地平线，推理树以 0.24 透明度退为背景（章节自带图表） |
| ch7 2026 | action | 收成地平线；Agent 工作系统由章节内嵌 ChatToActionStage 承担 |
| ch8 2026 | mirror | 收回成镜面下方一条极细收束线（镜面本体由章节 DOM/CSS 承担） |

相机：只做缓慢推拉（z 4.05–4.5，随章节进度 ±0.06）与极小的鼠标视差（x 偏移 ≤0.24、y ≤0.14，约 ±0.03 rad，远小于 0.15 rad 上限）；`lookAt` 每帧带阻尼，无抖动、无快速旋转。

材质：`LineBasicMaterial`（WebGL 固定 1px，不依赖 `linewidth`），透明、`depthWrite: false`；颜色在墨黑 `#161616` 与 void 白 `#F2F2EF` 间按章节色温插值。

## 4. `NetworkStage`（第二章）

```tsx
export interface NetworkStageProps {
  onSelectEvent?: (id: string) => void;
  events?: HistoryEvent[];      // 默认 eventsForChapter(2)
  className?: string;
}
export default function NetworkStage(props: NetworkStageProps): JSX.Element
```

- 父容器负责尺寸；组件铺满 `100% × 100%`，最小高度 280px。
- 数据：`eventsForChapter(2)`；事件 = 节点（时间 = 经度，纬度 = 确定性散列，球壳分布），事件提及的机构 = 内圈小方块枢纽，时间链 + 事件→机构连线。
- 交互：拖拽旋转（指数阻尼）、hover 显示小型 DOM 浮签（日期 / 标题 / 核验状态）、点击节点回调事件 id 并保留选中括号标记；`RESET VIEW`、方向键旋转（Shift 加速）、Home 复位。
- 不劫持滚动：不监听 wheel；`touch-action: pan-y`，垂直滚动仍交给页面；触摸横向拖拽旋转。
- 可访问性：容器 `role="group"` + `aria-label` + `tabIndex=0`；悬停浮签纯装饰，选中事件由回调交给章节处理（键盘用户走章节正文列表）。

## 5. `ConstellationStage`（第五章）

```tsx
export interface ConstellationStageProps {
  onSelectModel?: (id: string) => void;
  models?: Model[];             // 默认 modelsBetween('2023-01-01', '2024-12-31')
  className?: string;
}
export default function ConstellationStage(props: ConstellationStageProps): JSX.Element
```

- 父容器负责尺寸；组件铺满 `100% × 100%`。
- 数据：2023-01-01 — 2024-12-31 的真实模型（当前 69 个、24 家机构）。
- 布局：机构 = 同心轨道；时间为统一方向（2023-01 正上方，顺时针，**按真实天数插值**）；机构靠半径空间 + 线型（实线 / 虚线 / 点线）+ 灰度区分，不用彩色。
- 机构过多时：只为模型最多的 **8 家**单独建轨道，其余合并为 `其他 N 家` 聚合轨道；筛选按钮写明数量。当前共 9 条轨道。
- 交互：拖拽旋转（阻尼）、`+ / − / RESET` 按钮缩放（0.72–1.9）、Alt+滚轮或画布聚焦后滚轮缩放（其他情况完全交给页面滚动）、机构筛选（`organizations.nameZh`）、hover/点击节点（回调模型 id，选中显示括号标记）。
- 标签：全部为二维 DOM（等宽 8.5px + 1px 引出线），默认只显示每条轨道最早模型的锚点标签，hover / 选中 / 机构筛选中显示对应模型名与日期，避免 69 个标签互相覆盖。
- 键盘：方向键旋转、`+ / -` 缩放、Home 复位。

## 6. `ChatToActionStage`（第七章，保留但未挂载）

> 2026-11-02 裁定：第七章由 narrative 的 DOM/SVG 版本承担；全局 canvas 与章节内均**不再挂载**本组件。
> 文件保留作为后续可复用的场景实现，任何挂载都会与 AgentBoard 重复，默认不要引入。

```tsx
export interface ChatToActionStageProps {
  className?: string;
  demoProgress?: number;   // 仅手动调试用
}
export default function ChatToActionStage(props: ChatToActionStageProps): JSX.Element
```

- 自带 Canvas，铺满父容器。
- 场景进度：对话框 → 七个黑色半透明模块（需求理解 / 检索 / 规划 / 编码 / 工具 / 验证 / 交付）依次展开并连线传递 → 收束成黑色矩形。任务书写“六个模块”但列举了七项，按七项实现。
- 模块名称为二维 DOM 标签，不使用 3D 文字；reduced-motion 停在 p=0.62 静态构图。
- 第七章的 3D 职责：全局 MONOLITH 只保留地平线级别的抽象几何，不画对话框 / 模块 / 黑矩形 / 文字。

## 7. 性能策略

- **共享几何 / 材质**：所有矩形、圆、括号来自 `lib/geometry.ts` 的单位几何，通过 scale 复用；每个场景的线条对象共用 1 个材质；`MonolithStage` 只有 4 个线条材质 + 1 个框线材质。
- **draw call**：全局层 ≈ 6（网格、注意力弧、token 点、推理树、剪枝残枝）；NetworkStage ≈ 6；ConstellationStage ≈ 21（9 轨道 × 2 + 边界/刻度/括号，可接受）；ChatToAction ≈ 20（仅手动调试时可见）。
- **节点数**：移动端口径减半（网格 30×18），dpr ≤1.25；NetworkStage 上限 80 节点，ConstellationStage 上限 9 条轨道。
- **不可见即停**：三个内嵌舞台用 `IntersectionObserver`（rootMargin 160px）控制 `frameloop: never`；全局层按 document 可见性暂停；所有场景在章节不可见时不执行 `useFrame`。
- **DOM 标签**：全部通过 `lib/project.ts` 投影后直接写 `style.transform`，不触发 React 重渲染；React 状态只用于 hover / 选中 / 筛选等低频交互。
- **形态插值**：只有形态变化时才重算 1288 个顶点（`lerpShapes` 内部对静止状态短路），空闲帧零 CPU 几何开销。
- **几何构建**：全部确定性 PRNG（`mulberry32`），同数据同结果，无随机抖动；`geometry.boundingSphere` 预先给固定球，避免扫描。

## 8. 生命周期与 dispose

- `MonolithStage`：`createMonolithData` 产生的 4 个 BufferGeometry 在 `useEffect` 清理时 dispose；5 个材质、镜面框几何、镜面 mesh 同样在清理时 dispose。
- `NetworkScene` / `ConstellationScene` / `ChatToActionScene`：所有几何 + 材质在 `useMemo` 中创建，`useEffect(() => () => resources.dispose(), [resources])` 统一释放；layout 变化时旧资源随依赖替换释放。
- R3F 在 Canvas unmount 时销毁 scene / renderer / canvas；内嵌舞台随章节卸载即停止。
- 事件监听（pointermove / wheel / visibilitychange / IntersectionObserver）全部在 effect 中注册并清理。

## 9. 降级与已知限制

- **无 WebGL**：`detectWebGL()` 为 false 时 `NarrativeCanvas` 返回 `null`；内嵌舞台假设浏览器支持 WebGL（由全局层统一探测）。
- **reduced-motion**：全局层只重绘章节切换帧；内嵌舞台静止但保留交互（hover/筛选/缩放通过 invalidate 重绘）。
- **Node 数**：NetworkStage 节点数由 `eventsForChapter(2)` 决定（当前 11 事件 + 5 机构 = 16 节点，低于 40–80 的目标）；这是数据而非渲染限制，数据增长后自动扩展，最多 80。ConstellationStage 当前 69 模型 / 9 轨道，节点数真实。
- **键盘可达性**：3D 节点本身不可 Tab 聚焦；章节正文提供同一批事件/模型的完整列表。键盘可旋转、缩放、复位。
- **第三章 3D 可见性**：第三章的 `.scene__stage` 目前带不透明 `background: var(--void)`，会遮住全局 canvas；章 `--void` 背景已在 `.scene` 上，删除该行即可让 MONOLITH 的注意力矩阵作为暗场底纹出现（建议 narrative 处理）。
- **各章 stage 背景与全局 3D 可见性**（2026-11-02 实测）：只有 ch01、ch06 的 `.scene__stage` 是透明的，全局 MONOLITH 可见；以下章节的 stage 自带不透明背景，会完全遮住全局 canvas：
  - ch02 `.ch02__stage { background: rgba(250,250,248,0.9) }`（有意做成纸白面纱，保留）
  - ch03 `.scene--ch03 .scene__stage { background: var(--void) }`
  - ch04 `.ch04__stage / .ch04__chat-stage { background: var(--paper/white) }`
  - ch05 `.ch05__stage { background: var(--paper) }`
  - ch07 `.ch07__stage { background: var(--paper) }`
  - finale `.finale__stage { background: var(--paper) }`

  若希望 MONOLITH 在这些章节作为背景出现，把背景色从 `__stage` 移到 `.scene`（已在 canvas 之下）即可；`docs/screens/proof-ch3-canvas.png`、`proof-ch4-tunnel.png` 是移除背景后的效果证明。
- **移动端**：ConstellationStage 标签较多，触控以拖拽为主；筛选按钮超过一行时会换行。
- **第七章**：3D 只提供 MONOLITH 的抽象背景；Agent 工作系统由 narrative 的 DOM/SVG 实现，`ChatToActionStage.tsx` 保留未挂载。
- **第八章镜面**：黑色镜面由章节 DOM/CSS 承担；全局层在 ch8 只保留镜面下方一条极细收束线，不画矩形填充或文字。

## 10. 开发预览

DEV 环境可通过 query 参数单独检视内嵌舞台（生产构建中该分支被 `import.meta.env.DEV` 关闭）：

```
http://127.0.0.1:5178/?threePreview=network
http://127.0.0.1:5178/?threePreview=constellation
```

预览数据仅在 network/constellation 缺少真实数据时使用（前缀 DEMO，不代表任何历史事实）。

## 11. 联调清单（给 narrative）

- ch02：`import NetworkStage from '../../three/NetworkStage'`，`<NetworkStage onSelectEvent={(id) => …} />`，放在有高度的 `position: relative` 容器里（已接入）。
- ch05：`import ConstellationStage from '../../three/ConstellationStage'`，`<ConstellationStage onSelectModel={(id) => …} />`（已接入）。
- ch07：不要挂载 `ChatToActionStage`；Agent 工作系统用 narrative 自己的 DOM/SVG，3D 只留全局 MONOLITH 背景。
- ch08：黑色镜面 DOM/CSS 由 narrative 负责；全局层只留一条极细收束线，无需对齐 3D 几何。
- 不要给 `.scene__stage` 加不透明背景（会遮住全局 3D 背景层）；背景放在 `.scene` 上。
