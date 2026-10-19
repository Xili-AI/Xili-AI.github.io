# XILI-AI 官网与组织主页 · 维护指南

> 苏州矽励科技有限公司 GitHub 组织的两仓库体系：
> `Xili-AI/.github`（组织主页）+ `Xili-AI/Xili-AI.github.io`（官网 / GitHub Pages）。
> 本文件在 **官网仓库**（`Xili-AI.github.io`）里。

---

## 0. 目录

1. [为什么是两个仓库](#1-为什么是两个仓库)
2. [本地环境](#2-本地环境)
3. [官网：结构与改法](#3-官网结构与改法)
4. [组织主页：结构与改法](#4-组织主页结构与改法)
5. [数据管线](#5-数据管线)
6. [自动化与 Secrets](#6-自动化与-secrets)
7. [样式速查](#7-样式速查)
8. [排错](#8-排错)

---

## 1. 为什么是两个仓库

GitHub 的 markdown 净化器（`github/markup` 的白名单）在 **所有** markdown 渲染场景里都会剥掉：

| 写法 | 结果 |
| --- | --- |
| 样式块 | 转义成可见文本 |
| 行内样式属性 | 剥除 |
| class 属性 | 剥除 |
| 内联 SVG | 整个剥除 |
| iframe | 转义成可见文本 |
| data URI 的图片 | 剥除 |

这是安全策略，不是 bug。所以**组织主页永远无法用 HTML 定制**——不是写法问题，是 GitHub 不给。

于是分工固定下来：

| 仓库 | 用途 | 能做什么 |
| --- | --- | --- |
| `Xili-AI/.github` | GitHub 组织主页 | 纯 Markdown：标题、表格、图片、链接、emoji |
| `Xili-AI/Xili-AI.github.io` | 官网（GitHub Pages） | 完整 HTML + CSS + JS：CSS 3D、动画、悬停、fetch 动态数据 |

主页负责"介绍 + 引导"，视觉全部在官网。

---

## 2. 本地环境

两个仓库放在同一个目录下：

```
<工作目录>/
├── .github/            ← Xili-AI/.github        （组织主页）
│   └── profile/
│       └── README.md   ← 唯一的文件
└── Xili-AI.github.io/  ← Xili-AI.github.io      （官网 + 工具）
    ├── index.html
    ├── assets/
    │   ├── css/site.css
    │   ├── js/site.js
    │   ├── image/{logo.png,3D.png}
    │   └── stats/snapshot.json
    ├── tools/{gen-stats.js,preview.js,lib/*}
    ├── docs/SETUP-GUIDE.md
    └── .github/workflows/update-stats.yml
```

```bash
cd Xili-AI.github.io
npm install          # 只装一个 marked
npm run preview      # 预览组织主页 README -> preview.html
```

`npm run preview` 通过 `PROFILE_REPO` 环境变量找组织主页仓库，
默认是同级目录下的 `../.github`。可以用环境变量覆盖：

```bash
PROFILE_REPO=/path/to/.github npm run preview
```

---

## 3. 官网：结构与改法

### 3.1 页面骨架（`index.html`）

| 区块 | id | 内容 |
| --- | --- | --- |
| 导航 | `.site-nav` | 吸顶、滚动毛玻璃、锚点跳转 |
| Hero | `.site-hero` | 浮动机器人、**自研 CSS 打字机**、徽章、主按钮 |
| 关于 | `#about` | 终端窗口（闪烁光标）、引言、三张方向卡 |
| 项目 | `#projects` | **3D 翻转卡**（鼠标悬停转 180°）+ 整幅横幅 |
| 技术栈 | `#tech` | **3D CPU 芯片**（金手指 / 裸片 / 电流 / 明暗脉冲）+ 徽章墙 |
| 数据 | `#stats` | 仓库数据卡 + 语言分布 3D 条（JS 渲染） |
| 贡献者 | `#contributors` | **3D 柱状图**（JS 渲染） |
| 联系 | `#contact` | 招聘方向、链接、页脚 |

### 3.2 3D 是怎么做的

**3D CPU 芯片**（`.xl-chip-stage`）

```
.xl-chip-stage   perspective:1200px
  .xl-cpu-tilt     transform: rotateX(34deg) rotateZ(-14deg)  +  preserve-3d
    .xl-cpu        preserve-3d
      .xl-cpu-top    translateZ(26px)                   -> 封装顶面
        .xl-cpu-pins  四边金手指
        .xl-cpu-die   裸片：电流光带 + 8 颗流动粒子 + 机器人
        .xl-cpu-mark  印在封装上的 logo
      .xl-cpu-front  translateZ(26px) rotateX(-90deg)   -> 前侧壁
      .xl-cpu-right  translateZ(26px) rotateY(90deg)     -> 右侧壁
```

要点：

1. **侧壁枢轴在棱上**：`transform-origin: top center` / `left center` 把侧壁钉在顶面棱上再转 90°，
   芯片才有真实厚度。改 `transform-origin` 必须同时改旋转符号，否则面会飘走。
2. **不能用 filter 做明暗**：`filter` 会把元素的 3D 上下文拍平。
   所以顶面用 `mix-blend-mode: screen` 的叠加层（`.xl-cpu-top::after`），
   只有侧壁这种没有 3D 子元素的才用 `filter: brightness()`。
3. **明暗脉冲周期统一 3.6s**：芯片亮度、辉光、光带、电流粒子、扩散能量环共用这一个周期，
   所以每次"亮一下"电流正好冲到峰值。改周期要一起改这 5 处 `@keyframes`。
4. **侧壁不要叠 opacity 动画**，否则芯片会整块消失。

**3D 柱状图**（`.xl-chart`）

```
.xl-chart-scene   perspective:1100px  +  transform: rotateX(-8deg)  +  preserve-3d
  .xl-chart-floor   rotateX(-90deg)  -> 地面网格（枢轴在 top，向后延伸）
  .xl-bar           preserve-3d
    .xl-bar-front   正面
    .xl-bar-cap     rotateX(-90deg)  -> 顶面
    .xl-bar-side    rotateY(-90deg)  -> 侧面
```

**3D 翻转卡**（`.xl-card`）

```
父级 .xl-cards       -> perspective
中间 .xl-card-inner  -> transform-style: preserve-3d
正反面 .xl-face      -> backface-visibility: hidden
```

### 3.3 改样式

全部变量在 `assets/css/site.css` 顶部：

| 变量 | 当前值 | 用途 |
| --- | --- | --- |
| `--xl-blue` | `#3a6ed8` | 主蓝 |
| `--xl-blue2` | `#5b9bd5` | 浅蓝渐变端 |
| `--xl-cyan` | `#5fd3f3` | 青色高光 / 辉光 |
| `--xl-deep` | `#0b1b3a` | 深蓝描边 |
| `--xl-ink` | `#060b18` | 近黑投影 |
| `--xl-glow` | `#4ea8ff` | 辉光色 |
| `--xl-violet` | `#7c5cff` | 紫色渐变端 |
| `--xl-pix` | `Press Start 2P` | 像素字体（标题、仓库名） |
| `--xl-mono` | `VT323` | 终端 / 徽章 / 数字 |
| `--xl-body` | `Noto Sans SC` | 中文正文 |
| `--page-bg` `--page-fg` `--page-dim` `--shell` | — | 页面底色 / 正文 / 次要文字 / 版心宽度 |

常用类名速查：

| 类名 | 作用 |
| --- | --- |
| `.site-nav` `.site-hero` `.site-section` `.site-foot` | 页面骨架 |
| `.bg-grid` `.bg-glow` | 背景网格与光晕 |
| `.xl-head` `.xl-sub` `.xl-divider` | 像素标题 / 副标题 / 分隔线 |
| `.xl-float` `.xl-type` | 浮动动画 / 自研打字机 |
| `.xl-term` `.xl-term-body` `.xl-caret` | 终端窗口 + 闪烁光标 |
| `.xl-badge` `.xl-chip` | 立体徽章 / 小标签 |
| `.xl-cards` `.xl-card` `.xl-face` | 3D 翻转卡 |
| `.xl-wide` | 整幅横幅 |
| `.xl-chip-stage` `.xl-cpu-*` | 3D CPU 芯片 |
| `.xl-repos` `.xl-repo` | 仓库数据卡 |
| `.xl-langrow` `.xl-langtrack` | 语言分布 3D 条 |
| `.xl-chart` `.xl-bar` `.xl-chart-floor` | 3D 柱状图 |
| `.xl-mini` `.xl-grid` | 通用卡片 |

### 3.4 响应式

断点：`900px`（平板/手机收起导航）、`640px`（手机）、`380px`（超窄屏）。

- **导航**：≤900px 时链接收进汉堡抽屉，点 burger 展开，点链接/空白/Esc 关闭，
  视口变宽时自动收起。
- **打字机**：用 `clip-path: inset()` 从左往右揭示文字（而不是动画 `width`），
  否则文字宽度变化会导致整块重新居中、左右同时被裁。窄屏下换更小的字号。
- **3D 项目卡**：触屏没有 `hover`，用 `@media (hover:none) and (pointer:coarse)`
  让卡片自动翻转，官网和 README 的效果都能保留。
- **贡献者柱状图**：窄屏下名字竖排（`rotate(-90deg)`），图表本身横向滚动，
  避免 8 个成员挤成一条线。
- **安全区**：所有固定留白都叠加了 `env(safe-area-inset-*)`，适配刘海屏。
- `html` 和 `body` 都设了 `overflow-x:hidden`，防止光晕等装饰元素把页面撑宽。

> 改动响应式后，**`@media` 规则必须放在样式表末尾**。
> 组件规则写在后面会覆盖同优先级的媒体查询规则（旧的移动端规则曾经因此完全没生效）。

---

## 4. 组织主页：结构与改法

仓库 `Xili-AI/.github` **只有 `profile/README.md` 一个文件**。

| 区块 | 内容 |
| --- | --- |
| 顶部 | 站标（指向官网的绝对 URL）+ 标题 + 官网入口链接 |
| 关于我们 | 三个方向表格 |
| 项目 | 两个闭源项目的表格 |
| 技术栈 | 按领域分的表格 |
| 组织数据 | 仓库表 / 语言表 / 成员贡献表（**自动生成**） |
| 联系我们 | 官网 + GitHub |

图片用官网的绝对地址，不依赖本仓库：

```markdown
[![XILI-AI](https://xili-ai.github.io/assets/image/logo.png)](https://xili-ai.github.io/)
```

---

## 5. 数据管线

```
GitHub REST API
      │  GET /orgs/Xili-AI
      │  GET /orgs/Xili-AI/repos?type=all
      │  GET /orgs/Xili-AI/members
      │  GET /repos/Xili-AI/<repo>/languages
      │  GET /repos/Xili-AI/<repo>/stats/contributors
      ▼
tools/gen-stats.js
      │  聚合 -> assets/stats/snapshot.json      （官网读取）
      │  渲染 -> 组织主页的 Markdown 表格          （注入 .github 仓库）
      ▼
```

两个消费者：

- **官网** `assets/js/site.js` 用 `fetch('assets/stats/snapshot.json')` 渲染统计区与柱状图
- **组织主页** `tools/lib/render.js` 渲染成 Markdown 表格，由 `tools/gen-stats.js` 注入

### 5.1 注入是怎么定位的

`tools/gen-stats.js` 用**标题**定位，不用任何标记语法：

```js
const SECTIONS = {
  meta: '## 组织数据',
  repos: '### 仓库',
  languages: '### 语言分布',
  contributors: '### 成员贡献',
};
```

替换范围 = 标题行之后，到下一个标题（或 `---`）之前的全部内容。
**所以组织主页里一个尖括号都没有**，而且生成器是幂等的（跑多少次结果都一样）。

> 改标题名会破坏注入，生成器会直接报错退出，不会静默写坏。

### 5.2 闭源仓库为什么能统计到

`GET /orgs/{org}/repos?type=all` 在带 PAT 且 PAT 拥有 `repo` 权限时**会返回私有仓库**。
贡献数来自 `GET /repos/{owner}/{repo}/stats/contributors`（按默认分支统计每个作者的提交数）。
首次调用可能返回 `202`（正在计算），`tools/lib/github.js` 会自动轮询重试。

> `.github` 仓库本身是主页载体，不是项目，采集阶段就剔除。

### 5.3 命令

```bash
npm run stats          # 直读 GitHub API（需要 GITHUB_TOKEN）
npm run stats:offline  # 用快照重绘，不联网
npm run stats:dry      # 只打印，不写文件
```

---

## 6. 自动化与 Secrets

工作流：`.github/workflows/update-stats.yml`，每天 **03:17 UTC** 跑一次，也可以手动触发。

需要两个 Secret（仓库 Settings → Secrets and variables → Actions）：

| Secret | 权限 | 用途 |
| --- | --- | --- |
| `STATS_TOKEN` | Fine-grained PAT，Resource owner = `Xili-AI`，Repository access = All repositories，Permissions: Contents(Read) + Metadata(Read) + Members(Read) | 读**闭源**仓库与组织成员 |
| `PROFILE_TOKEN` | 同上，但要 `Contents: **Write**` | 把生成好的表格推回 `Xili-AI/.github` |

工作流做的事：

1. 克隆 `Xili-AI/.github` 到临时目录
2. `node tools/gen-stats.js` —— 抓数据、写快照、注入主页
3. 提交并推送组织主页的 `profile/README.md`
4. 提交并推送官网的 `assets/stats/snapshot.json`

> 用 `STATS_TOKEN` 而不是内置的 `GITHUB_TOKEN`：内置 token 只能访问当前仓库，
> 拿不到闭源仓库的数据，也列不出组织成员。

---

## 7. 排错

### 7.1 官网打不开 / 404

- 仓库名必须是 `Xili-AI.github.io`（和 org 名完全一致）
- Settings → Pages → Source 选 **Deploy from a branch** → `main` → `/ (root)`
- 仓库必须 public
- 改动后等 1～2 分钟，Pages 有构建延迟

### 7.2 官网的 3D 没了

三个属性缺一不可：`perspective`（父级）、`transform-style: preserve-3d`（中间层）、
`backface-visibility: hidden`（正反面）。详见 [3.2](#32-3d-是怎么做的)。

### 7.3 柱状图/芯片的面飘了

枢轴位置和旋转符号必须成对修改。

### 7.4 统计区没数据

- 浏览器直接访问 `https://xili-ai.github.io/assets/stats/snapshot.json`，看是否有 JSON
- 没有 → 运行 `npm run stats` 生成并提交
- 有但页面显示"数据暂不可用" → 看浏览器控制台，多半是路径或 JSON 格式问题

### 7.5 主页表格没更新

- `npm run stats` 是否报错
- `PROFILE_REPO` 是否指向正确的 `../.github`
- 标题名是否被改过（生成器靠标题定位）

### 7.6 主页出现样式源码

说明主页里混进了样式块或 HTML 标签。组织主页必须是**纯 Markdown**：
表格用 `| --- |`，图片用 `![alt](url)`，链接用 `[文字](url)`。

### 7.7 动效太吵

README/官网页面本身就重，同时运行的动画不要超过 3～4 个。
优先用 `transform` / `opacity`，避免动画 `width` / `height` / `top`。
系统偏好已支持：

```css
@media (prefers-reduced-motion: reduce){ ... animation:none !important; }
```
