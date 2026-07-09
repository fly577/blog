# BlogAutoPublisher

> 基于 Node.js 的自动化博客发布工具 — 写 Markdown，一行命令部署到 GitHub Pages。
>
> 🌐 在线预览：https://hesiea.github.io/blog/

---

## ✨ 功能

### 核心工具链

| 功能 | 说明 |
|------|------|
| 📝 **智能 Front Matter 注入** | 正则提取标题 + 前 100 字摘要，自动生成 YAML 头部 |
| 📂 **文章扫描管理** | 批量读取 `.md` 文件，解析并展示元数据 |
| 📤 **一键发布** | 复制文章到 Hexo → 构建静态站点 → 部署到 GitHub Pages |
| 🔄 **GitHub Actions CI/CD** | Push 到 `main` 自动构建部署，零手动操作 |

### Bento 主题特性

| 特性 | 说明 |
|------|------|
| 🎨 **Bento Grid 布局** | 5 张不规则错落卡片（About / Featured / Recent / Tags+Categories / Social） |
| 🎯 **莫兰迪设计系统** | 暖白背景 `#FBFBF9`，莫兰迪青强调色，极柔阴影，20px 圆角 |
| 🌓 **毛玻璃导航** | 粘性顶栏 + `backdrop-filter` 模糊效果 |
| ✨ **微动效** | 卡片入场动画、悬停上移、标签胶囊 hover 变色 |
| 📱 **完整响应式** | 桌面 3 列 → 平板 2 列 → 手机单列 |
| 💬 **Giscus 评论** | 基于 GitHub Discussions，无需第三方服务 |
| 🏷️ **分类 + 标签** | 双维度内容组织，视觉上实心 / 镂空区分 |
| 🔍 **归档 + 标签/分类页** | 按年分组归档，标签云 + 分类筛选 |

---

## 📁 项目结构

```
tryClaude/
├── index.js                      # 核心脚本
├── package.json                  # npm scripts + 依赖
├── .github/workflows/deploy.yml  # GitHub Actions 自动部署
├── posts/                        # 📝 你写文章的地方
│   └── *.md
└── blog/                         # 🏗 Hexo 静态博客
    ├── _config.yml               # Hexo 站点配置
    ├── source/
    │   ├── _posts/               # Hexo 文章（由 publish 写入）
    │   ├── tags/index.md         # 标签着陆页
    │   └── categories/index.md   # 分类着陆页
    └── themes/bento/             # Bento Grid 自定义主题
        ├── _config.yml           # 主题配置（菜单/社交/Giscus）
        ├── layout/               # EJS 模板
        └── source/               # CSS + JS
```

---

## 🔧 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Git](https://git-scm.com/)
- 一个 GitHub 仓库

---

## 🚀 快速开始

```bash
# 1. 克隆并安装依赖
git clone https://github.com/Hesiea/blog.git
cd blog
npm install
cd blog && npm install && cd ..

# 2. 启动本地预览
npm run dev
# → http://localhost:4000/blog/

# 3. 写文章后发布
npm run release
```

---

## 📖 使用指南

### 一、写文章

在 `posts/` 目录下创建 `.md` 文件，使用标准 Hexo frontmatter：

```yaml
---
title: 我的新文章
date: 2026-07-10
categories:
  - 技术
tags:
  - JavaScript
  - 教程
description: 这是一篇关于某个主题的文章
---
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | ✅ | 文章标题 |
| `date` | ✅ | 发布日期 `YYYY-MM-DD` |
| `categories` | 可选 | 分类列表（用于 `/categories/` 页面） |
| `tags` | 可选 | 标签列表（用于 `/tags/` 页面） |
| `description` | 可选 | 摘要（不写则自动提取正文前 100 字） |

> **💡 提示**：如果忘记写 frontmatter，运行 `npm run inject` 会自动补全标题、日期和摘要。

### 二、npm scripts 速查

| 命令 | 作用 |
|------|------|
| `npm run scan` | 查看文章列表（标题/日期/标签/摘要） |
| `npm run inject` | 为缺少 frontmatter 的文章自动生成 YAML 头部 |
| `npm run publish` | 复制文章到 Hexo + 构建静态站点 |
| `npm run deploy` | 单独部署到 GitHub Pages |
| `npm run release` | **⚡ 一键三连**：publish + build + deploy |
| `npm run dev` | 启动本地预览服务器 |
| `npm run clean` | 清理 Hexo 缓存和构建文件 |

### 三、日常工作流

```bash
# ① 在 posts/ 下写新文章 xxx.md

# ② 注入 frontmatter（如果还没写）
npm run inject

# ③ 预览
npm run scan      # 检查文章信息
npm run dev       # 浏览器打开 http://localhost:4000/blog/

