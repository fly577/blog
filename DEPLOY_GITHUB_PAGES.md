# 发布到 GitHub Pages

目标前端网址：

```text
https://fly577.github.io/blog/
```

当前项目已配置 GitHub Actions：

```text
.github/workflows/pages.yml
```

它会把 `webapp/static` 发布到 GitHub Pages。

## 必须先推送代码

Render、GitHub Pages 都不能读取你电脑本地文件，必须先把代码推到 GitHub：

```powershell
cd "C:\Users\qiany\Desktop\新建文件夹\LLM"
git push -u origin main
```

当前远程仓库应为：

```text
https://github.com/fly577/blog.git
```

## 开启 Pages

进入：

```text
https://github.com/fly577/blog
```

打开：

```text
Settings -> Pages
```

设置：

```text
Build and deployment -> Source -> GitHub Actions
```

等 Actions 里的 `Deploy static frontend to GitHub Pages` 成功后，访问：

```text
https://fly577.github.io/blog/
```

## 关于问答功能

GitHub Pages 只能托管静态 HTML/CSS/JS，不能运行 Python/FastAPI，也不能安全保存 `LLM_API_KEY` 和 `TAVILY_API_KEY`。

所以 `https://fly577.github.io/blog/` 可以作为公开前端网址，但问答功能还需要一个公网后端提供：

```text
POST /api/query
GET /api/history
GET /api/favorites
```

前端配置文件是：

```text
webapp/static/config.js
```

默认值为空：

```js
window.WEATHER_AGENT_API_BASE_URL = "";
```

这表示在本地运行时走同域 `/api`。但在 GitHub Pages 上，必须改成公网后端地址，例如 Cloudflare Tunnel、Railway、VPS 或其他 Python 托管服务生成的 HTTPS 地址。

不要把 API Key 写进前端 JS。
