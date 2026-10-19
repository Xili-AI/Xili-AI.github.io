[![XILI-AI](assets/image/logo.png)](https://xili-ai.github.io/)

# XILI-AI.github.io

**XILI-AI 官网** —— 苏州矽励科技有限公司（Silicon Insight Technology）

**[访问官网 →](https://xili-ai.github.io/)**

---

本仓库是 **GitHub Pages 站点源码**，同时也是 **组织主页数据与工具** 的所在地。

GitHub 的 markdown 净化器不允许在 README 里写样式块、行内样式、class 属性、内联 SVG 和 iframe，
所以组织主页（`Xili-AI/.github`）只能用纯 Markdown；**所有 3D 效果、动效和悬停交互都放在这里**。

## 站点结构

| 路径 | 说明 |
| --- | --- |
| `index.html` | 官网首页：Hero、终端自我介绍、3D 翻转项目卡、3D CPU 芯片、3D 贡献者柱状图 |
| `assets/css/site.css` | 全部样式，含 CSS 3D 芯片 / 柱状图 / 翻转卡 |
| `assets/js/site.js` | 读取数据快照并渲染统计区与贡献者柱状图 |
| `assets/image/logo.png` | 像素风字标 |
| `assets/image/3D.png` | 像素机器人（芯片裸片上的核心） |
| `assets/stats/snapshot.json` | 组织数据快照（由 `tools/gen-stats.js` 生成） |
| `tools/gen-stats.js` | 统计生成器：直读 GitHub REST API，覆盖闭源仓库 |
| `tools/lib/github.js` | GitHub API 客户端（自动处理 202 / 限流） |
| `tools/lib/render.js` | 把数据渲染成 Markdown 表格，注入组织主页 |
| `tools/preview.js` | 本地预览组织主页 README |
| `docs/SETUP-GUIDE.md` | 部署与维护指南 |

## 两个仓库的分工

| 仓库 | 用途 | 技术自由度 |
| --- | --- | --- |
| `Xili-AI/.github` | GitHub **组织主页** | 纯 Markdown —— 样式块、行内样式、class、内联 SVG、iframe 全部被净化器剥除 |
| `Xili-AI/Xili-AI.github.io` | **官网**（GitHub Pages） | 完整 HTML + CSS + JS —— 3D、动效、悬停全部可用 |

## 本地预览

```bash
npm install
npm run preview
```

`npm run preview` 预览的是**组织主页** README（`../.github/profile/README.md`），
产物写到本仓库的 `preview.html`。

## 刷新组织数据

```bash
npm run stats          # 直读 GitHub API（需要 GITHUB_TOKEN）
npm run stats:offline  # 用 assets/stats/snapshot.json 重绘，不联网
```

`npm run stats` 会同时更新本仓库的 `assets/stats/snapshot.json`
和组织主页 `Xili-AI/.github` 里的 Markdown 表格。

> GitHub Actions 工作流（`.github/workflows/update-stats.yml`）每天 03:17 UTC 自动执行一次。

完整说明见 [`docs/SETUP-GUIDE.md`](docs/SETUP-GUIDE.md)。
