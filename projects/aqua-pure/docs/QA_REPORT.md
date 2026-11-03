# AQUA PURE — QA Report

**Date:** 2026-11-03
**Build under test:** `projects/aqua-pure/` (no-build static ES-module app)
**Browser:** headless Chrome with SwiftShader WebGL 2, Chromium via `playwright-core`
**Viewports:** 1440 × 900 desktop / 390 × 844 mobile
**Result:** **26 / 26 PASS**, 0 failed. Zero console errors, page errors, failed requests or HTTP ≥ 400.

完整机读记录见 [`QA_FINAL.json`](QA_FINAL.json)，证据截图见 [`screens/`](screens/)。

## 覆盖项

| 场景 | 检查 | 结果 |
| --- | --- | --- |
| 初始 | 状态 `sealed`、500 ml、瓶盖在瓶口、几何渲染（~571k tris / 77 draw calls） | PASS |
| 初始 | 无 console error / page error / 请求失败 | PASS |
| UI | 控制 dock 可见、状态文案为「满瓶 · 未开封」 | PASS |
| 开盖 | 真实点击 `#btn-open`，动画结束后 `phase=open`、瓶盖离开瓶身、防盗环留在瓶颈 | PASS |
| 开盖 | 俯视瓶口截图，可见世界水平液面 | PASS |
| 倒水 | 瓶身倾斜 68°、水量由 62% 持续下降至 59.4%、水柱可见 | PASS |
| 空瓶 | `phase=empty`、0 ml、草地水洼可见 | PASS |
| 重置 | `phase=sealed`、瓶盖回到瓶口、水量回到 100% | PASS |
| 移动端 | 390 × 844 布局可用、无横向溢出 | PASS |

## 实现层自检

- `node --check` 通过：`config.js`、`profile.js`、`bottle.js`、`label.js`、`environment.js`、`water.js`、`ui.js`、`main.js`、`tools/*.mjs`。
- 液面网格每帧由瓶内轮廓与世界水平面求交重建；倾斜/倒水时液面保持水平。
- 水体由世界空间 `clippingPlanes` 裁剪；验证 clipping plane 的常量与 `waterLevelY` 一致。
- 体积—高度反解：初始满瓶液面 `heightForVolume(fullVolume)` 返回 182.00 mm（与 `config.bottle.initialWaterTop` 一致）。
- 开盖、倒水、空瓶、重置均由真实 DOM 按钮驱动；QA 只在倒水/空瓶截图时使用 `window.__AQUA__.setPose()` 快速摆姿，以绕开 SwiftShader 的低帧率。
- 无外部字体、图片、模型、HDRI 或 CDN 请求。

## 已知限制

- 本 QA 使用 SwiftShader 软件 WebGL，帧率低于真实 GPU；动画时长按真实时间设计（倾斜约 1.8 s、排水约 11 s），在硬件加速浏览器中为设计速度。
- 真实透明材质在不同 GPU/浏览器上的折射观感会有细微差异；参数集中在 `src/config.js`，可调。