# ④ 发布上线
npm run release
```

### 四、CLI 命令详解

如果你需要更细粒度的控制，以下是对应 `node index.js` 的完整参数：

#### `scan` — 查看文章

```bash
node index.js scan [dir]       # 默认 ./posts
```

#### `inject` — 注入 Front Matter

```bash
node index.js inject [dir]     # 默认 ./posts
```

已有 frontmatter 的文件会被自动跳过，不会覆盖手写内容。

#### `publish` — 发布到 Hexo

```bash
node index.js publish [sourceDir] [options]
```

| 参数 | 简写 | 作用 |
|------|------|------|
| `--blog <dir>` | — | Hexo 博客路径（默认 `./blog`） |
| `--force` | `-f` | 覆盖已存在的文章 |
| `--build` | `-b` | 复制后执行 `hexo generate` |
| `--clean` | `-c` | 构建前先 `hexo clean` |
| `--deploy` | `-d` | 构建后部署到 GitHub Pages |
| `--dry-run` | — | 预览模式，不实际修改文件 |

#### `deploy` — 独立部署

```bash
node index.js deploy --blog ./blog
```

---

## 🎨 Bento 主题配置

主题配置文件：`blog/themes/bento/_config.yml`

```yaml
# 导航菜单
menu:
  Home: /
  Archives: /archives
  Categories: /categories
  Tags: /tags

# 社交链接（显示在首页卡片 E）
social:
  GitHub: https://github.com/你的用户名

# 个人简介（显示在首页卡片 A）
avatar:          # 头像图片路径，留空则显示首字母
bio: 热爱代码与设计，探索前端世界的无限可能。

# Giscus 评论
giscus:
  enable: true
  repo: 用户名/仓库名
  repo_id: 'R_kgDOxxxxxx'
  category: Ideas
  category_id: 'DIC_kwDOxxxx'
  mapping: pathname
  theme: preferred_color_scheme
  lang: zh-CN
```

---

## 💬 Giscus 评论配置

1. 打开 https://github.com/apps/giscus ，安装到你的仓库
2. 仓库 Settings → Features → 勾选 **Discussions**
3. 打开 https://giscus.app ，填入你的仓库信息
4. 复制生成的 `repo_id` 和 `category_id`
5. 粘贴到 `blog/themes/bento/_config.yml` 的 `giscus` 配置中
6. 将 `enable` 改为 `true`
7. `npm run release` 部署

---

## 🔄 GitHub Actions 自动部署

`.github/workflows/deploy.yml` 已配置就绪。

**工作流**：`git push origin main` → Actions 触发 → 安装依赖 → 发布文章 → 生成静态站 → 推送到 `gh-pages` → 博客更新

也可以手动触发：GitHub 仓库 → Actions → Deploy to GitHub Pages → **Run workflow**

> 状态查看：https://github.com/Hesiea/blog/actions

---

## 📦 模块导出

```js
const {
  loadMarkdownFiles,        // 扫描目录，解析 frontmatter
  printSummary,             // 终端表格输出
  injectFrontmatter,        // 单文件注入 frontmatter
  batchInjectFrontmatter,   // 批量注入
  buildFrontmatterBlock,    // 生成 YAML 块
  publishToHexo,            // 发布到 Hexo（复制 + 构建 + 部署）
  deployToGHPages,          // 部署到 GitHub Pages
  runHexoCommand,           // 执行 Hexo CLI 命令
  extractTitle,             // 正则提取标题
  extractDescription,       // 提取纯文本摘要
  stripMarkdown,            // Markdown → 纯文本
  hasFrontmatter,           // 判断是否已有 frontmatter
} = require('./index.js');
```

---

## 🔧 常见问题

**Q: 本地预览正常，线上没变化？**
A: 强制刷新 `Ctrl+Shift+R`，GitHub Pages CDN 有 1-2 分钟缓存。

**Q: Giscus 评论发出去看不到？**
A: 首次使用需在评论区点击 "Sign in with GitHub" 授权；确认仓库已启用 Discussions。

**Q: GitHub Actions 部署失败？**
A: 检查 Actions 日志，确保仓库 Settings → Actions → General → Workflow permissions 设为 "Read and write permissions"。

**Q: 怎么换主题颜色？**
A: 编辑 `blog/themes/bento/source/css/variables.css`，修改 CSS 自定义属性后 `npm run release`。

---

## 📋 项目演进日志

完整的版本历史、优化成果总结、已知问题与后续优化方向，请查看 **[CHANGELOG.md](./CHANGELOG.md)**。

---

## 📄 License

ISC

---

> **📌 本文档随功能更新同步维护。** 如有新增功能、配置变更或工作流调整，请同步更新本 README 对应章节和 [CHANGELOG.md](./CHANGELOG.md)。最后更新：2026-07-09
