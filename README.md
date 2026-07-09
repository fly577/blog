# BlogAutoPublisher

> 基于 Node.js 的自动化博客发布工具 — 写 Markdown，一键部署到 GitHub Pages。

## ✨ 功能

- **📝 智能 Front Matter 注入** — 自动从正文提取标题和摘要，生成 YAML 头部
- **📂 文章扫描管理** — 批量读取 Markdown 文件，解析元数据并展示
- **📤 一键发布到 Hexo** — 复制文章到 Hexo 博客，自动构建静态站点
- **🚀 自动部署上云** — 集成 `hexo-deployer-git`，推送至 GitHub Pages

## 📁 项目结构

```
tryClaude/
├── index.js              # 核心脚本：inject / publish / deploy
├── package.json
├── posts/                # 📝 原始文章目录（你写 .md 的地方）
│   ├── hello-world.md
│   ├── tutorial.md
│   └── no-frontmatter.md
└── blog/                 # 🏗 Hexo 静态博客
    ├── _config.yml       # Hexo 配置（含 GitHub Pages 部署）
    ├── source/_posts/    # Hexo 文章目录（由 publish 命令写入）
    ├── public/           # 生成的静态文件（由 hexo generate 产生）
    └── themes/
```

## 🔧 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Git](https://git-scm.com/)
- 一个 GitHub 仓库（已配置 GitHub Pages）

## 🚀 快速开始

```bash
# 1. 克隆项目并安装依赖
git clone https://github.com/Hesiea/blog.git
cd blog
npm install

# 2. 初始化 Hexo 博客（如未初始化）
npx hexo-cli init blog
cd blog && npm install && cd ..

# 3. 安装 Hexo Git 部署插件
cd blog && npm install hexo-deployer-git && cd ..

# 4. 编辑 blog/_config.yml，配置你的仓库地址
#    deploy:
#      type: git
#      repo: https://github.com/你的用户名/你的仓库.git
#      branch: gh-pages
```

## 📖 使用方法

### `scan` — 查看文章列表

```bash
node index.js scan ./posts
```

扫描指定目录下所有 `.md` 文件，解析 frontmatter 并以表格形式展示标题、日期、标签。

### `inject` — 自动注入 Front Matter

```bash
node index.js inject ./posts
```

扫描目录中**缺少 frontmatter** 的 Markdown 文件，自动生成并写入：

| 字段 | 提取方式 |
|------|----------|
| `title` | 第一个 `# 标题` → 文件名 |
| `date` | 当前日期 `YYYY-MM-DD` |
| `description` | 正文前 100 字（自动剥离 Markdown 语法） |

已有 frontmatter 的文件会被自动跳过，不会覆盖你的手写内容。

### `publish` — 发布到 Hexo

```bash
# 仅复制文章到 Hexo
node index.js publish ./posts --blog ./blog

# 复制 + 构建静态站点
node index.js publish ./posts --blog ./blog --build

# 完整链路：复制 → 构建 → 部署
node index.js publish ./posts --blog ./blog --build --deploy

# 预览模式（不实际修改任何文件）
node index.js publish ./posts --blog ./blog --build --deploy --dry-run
```

| 参数 | 简写 | 作用 |
|------|------|------|
| `--blog <dir>` | — | Hexo 博客路径（默认 `./blog`） |
| `--force` | `-f` | 覆盖已存在的文章 |
| `--build` | `-b` | 复制后执行 `hexo generate` |
| `--clean` | `-c` | 构建前先 `hexo clean` |
| `--deploy` | `-d` | 构建后部署到 GitHub Pages |
| `--dry-run` | — | 仅预览，不实际执行 |

### `deploy` — 独立部署

```bash
node index.js deploy --blog ./blog
```

单独执行 `hexo deploy --generate`，适用于文章未变更但想重新部署的场景。

## 🔄 完整工作流

```bash
# ① 写文章：在 posts/ 下新建 .md 文件

# ② 自动注入 frontmatter
node index.js inject ./posts

# ③ 检查文章信息
node index.js scan ./posts

# ④ 一键发布 + 构建 + 部署
node index.js publish ./posts --blog ./blog --build --deploy --force
```

```
  posts/                  blog/source/_posts/       blog/public/          GitHub Pages
┌──────────┐   inject   ┌──────────────────────┐   generate   ┌──────────┐   deploy   ┌──────────┐
│ 原始 .md  │ ────────▶ │ .md（带 frontmatter） │ ──────────▶ │ 静态 HTML │ ────────▶ │ gh-pages │
└──────────┘            └──────────────────────┘             └──────────┘           └──────────┘
```

## 📦 模块导出

```js
const {
  // 扫描
  loadMarkdownFiles,
  printSummary,
  // Front Matter 注入
  injectFrontmatter,
  batchInjectFrontmatter,
  buildFrontmatterBlock,
  // Hexo 发布
  publishToHexo,
  deployToGHPages,
  runHexoCommand,
  // 工具函数
  extractTitle,
  extractDescription,
  stripMarkdown,
  hasFrontmatter,
} = require('./index.js');
```

## ⚙️ GitHub Pages 配置

部署前，在 GitHub 仓库中启用 Pages：

1. 打开仓库 **Settings → Pages**
2. **Source** 选择 `Deploy from a branch`
3. **Branch** 选择 `gh-pages`，目录选 `/ (root)`
4. 保存，等待 GitHub Actions 完成即可访问

## 📄 License

ISC
