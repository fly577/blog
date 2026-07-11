# 发布为公开网站

当前按本地 Git 远程仓库配置，目标站点是：

```text
https://fly577.github.io/blog/
```

完整问答功能需要两部分同时上线：

- 前端：GitHub Pages，负责展示网页。
- 后端：FastAPI 公网服务，负责天气、搜索和大模型问答。

访问链路：

```text
用户浏览器
  -> https://fly577.github.io/blog/
  -> https://fly577-blog-api.onrender.com/api/query
```

GitHub Pages 只能托管静态 HTML/CSS/JS，不能运行 Python，也不能保存 API Key。因此问答后端必须部署到 Render、Railway、Fly.io、VPS 等能运行 Python 的平台。

## 1. 前端发布到 GitHub Pages

本地远程仓库当前应为：

```text
https://github.com/fly577/blog.git
```

推送代码：

```powershell
git push -u origin main
```

进入 GitHub 仓库：

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

项目已经包含 GitHub Actions 工作流：

```text
.github/workflows/pages.yml
```

工作流成功后，访问：

```text
https://fly577.github.io/blog/
```

正确页面应显示天气旅行智能体，而不是 GitHub Pages 的 404 页面。

## 2. 后端部署到 Render

项目已经包含 Render 配置：

```text
render.yaml
```

在 Render 新建 Blueprint 或 Web Service，连接仓库：

```text
fly577/blog
```

服务名使用：

```text
fly577-blog-api
```

后端公网地址预计为：

```text
https://fly577-blog-api.onrender.com
```

必须在 Render 配置环境变量：

```text
LLM_API_KEY=你的模型 API Key
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
TAVILY_API_KEY=你的 Tavily API Key
CORS_ALLOW_ORIGINS=https://fly577.github.io,https://fly577.github.io/blog
```

后端启动命令已经写在 `render.yaml`：

```bash
uvicorn webapp.main:app --host 0.0.0.0 --port $PORT
```

## 3. 前端 API 地址

前端配置文件：

```text
webapp/static/config.js
```

当前配置：

```js
window.WEATHER_AGENT_API_BASE_URL = "https://fly577-blog-api.onrender.com";
```

如果 Render 实际生成了不同域名，修改这里后重新提交并推送。

## 4. 上线检查

检查前端：

```text
https://fly577.github.io/blog/
https://fly577.github.io/blog/static/app.js
https://fly577.github.io/blog/static/config.js
```

检查后端：

```text
https://fly577-blog-api.onrender.com/api/health
```

正确后端返回：

```json
{"ok":true}
```

最后在网页中输入：

```text
给出武汉未来3天的天气
```

如果能返回答案，说明前端、后端、CORS、API Key 全部连通。
