# 通用 AI 与天气旅行智能体

这是一个网页智能体原型：用户输入自然语言，系统会先判断是普通 AI 问答，还是天气/旅行任务。普通问题直接交给大模型回答；天气和旅行问题会识别城市、天数和旅行意图，调用天气/搜索工具，再在网页中展示结果。

## 当前架构

```text
网页前端 webapp/static
        ↓
FastAPI 后端 webapp/main.py
        ↓
智能体调度 main.py
        ↓
通用问答 OpenAICompatibleClient.py
天气工具 get_weather.py
景点搜索 get_attraction.py
大模型 OpenAICompatibleClient.py
```

这套 FastAPI 后端后续可以直接给微信小程序调用。小程序不应该保存任何 API key，只调用你自己的后端接口。

## 环境

项目使用本地虚拟环境：

```text
.venv
```

安装依赖：

```powershell
cd "C:\Users\qiany\Desktop\新建文件夹\LLM"
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 配置

项目目录需要有 `.env` 文件：

```text
LLM_API_KEY=你的模型API_KEY
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
TAVILY_API_KEY=你的Tavily_API_KEY
```

检查配置：

```powershell
.\.venv\Scripts\python.exe check_env.py
```

## 启动网页

推荐：

```powershell
.\start_web.ps1
```

或者：

```powershell
.\.venv\Scripts\python.exe app.py
```

打开：

```text
http://127.0.0.1:8000
```

停止服务：在终端按 `Ctrl + C`。

也可以直接运行 FastAPI 入口：

```powershell
.\.venv\Scripts\python.exe webapp\main.py
```

注意：智能体核心逻辑已拆到 `agent_core.py`。`webapp/main.py` 是网页 API 入口，根目录 `main.py` 是命令行入口，避免两个文件都叫 `main` 时发生循环导入。

## API

健康检查：

```text
GET /api/health
```

自然语言查询：

```text
POST /api/query
Content-Type: application/json

{
  "question": "给出武汉未来3天的天气"
}
```

也可以直接问普通问题：

```json
{
  "question": "解释一下什么是大语言模型"
}
```

返回结构：

```json
{
  "answer": "最终回答",
  "city": "武汉",
  "days": 3,
  "weather": "天气原始摘要",
  "attraction": "",
  "include_attraction": false,
  "task_type": "天气"
}
```

普通 AI 问答会返回 `task_type: "普通AI"`，并且 `city`、`weather` 等工具字段为空。

查询历史：

```text
GET /api/history
DELETE /api/history
```

收藏：

```text
GET /api/favorites
POST /api/favorites
DELETE /api/favorites/{favorite_id}
```

这些接口使用 SQLite，数据库文件在：

```text
data/app.db
```

`data/` 已加入 `.gitignore`，不会提交你的本地查询数据。

## 命令行模式

仍然保留：

```powershell
.\.venv\Scripts\python.exe main.py "给出武汉未来3天的天气"
```

调试完整 Thought / Action / Observation：

```powershell
.\.venv\Scripts\python.exe main.py --verbose "请查询上海今天的天气，并推荐一个适合的景点"
```

## 下一步方向

- 换成 PythonAnywhere 可以访问的大模型 API，恢复公网普通 AI 的完整回答能力。
- 如果要接入 MiniMind，可先把 MiniMind 作为 OpenAI-compatible API 服务部署出来，再把 `LLM_BASE_URL` 指向该服务。
- 替换更稳定的天气 API，例如和风天气或高德天气。
- 增加地图 API，支持景点距离、路线规划、附近餐饮。
- 增加用户偏好：预算、人数、老人儿童、室内外偏好。
- 做微信小程序前端，复用当前 FastAPI `/api/query` 接口。
