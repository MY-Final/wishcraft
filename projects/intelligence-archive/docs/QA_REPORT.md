# THE INTELLIGENCE ARCHIVE — 验收报告（QA）

> 验收日期：2026-11-02 · 环境：Windows 11 / Chromium 143（Playwright，SwiftShader 软件渲染）
> 视口：1440×900（主）、1280×800、390×844（移动端）；另测 reduced-motion 与禁用 WebGL。

## 1. 构建与类型

| 检查 | 结果 |
|---|---|
| `pnpm exec tsc --noEmit` | 0 error |
| `pnpm build` | 通过，382 ms |
| 产物 | `dist/index.html` 1.64 kB · CSS 150.8 kB（gzip 27.0 kB）· JS 1.74 MB（gzip 488 kB） |
| 依赖 | Vite 8.3.5 · React 19.3.1 · three 0.187 · @react-three/fiber 9.8.2 |

JS 包体较大来自 Three.js 与全部场景；单页应用一次加载，后续章节无额外网络请求。可接受，但可继续用动态 import 拆分 Three 场景。

## 2. 浏览器行为

| 场景 | 结论 |
|---|---|
| 叙事页 11 个 `data-scene`（含 CH04/CH05 各两段） | 全部可访问；章节跳转、年份轨道、导航栏正常 |
| 控制台 / 页面异常 | 全流程 **0 error / 0 pageerror** |
| 横向溢出（390px） | 0px |
| 深链 `#/chapter/7` | 落到 CH07，年份 2026，导航 `CH. 07` |
| 深链 `#/archive/<model-id>` | 刷新直接还原详情（实测 DeepSeek Coder） |
| 搜索 | `DeepSeek` → 22 行；↑↓ / Enter / Esc 键盘可用；搜索 + 筛选可叠加 |
| 详情浮层 | 打开、Esc 关闭、关闭后 hash 回 `#/archive`、焦点回触发项 |
| 从档案返回叙事 | 恢复离开前的滚动位置（实测 23,358px） |
| 年份轨道点击 | 第 3 个刻度 → 2012 / CH.03 |
| reduced-motion | 章节退化为静态文档流，内容完整可读，无位移动画 |
| 禁用 WebGL | 页面完整渲染，无 canvas、无 console error；第 3 章以排版与 CSS 呈现 |

## 3. 性能

Playwright + SwiftShader 软件渲染下采样（真实 GPU 通常更高）：

| 位置 | FPS |
|---|---:|
| 首屏 / 序章 | 75 |
| CH03 注意力高潮 | 42 |
| CH04 横向轨道 | 72 |
| CH07 档案墙 | 72 |

CH03 的全局注意力矩阵是唯一低于 50 的采样点；已通过半透明与几何收敛控制。若需在低端设备进一步优化，可降低 `MonolithStage` 在 ch03 的线段数或开启更低的 DPR。

## 4. 已知限制

1. **YearRail 年份为章节区间线性插值**（如 CH01 显示 1950→1979），与墙标上的真实事件年份可能相差数年；作为「当前年代」指示可接受，不是逐事件年份。
2. **CH04 / CH05 各拆成两个 `data-scene`**（轨道 + 对话 / 星图 + 落地正文），章节进度按段重置；年份已分别锁到 2022 / 2024，不会回跳。
3. **来源链接**：351 个唯一 URL 全量探测中 4 条 404 已替换；另有 10 条出版社/DOI 反爬（403）、75 条在本环境不可达（HuggingFace、blog.google 等域级限制），浏览器人工可开。详见 `DATA_REPORT.md` 附录。
4. **移动端 YearRail** 为右下角固定年份徽标，可能与个别章节底栏同域；CH01 已避开，其余章节以留白处理。
5. 叙事中的注意力连线、推理树、Agent 工作系统均为概念性可视化，页面已标注；不代表任何模型的真实内部状态。

## 5. 复现命令

```bash
pnpm install
pnpm dev                                  # http://127.0.0.1:5178
node tools/audit.mjs                      # 桌面/移动/reduced-motion/no-WebGL 全量截图 + 报告
node tools/interaction-test.mjs           # 深链、搜索、详情、年份轨道、滚动恢复
pnpm build
```

审计产物：`docs/QA_AUTOMATED.json`，截图在 `docs/screens/audit/`。
