<!--
感谢提交。保持简短；没有把握的项可以留空。
一个 PR 只做一件事：修正就只修正，新作品就只加新作品。
-->

## 这个 PR 做了什么

<!-- 一句话说清。 -->

## 类型

- [ ] 🐛 修正：页面 / 数据 / 文案 / 交互
- [ ] ✨ 新作品（wish）
- [ ] 🧭 内容与来源补充
- [ ] 🎨 视觉 / 动效 / 排版
- [ ] ⚙️ 构建 / 部署 / 文档
- [ ] 其他：

---

## 1. 如果是在修正问题

- **问题是什么**：
- **原因**：
- **修复方式**：
- **关联 issue**：
- **怎么验证修好了**：

> 附截图 / 录屏 / 控制台输出（如有）。

---

## 2. 如果是新作品

- **wish id**：
- **项目目录**：
- **预览路径**：`projects/<id>/`
- **构建命令 / 产物**：
- **封面**：`site/assets/covers/<id>.jpg`
- **一句话介绍**：

### 新作品检查

- [ ] `wish.json` 字段完整（`id` / `title` / `titleZh` / `year` / `kind` / `status` / `tagline` / `description` / `meta` / `build`）
- [ ] 已设置 `order`，不会和现有作品抢位置
- [ ] `node scripts/build-site.mjs --only=<id> --skip-install` 构建通过
- [ ] 预览在 `/projects/<id>/` 子路径下资源正常（Vite 项目使用 `base: './'`）
- [ ] 封面 1600×1000 已放入 `site/assets/covers/`，或明确接受排版占位
- [ ] 1440×900 与 390×844 均可正常浏览
- [ ] 没有提交 `node_modules` / `dist` / `_site`
- [ ] 没有把私有素材、未授权字体或图片带进来

---

## 3. 如果涉及内容 / 数据

- **官方来源**：
- **日期类型**（公告 / 论文 / 产品 / API / 权重 / 会议）：
- **日期精度**（日 / 月 / 年）：
- **核实等级**（verified / partially-verified / unverified）：

- [ ] 不虚构日期、型号、机构或来源
- [ ] 只查到月份就写月份，没有补日
- [ ] 已运行档案校验（如改数据）：`node scripts/validate-data.mjs`

---

## 验证

- [ ] `node scripts/build-site.mjs --skip-install` 通过
- [ ] `node scripts/test-site.mjs` 通过（可选）
- [ ] 页面截图 / 录屏已附上
- [ ] CI 绿灯

## 备注

<!-- 任何需要维护者知道的事：取舍、未完成项、后续计划。 -->
