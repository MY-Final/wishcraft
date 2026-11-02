# THE INFERENCE — 验收报告

**日期：** 2026-11-02
**构建：** `pnpm build`（`tsc --noEmit` + Vite 生产构建）
**浏览器：** Google Chrome / Playwright Chromium，headless，SwiftShader WebGL
**视口：** 1440×900（桌面）、390×844 @2×（移动）、reduced-motion 模拟
**结果：** **33 / 33 通过；0 page error；0 console error**

机器可读结果：[`QA_FINAL.json`](QA_FINAL.json)。截图在本地 `docs/qa/`（`.gitignore` 忽略，可由 `pnpm qa` 重新生成）。

---

## 运行方式

```bash
cd projects/inference
pnpm install
pnpm build
pnpm exec vite preview --host 127.0.0.1 --port 5190 --strictPort
pnpm qa
```

`tools/qa.mjs` 使用系统 Chrome（可用 `CHROME_PATH` 覆盖）与 `playwright-core`。所有用户交互都通过真实 DOM 点击/键盘完成；只有时间轴跳转与 draw-call 读取走仅限 QA 的 `window.__INFERENCE__` 句柄。

---

## 覆盖范围

| 组 | 验收项 | 结果 |
|---|---|---|
| 入口 | 标题、预填问题、开始按钮、无横向溢出 | 4/4 |
| 播放 | 进入旅程、章节/播放器可达、键盘 Space 暂停与继续 | 3/3 |
| 控制 | 直接跳章、0.5×/1×/2×、时间轴拖拽（真实指针） | 3/3 |
| 深潜 | 打开“深入了解”、内容标题、Esc 关闭 | 2/2 |
| 底稿 | 技术档案包含 10 个验收问题 | 1/1 |
| 模式 | Web / API 切换，Dense / MoE 切换 | 2/2 |
| 3D 拾取 | 点击 attention 节点打开解释；点击 embedding 向量打开 Token 检视器 | 2/2 |
| 解码实验 | 概率面板出现；Temperature 变为 1.5 并更新 UI | 2/2 |
| 自由探索 | 暂停、隐藏阅读面板、拖拽改变相机、退出 | 2/2 |
| 性能/健康 | 单章 draw calls 在预算内、零浏览器错误 | 2/2 |
| 终局 | 结语出现、可关闭进入全景自由观察 | 2/2 |
| 移动端 | 无横向溢出、移动 chrome、隐藏桌面导轨、9 章工作表、跳章、采样面板可达 | 6/6 |
| 无障碍偏好 | `prefers-reduced-motion` 下世界正常初始化 | 1/1 |

合计：**33 项**。详细断言见 `QA_FINAL.json`。

---

## 关键证据

- 真实 Tokenizer 数据：输入 `为什么天空是蓝色的？` 被切成 6 个真实 Token；ID 与位置在 `src/data/tokenization.ts`；来源与复核脚本在 `research/`。
- 3D 拾取：扫描安全区找到 `attention-weights` 并真实点击打开“注意力矩阵”；另找到 `vector-space`（tokenIndex=3）并打开 Token 检视器。
- 模式切换：`clientMode=api`、`architecture=moe` 状态与 UI 同步。
- 温度：键盘操作 range 到最大值后，store 与显示均为 `1.50`。
- 自由探索：拖拽后相机坐标变化 >0.1；`.app.is-exploring` 生效；退出正常。
- 移动：章节工作表 9 项；390 px 下横向溢出为 0。
- 终局标题：完整包含「你看到的是一段回答，它经历的却是一场复杂的计算旅程。」

---

## 渲染规模

| 指标 | 实测 |
|---|---|
| 单章可见 draw calls | 约 20–141（依场景与裁剪） |
| 全景（全部章节 + 地标） | 约 493 |
| 全景三角面 | 约 195.7k |
| JS bundle | 1.05 MB / 294.7 KB gzip |
| CSS | 64 KB |

QA 环境使用 SwiftShader 软件光栅化，全景约 21 fps；该数字**不代表**真实 GPU 上的帧率。单章画面基本在 20–141 draw calls，桌面独显/集显应远高于此。

---

## 已知边界

1. **模拟数据**：延迟、TTFT、吞吐、KV Cache 占用、attention 权重、logits、采样与三维 embedding 坐标都是模拟/概念可视化；UI 与技术档案逐项标注。只有 tokenizer 的文本、Token 边界与 ID 是真实数据。
2. **不展示隐藏思维链**：作品只解释公开的输入/输出、注意力与自回归机制，不伪造模型内部推理文本。
3. **全景分辨率**：全景需要同时渲染全部章节，draw calls 约 493；作为结语镜头与自由观察可以接受，但不是播放过程中的常态。
4. **WebGL 文本**：三维空间里的小标签在远景下偏小；章节卡、点击解释和深潜提供完整文字版本。
5. **移动端**：为给 3D 留空间，章节摘要收起为 2 行，完整内容在深潜/技术档案中；采样面板在小屏上是可滚动的底部面板。
6. **浏览器覆盖**：自动化在 Chrome 上完成；Safari/Firefox、实体触屏与读屏软件未做逐项人工验收。使用了原生 `<dialog>`、可见焦点与按钮名称，但不等同于完整 WCAG 审计。
7. **构建提示**：Vite 提示单 chunk >500 KB；这是 Three.js + React 单页应用的体积提示，不是构建失败。未来可按章节动态 import 场景做代码分割。
8. **无后端**：没有真实 API 调用、没有付费服务、没有用户输入上传。

---

## 本次冻结的产物

- `dist/` — 已清理旧哈希文件后重新构建；入口为 `dist/index.html`，资源全部相对路径。
- `site/assets/covers/inference.jpg` — 1600×1000 作品集封面。
- `docs/QA_FINAL.json` — 本次 33/33 的机器可读记录。
- `docs/QA_REPORT.md` — 本文件。
