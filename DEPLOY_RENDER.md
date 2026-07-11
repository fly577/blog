# 发布到 Render

当前采用整站部署方案，目标公网网址：

```text
https://fly-dream.onrender.com
```

这个方案不再拆分 GitHub Pages 前端和独立 API 后端。Render 会直接运行 FastAPI，FastAPI 同时提供网页和问答接口：

```text
https://fly-dream.onrender.com/
https://fly-dream.onrender.com/api/health
https://fly-dream.onrender.com/api/query
```

## 为什么这样部署

本项目不是纯静态网站。它包含：

- `webapp/static/`：前端页面
- `webapp/main.py`：FastAPI 后端
- `agent_core.py`：问答逻辑
- `LLM_API_KEY`、`TAVILY_API_KEY`：服务端密钥

GitHub Pages 只能托管静态页面，不能运行 Python，也不能安全保存 API Key。Render 可以运行整个 FastAPI 应用，所以更适合“别人打开网站后能正常问答”这个目标。

## Render 配置

项目已包含：

```text
render.yaml
```

服务名：

```text
fly-dream
```

Build Command：

```bash
pip install -r requirements.txt
```

Start Command：

```bash
uvicorn webapp.main:app --host 0.0.0.0 --port $PORT
```

## 必须配置的环境变量

在 Render 的服务设置中配置：

```text
LLM_API_KEY=你的模型 API Key
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
TAVILY_API_KEY=你的 Tavily API Key
CORS_ALLOW_ORIGINS=http://127.0.0.1:8000,http://localhost:8000,https://fly-dream.onrender.com
```

不要把真实 API Key 提交到 GitHub。

## 上线检查

部署成功后先访问：

```text
https://fly-dream.onrender.com/api/health
```

正确返回：

```json
{"ok":true}
```

然后访问：

```text
https://fly-dream.onrender.com/
```

输入：

```text
给出武汉未来3天的天气
```

如果能返回答案，说明网站已经公开且问答功能可用。

## 重要限制

Render 免费服务可能会休眠。长时间无人访问后，第一次打开可能需要等待几十秒到一分钟。

当前项目使用本地 SQLite 文件保存历史和收藏。Render 免费环境的文件系统不适合作为永久数据库；如果后续要正式长期使用，应迁移到 PostgreSQL。
