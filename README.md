# WISHCRAFT · 许愿池

> A pool of wishes, each built into a world.
> 一个把愿望做成可运行世界的仓库。

**在线作品集：** https://120403.xyz/wishcraft/ （GitHub Pages；`my-final.github.io/wishcraft` 会跳转到同一站点）

当前收录 **01 个作品**：

## THE INTELLIGENCE ARCHIVE / 智能编年史

> 从图灵的第一个问题，到能够自主执行任务的人工智能。1950—2026。

交互式纪录片：滚动叙事、三维智能纪念碑、全球模型星图、推理树、Agent 工作系统，以及可检索的完整模型档案。

- **数据**：181 个模型 / 93 条历史事件 / 44 家机构
- **核实**：每个模型与事件标注日期类型、日期精度、官方来源与核实等级；无法核实项不出现在数据中
- **档案**：`#/archive` 搜索、筛选、时间轴、模型详情、真实继承关系图谱
- **技术**：Vite + React + TypeScript + Three.js；静态部署，无后端
- **入口**：`projects/intelligence-archive/`；项目内文档见 `docs/DATA_REPORT.md`、`docs/VERIFICATION.md`、`docs/SOURCES.md`

![THE INTELLIGENCE ARCHIVE](docs/portfolio.png)

---

## 仓库结构

```text
wishcraft/
├─ site/                    作品集（纯 HTML/CSS/JS，无构建依赖）
│  ├─ index.html · styles.css · app.js
│  ├─ assets/covers/        作品封面
│  └─ fonts/                自托管 Inter Tight / IBM Plex Mono
├─ scripts/
│  ├─ build-site.mjs        发现 → 构建 → 组装 _site/
│  ├─ serve-site.mjs        本地预览 _site/
│  ├─ make-covers.mjs       从构建产物生成封面
│  └─ test-site.mjs         Playwright 验收脚本
├─ projects/
│  └─ intelligence-archive/ THE INTELLIGENCE ARCHIVE / 智能编年史
└─ .github/workflows/pages.yml
```

## 本地运行

```bash
# 只组装作品集（复用已安装依赖，最快）
node scripts/build-site.mjs --skip-install
node scripts/serve-site.mjs          # http://127.0.0.1:5180/

# 完整构建：为每个项目安装依赖并执行各自的 build
node scripts/build-site.mjs
```

单独开发智能编年史：

```bash
cd projects/intelligence-archive
pnpm install
pnpm dev          # http://127.0.0.1:5178
```

## 以后如何再许一个愿

这个仓库的构建器是通用的。新增作品只需：

1. 在 `projects/` 下新建目录，放入任意可构建的网页工程（Vite / React / Three.js / 单文件 HTML 均可）。
2. 写一个 `wish.json`：

```json
{
  "id": "my-wish",
  "order": 2,
  "title": "MY WISH",
  "titleZh": "我的愿望",
  "year": "2026",
  "kind": "INTERACTIVE",
  "kindZh": "交互式网页",
  "status": "WIP",
  "tagline": "一句可以印在作品集上的话。",
  "description": "两到三句作品说明。",
  "meta": ["2026", "SINGLE PAGE"],
  "preview": "projects/my-wish/",
  "cover": "assets/covers/my-wish.jpg",
  "build": {
    "manager": "pnpm",
    "command": "pnpm build",
    "output": "dist"
  }
}
```

3. 可选：封面放到 `site/assets/covers/my-wish.jpg`（1600×1000）。
4. 提交并 push 到 `main`。Actions 会构建所有项目、生成作品集并发布；导航里会出现新的世界。

### `wish.json` 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | URL 安全、全局唯一；预览地址为 `projects/<id>/` |
| `title` / `titleZh` | 是 | 英文主标题 / 中文标题 |
| `order` | 否 | 作品集排序，数字小的在前 |
| `year` / `kind` / `kindZh` / `status` | 是 | 年份、英文类型、中文类型、状态 |
| `tagline` / `description` / `meta` | 是 | 索引副标题、详情描述、三条元数据 |
| `preview` | 否 | 预览路径；默认 `projects/<id>/` |
| `cover` | 否 | 相对 `site/` 的封面路径；缺省显示排版占位 |
| `build` | 是 | `manager`（pnpm/npm）· `command` · `output`（目录或单文件） |
| `build.mode` | 否 | 设为 `"static"` 时不做构建，直接复制 `source`；可用 `files[]` 附带额外文件 |

构建器会把产物落到 `_site/projects/<id>/index.html`；单文件 HTML 会重命名为 `index.html`。

## GitHub Pages

仓库已包含 `.github/workflows/pages.yml`，Pages 的 Source 已设为 **GitHub Actions**。push 到 `main` 或在 Actions 里手动运行即可发布。

所有资源与导航均使用相对路径，因此可以部署在仓库子路径下。当前 Pages 绑定了自定义域名 `120403.xyz`，站点地址为：

**https://120403.xyz/wishcraft/**

## 已验证

- 干净 clone 后从零安装、构建全部作品并组装 `_site/`：通过；
- GitHub Actions 构建与部署：成功；
- 线上作品集、智能编年史入口、封面、字体：HTTP 200；
- 作品集详情 → 进入作品 → 返回：正常；
- 1440×900 与 390×844 排版检查：通过；
- 智能编年史本身：`tsc` 0 error，`vite build` 通过，181/93/44 数据校验 0 硬错误。

## 来源与授权

智能编年史的数据来源、核实等级与无法核实项见项目内 `docs/DATA_REPORT.md`、`docs/VERIFICATION.md`、`docs/SOURCES.md`。所有第三方模型与机构名称归其各自所有者。
