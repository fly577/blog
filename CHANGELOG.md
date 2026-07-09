# 📋 项目演进日志

> 记录 BlogAutoPublisher 项目在不同阶段的操作、优化成果与未来演进方向。
>
> 最后更新：2026-07-09

---

## 目录

- [版本时间线](#版本时间线)
- [各版本详情](#各版本详情)
  - [v1.0 — 博客自动化发布工具](#v10--博客自动化发布工具)
  - [v1.1 — Bento Grid 自定义主题](#v11--bento-grid-自定义主题)
  - [v1.2 — 标签着陆页修复](#v12--标签着陆页修复)
  - [v1.3 — npm Scripts / CI/CD / Giscus 评论](#v13--npm-scripts--cicd--giscus-评论)
  - [v1.4 — 分类支持](#v14--分类支持)
  - [v1.5 — 完整使用指南](#v15--完整使用指南)
- [优化成果总结](#优化成果总结)
- [已知问题与后续优化方向](#已知问题与后续优化方向)
- [技术债务记录](#技术债务记录)
- [贡献者](#贡献者)

---

## 版本时间线

| 版本 | 日期 | 提交 | 主题 |
|------|------|------|------|
| v1.0 | 2026-07-09 | `0a8e58d` | 🚀 博客自动化发布工具 — inject / publish / deploy 全链路 |
| v1.1 | 2026-07-09 | `a7d9d35` | 🎨 Bento Grid 自定义主题 |
| v1.2 | 2026-07-09 | `46cdd68` | 🐛 修复 `/tags/` 页面 404 |
| v1.3 | 2026-07-09 | `969af0d` | ⚡ npm scripts / CI/CD / Giscus 评论 |
| v1.4 | 2026-07-09 | `5e1959e` | 🏷️ 分类支持 |
| v1.5 | 2026-07-09 | `7a2853e` | 📖 完整使用指南 |

---

## 各版本详情

### v1.0 — 博客自动化发布工具

**提交**: `0a8e58d` | **日期**: 2026-07-09

#### 做了什么

搭建了项目的核心骨架 —— 一个基于 Node.js 的命令行博客发布工具链。

**核心功能模块：**

| 模块 | 能力 | 对应函数 |
|------|------|----------|
| 📂 文章扫描 | 读取目录下所有 `.md` 文件，解析 YAML frontmatter | `loadMarkdownFiles()` / `printSummary()` |
| ✍️ Front Matter 注入 | 正则提取标题 + 前 100 字摘要，自动生成 YAML 头部 | `injectFrontmatter()` / `batchInjectFrontmatter()` |
| 📤 一键发布 | 复制文章到 Hexo → 构建静态站点 | `publishToHexo()` |
| 🚀 独立部署 | 单独执行 `hexo deploy` 推送至 GitHub Pages | `deployToGHPages()` |

**技术选型：**
- `gray-matter` — 解析/生成 YAML frontmatter
- `chalk` — 终端彩色输出
- Hexo 作为静态站点生成器
- GitHub Pages 作为托管平台

#### 带来的优化

| 优化点 | 之前 | 之后 |
|--------|------|------|
| 文章发布流程 | 手动写 frontmatter → 手动复制到 Hexo → 手动构建部署 | 一条命令完成全流程 |
| 元数据填写 | 每次手写 YAML 头部，容易遗漏字段 | `inject` 自动补全标题、日期、摘要 |
| 文章管理 | 直接操作 Hexo `_posts` 目录 | 独立 `posts/` 目录，与 Hexo 解耦 |
| 发布可靠性 | 手动操作容易出错（忘复制、路径错误） | 脚本化流程，幂等操作，`--force` / `--dry-run` 安全机制 |

#### 暴露的待解决问题

- Hexo 默认主题（Landscape）视觉单调，缺乏个性
- 没有标签/分类体系，内容组织能力弱
- 部署仍需手动执行，未集成 CI/CD
- 缺少评论系统，无法与读者互动

---

### v1.1 — Bento Grid 自定义主题

**提交**: `a7d9d35` | **日期**: 2026-07-09

#### 做了什么

从零开发了 **Bento** 自定义 Hexo 主题，替换默认的 Landscape 主题。

**设计系统：**

| 要素 | 规格 |
|------|------|
| 背景色 | 暖白 `#FBFBF9` |
| 强调色 | 莫兰迪青系列 |
| 圆角 | `20px` 统一大圆角 |
| 阴影 | 极柔多层阴影（`0 1px 2px`, `0 4px 16px` 等） |
| 字体 | 系统字体栈 + 中文优化 |

**布局架构 — Bento Grid（5 卡片不规则错落）：**

| 卡片 | 内容 | 布局位置 |
|------|------|----------|
| A — About | 头像 / 首字母 + 个人简介 | 左上（跨 2 行） |
| B — Featured | 最新一篇置顶文章（大摘要） | 右上（跨 2 列） |
| C — Recent | 最近 4 篇文章列表 | 左下 |
| D — Tags+Categories | 标签云 + 分类列表（实心/镂空区分） | 中下 |
| E — Social | GitHub / 社交链接 | 右下 |

**主题文件结构（25 个文件）：**
```
bento/
├── _config.yml          # 主题配置（菜单/社交/Giscus/头像/简介）
├── layout/
│   ├── layout.ejs       # 根布局
│   ├── index.ejs        # 首页 Bento Grid
│   ├── post.ejs         # 文章详情页
│   ├── archive.ejs      # 归档页（按年分组）
│   ├── tag.ejs          # 标签页
│   ├── category.ejs     # 分类页
│   ├── page.ejs         # 通用页面
│   └── _partial/        # 可复用组件
│       ├── head.ejs / header.ejs / footer.ejs
│       ├── card-about.ejs / card-featured.ejs / card-recent.ejs
│       ├── card-tags.ejs / card-social.ejs
│       ├── post-meta.ejs / post-nav.ejs
└── source/css/
    ├── style.css        # 入口（@import 汇总）
    ├── variables.css    # CSS 自定义属性（设计令牌）
    ├── reset.css / base.css
    ├── layout.css / grid.css
    ├── header.css / footer.css
    ├── cards.css / post.css
    ├── archive.css / tag.css
    └── responsive.css   # 断点：桌面 3 列 → 平板 2 列 → 手机单列
```

#### 带来的优化

| 优化点 | 之前 | 之后 |
|--------|------|------|
| 视觉品质 | Landscape 默认主题，无辨识度 | 莫兰迪设计系统，Bento Grid 布局，专业感 |
| 首页信息密度 | 只有文章列表 | 5 卡片展示：关于 / 精选 / 最近 / 标签 / 社交 |
| 动效体验 | 无 | 卡片入场动画 + 悬停上移 + 标签胶囊 hover |
| 导航体验 | 普通顶栏 | 毛玻璃粘性顶栏（`backdrop-filter` 模糊） |
| 响应式 | 基础 | 完整三断点响应式 |
| 可定制性 | 需改主题源码 | `_config.yml` 配置头像/简介/社交链接 |

#### 暴露的待解决问题

- `/tags/` 页面缺少着陆页 → 404 错误
- 标签页有，但缺少 `/categories/` 分类维度
- Giscus 评论尚未集成
- 本地需手动 `npm run release` 才能部署

---

### v1.2 — 标签着陆页修复

**提交**: `46cdd68` | **日期**: 2026-07-09

#### 做了什么

修复了 Bento 主题中 `/tags/` 路径返回 404 的问题。

**根因：** Hexo 的标签系统需要 `source/tags/index.md` 作为着陆页入口，但自定义主题创建时遗漏了该文件。

**修复：** 创建 `blog/source/tags/index.md`，设置 `type: tags` 和 `comments: false`。

#### 带来的优化

- 标签云页面可正常访问
- 为后续标签体系的完整展示奠定了基础

---

### v1.3 — npm Scripts / CI/CD / Giscus 评论

**提交**: `969af0d` | **日期**: 2026-07-09

#### 做了什么

三管齐下的基础设施升级：

**① npm Scripts 封装**

将 `node index.js` 命令封装为语义化的 npm scripts：

```json
{
  "scan":    "node index.js scan ./posts",
  "inject":  "node index.js inject ./posts",
  "publish": "node index.js publish ./posts --blog ./blog --build --force",
  "deploy":  "node index.js deploy --blog ./blog",
  "release": "node index.js publish ./posts --blog ./blog --build --deploy --force",
  "dev":     "cd blog && npx hexo server",
  "clean":   "cd blog && npx hexo clean"
}
```

操作层级从「记住 CLI 参数」降维到「记住语义化命令名」。

**② GitHub Actions CI/CD**

创建 `.github/workflows/deploy.yml`：

```
git push → Checkout → Setup Node → npm ci (root + blog)
→ publish posts → peaceiris/actions-gh-pages@v4 → gh-pages 分支
```

关键配置：
- `force_orphan: true` — 保持 `gh-pages` 分支干净，每次部署单次提交
- `workflow_dispatch` — 支持手动触发（GitHub UI → Actions → Run workflow）
- `permissions: contents: write` — 允许推送至 `gh-pages`

**③ Giscus 评论系统**

在 Bento 主题中集成 [Giscus](https://giscus.app/)（基于 GitHub Discussions 的评论系统）：

- 在 `_config.yml` 中增加 `giscus` 配置块（`enable / repo / repo_id / category / category_id / mapping / theme / lang`）
- 在 `post.ejs` 文章页底部嵌入 Giscus `<script>` 标签
- 无第三方服务依赖，数据存储在仓库 Discussions 中

#### 带来的优化

| 优化点 | 之前 | 之后 |
|--------|------|------|
| 命令记忆成本 | 需记忆 `--blog` `--force` `--build` 等参数 | `npm run release` 一行搞定 |
| 部署方式 | 本地手动执行 → 等待构建 → 手动推送 | `git push` → Actions 自动部署，零手动 |
| 部署可靠性 | 依赖本地环境（Node 版本、网络等） | CI 环境标准化（ubuntu-latest, Node 20） |
| 读者互动 | 无评论功能 | Giscus 评论，基于 GitHub 账号体系 |
| 隐私/数据 | — | 数据自托管（GitHub Discussions），无第三方追踪 |

#### 暴露的待解决问题

- 标签页存在，但分类（Categories）页面尚未创建
- 缺少完整的使用文档（README 当时较简略）

---

### v1.4 — 分类支持

**提交**: `5e1959e` | **日期**: 2026-07-09

#### 做了什么

补齐了内容组织的第二个维度 —— **分类（Categories）**。

**具体改动：**
- 创建 `blog/source/categories/index.md` 着陆页（`type: categories`）
- Bento 主题新增 `layout/category.ejs` 分类列表模板
- 首页卡片 D（Tags+Categories）区分展示：标签用实心胶囊，分类用镂空胶囊

**标签 vs 分类的视觉区分：**

| 维度 | 样式 | 语义 |
|------|------|------|
| 标签 | 实心背景色胶囊 | 跨主题关键词（如 `JavaScript`, `教程`） |
| 分类 | 镂空边框胶囊 | 内容领域归类（如 `技术`, `生活`） |

#### 带来的优化

| 优化点 | 之前 | 之后 |
|--------|------|------|
| 内容组织 | 仅标签一个维度 | 标签 + 分类双维度 |
| 页面覆盖 | `/tags/` | `/tags/` + `/categories/` |
| 视觉层次 | 标签单一视觉 | 实心/镂空双样式，一眼区分 |

---

### v1.5 — 完整使用指南

**提交**: `7a2853e` | **日期**: 2026-07-09

#### 做了什么

将分散的知识沉淀为结构化的 README 文档，覆盖所有功能点：

| 章节 | 内容 |
|------|------|
| ✨ 功能 | 核心工具链 + Bento 主题特性（表格速览） |
| 📁 项目结构 | 完整目录树 + 每个目录/文件的职责说明 |
| 🚀 快速开始 | 4 步从零到预览 |
| 📖 使用指南 | 写文章 → npm scripts 速查表 → 日常工作流 → CLI 详解 |
| 🎨 Bento 主题配置 | `_config.yml` 完整配置项说明 |
| 💬 Giscus 评论配置 | 7 步配置指南（从安装 GitHub App 到部署） |
| 🔄 GitHub Actions | 工作流说明 + 手动触发方式 |
| 📦 模块导出 | 全部导出函数签名（方便以库形式使用） |
| 🔧 常见问题 | 缓存/Giscus/Actions/主题颜色 4 个 FAQ |

#### 带来的优化

- 新用户上手时间从「摸索源码」降到「跟文档 4 步跑通」
- 配置项有据可查，不再需要翻主题源码
- FAQ 减少了重复答疑

---

## 优化成果总结

### 量化对比

| 维度 | v1.0 初始状态 | v1.5 当前状态 |
|------|--------------|--------------|
| 发布步骤 | 4-5 步手动操作 | 1 条命令或自动 CI |
| 主题文件数 | 0（默认主题） | 25（完整自定义） |
| 首页展示维度 | 1（文章列表） | 5（About/Featured/Recent/Tags/Social） |
| 内容组织维度 | 0 | 2（标签 + 分类） |
| npm scripts | 0 | 7 |
| CI/CD | 无 | GitHub Actions 自动部署 |
| 评论系统 | 无 | Giscus（GitHub Discussions） |
| 文档完整度 | 简略 | 8 章节全覆盖 |

### 架构收益

```
posts/*.md               ← 用户唯一需要关心的目录
    │
    ├─ npm run inject    ← 自动补全元数据
    ├─ npm run scan      ← 检查文章状态
    ├─ npm run dev       ← 本地预览
    │
    └─ npm run release   ← 一键发布（或 git push 自动触发）
         │
         ├─ publishToHexo()   → blog/source/_posts/
         ├─ hexo generate     → blog/public/
         └─ hexo deploy       → gh-pages → https://hesiea.github.io/blog/
```

**关键设计决策：**
- **`posts/` 与 Hexo 解耦** — 文章源文件独立于静态站点生成器，方便未来切换生成器（如换用 Astro/Next.js）
- **CLI 与 npm scripts 双模式** — 高级用户可用完整 CLI 参数，日常用户用语义化 scripts
- **主题作为独立模块** — Bento 主题可单独提取复用

---

## 已知问题与后续优化方向

### 🔴 短期（1-2 周内）

| # | 方向 | 描述 | 优先级 |
|---|------|------|--------|
| 1 | 图片支持 | `posts/` 中的图片资源目前无法自动随文章发布到 Hexo。需要支持自动复制文章关联的图片到 `blog/source/images/` | 🔴 高 |
| 2 | 草稿模式 | 增加 `draft: true` 支持 — 标记为草稿的文章不发布，本地预览可见 | 🔴 高 |
| 3 | 发布校验 | `publish` 前自动检查：是否有标题、是否有日期、是否有重复 slug | 🟡 中 |

### 🟡 中期（1-3 月内）

| # | 方向 | 描述 | 优先级 |
|---|------|------|--------|
| 4 | 搜索功能 | 集成客户端全文搜索（如 Pagefind / Lunr.js），无需后端 | 🟡 中 |
| 5 | RSS/Atom Feed | 自动生成 RSS feed，方便读者订阅 | 🟡 中 |
| 6 | SEO 优化 | 自动生成 `og:image`（社交分享卡片图）、`meta description` 完善、结构化数据（JSON-LD） | 🟡 中 |
| 7 | 暗色模式 | Bento 主题增加 dark mode 支持（CSS 变量切换 + 系统偏好检测） | 🟡 中 |
| 8 | 文章模板 | `npm run new "标题"` 自动在 `posts/` 创建带 frontmatter 骨架的 `.md` 文件 | 🟢 低 |

### 🟢 长期（3 月+）

| # | 方向 | 描述 | 优先级 |
|---|------|------|--------|
| 9 | 多语言支持 | 博客支持中英文切换（Hexo i18n + 主题适配） | 🟢 低 |
| 10 | 数据分析 | 集成隐私友好的访问统计（如 Plausible / Umami），替代 Google Analytics | 🟢 低 |
| 11 | 邮件订阅 | 集成 Newsletter 服务（如 Buttondown / ConvertKit） | 🟢 低 |
| 12 | 生成器迁移评估 | 评估从 Hexo 迁移到 Astro 的收益（更好的 Island Architecture、TypeScript、Vite 生态） | 🟢 低 |
| 13 | 单元测试 | 为核心函数（`stripMarkdown`, `extractTitle`, `buildFrontmatterBlock`, `injectFrontmatter`）补齐测试覆盖 | 🟢 低 |
| 14 | TypeScript 迁移 | 将 `index.js` 迁移为 TypeScript，增加类型安全 + IDE 智能提示 | 🟢 低 |

---

## 技术债务记录

| # | 债务 | 影响 | 建议修复方式 |
|---|------|------|-------------|
| 1 | `index.js` 单文件 ~620 行，职责混合（工具函数 + CLI 解析 + Hexo 集成 + 部署） | 维护困难，测试困难 | 拆分为 `lib/` 目录：`parser.js` / `injector.js` / `publisher.js` / `deployer.js` / `cli.js` |
| 2 | `parseFlag()` 函数每次从 `process.argv` 重新解析，而非接收已解析的参数 | 脆弱，不利于测试 | 使用 `commander` 或 `yargs` 做正式的 CLI 参数解析 |
| 3 | 无任何自动化测试 | 回归风险高，重构不敢动 | 至少为核心纯函数补齐单元测试 |
| 4 | Hexo `blog/` 目录中包含完整 `node_modules` | 仓库体积大，安装慢 | 已通过 `.gitignore` 排除，但需确认 |
| 5 | `runHexoCommand` 在 Windows 上使用 `cd /d`，Unix 上使用 `cd` | 跨平台兼容用字符串判断脆弱 | 使用 `execSync` 的 `cwd` 选项替代 shell `cd` |

---

## 贡献者

- **Hesiea** — 全部开发与文档

---

> **📌 本文档随每次功能迭代同步更新。** 新增功能、配置变更、架构调整后，请在本文件顶部追加新版本条目，并更新「版本时间线」表格、「优化成果总结」数据及「后续优化方向」的完成状态。
