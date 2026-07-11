# 发布到 `https://hesiea.github.io/blog/`

这个项目要完整可用，需要同时发布两部分：

- 前端页面：GitHub Pages，最终给别人打开的地址是 `https://hesiea.github.io/blog/`
- 问答后端：FastAPI，需要部署到能运行 Python 的公网平台，例如 Render

浏览器访问流程是：

```text
用户浏览器
  -> https://hesiea.github.io/blog/
  -> https://hesiea-blog-api.onrender.com/api/query
```

GitHub Pages 不能运行 Python，也不能保存后端 API key，所以问答功能必须走独立公网后端。

## 1. 创建 GitHub 仓库

在 GitHub 账号 `hesiea` 下创建仓库：

```text
blog
```

把本地项目推到这个仓库的 `main` 分支。

## 2. 开启 GitHub Pages

进入 GitHub 仓库：

```text
https://github.com/hesiea/blog
```

然后设置：

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

本项目已经包含工作流：

```text
.github/workflows/pages.yml
```

推送到 `main` 后，GitHub Actions 会自动发布前端。发布成功后，别人可以打开：

```text
https://hesiea.github.io/blog/
```

## 3. 发布问答后端

项目已包含 Render 配置：

```text
render.yaml
```

在 Render 创建 Blueprint 或 Web Service，连接 `hesiea/blog` 仓库。服务名使用：

```text
hesiea-blog-api
```

后端公网地址预计为：

```text
https://hesiea-blog-api.onrender.com
```

Render 环境变量必须配置：

```text
LLM_API_KEY=你的模型 API Key
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
TAVILY_API_KEY=你的 Tavily API Key
CORS_ALLOW_ORIGINS=https://hesiea.github.io,https://hesiea.github.io/blog
```

后端启动命令已写入 `render.yaml`：

```bash
uvicorn webapp.main:app --host 0.0.0.0 --port $PORT
```

## 4. 前端 API 地址

前端配置文件是：

```text
webapp/static/config.js
```

当前已经设置为：

```js
window.WEATHER_AGENT_API_BASE_URL = "https://hesiea-blog-api.onrender.com";
```

如果 Render 实际生成了不同域名，需要把这里改成实际后端域名后重新推送。
