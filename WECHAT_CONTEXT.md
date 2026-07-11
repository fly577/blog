# 微信 API 接入上下文恢复

本文档用于恢复此前关于“LLM 模型如何接入微信 API”的聊天上下文。

## 当前项目状态

当前项目是一个“天气与旅行智能体”原型，核心链路如下：

```text
用户输入问题
  -> FastAPI 后端 webapp/main.py
  -> agent_core.answer_query()
  -> get_weather.py 查询天气
  -> get_attraction.py 可选查询景点
  -> OpenAICompatibleClient.py 调用 OpenAI 兼容大模型接口
  -> 返回结构化 JSON
```

已经存在的后端接口：

```text
GET    /api/health
POST   /api/query
GET    /api/history
DELETE /api/history
GET    /api/favorites
POST   /api/favorites
DELETE /api/favorites/{favorite_id}
```

其中微信端最应该复用的是：

```text
POST /api/query
```

请求体：

```json
{
  "question": "给出武汉未来3天的天气"
}
```

返回体核心字段：

```json
{
  "history_id": 1,
  "answer": "最终回答",
  "city": "武汉",
  "days": 3,
  "weather": "天气摘要",
  "attraction": "",
  "include_attraction": false
}
```

## 当前验证结果

已检查：

- `.git` 目录存在但为空，当前项目不是有效 Git 仓库，无法通过 `git diff` 恢复历史改动。
- 本地 SQLite 数据库 `data/app.db` 只有一条查询历史：`给出武汉未来3天的天气`。
- `.agents` 目录为空，没有保存额外上下文。
- 环境变量检查通过。
- FastAPI 健康检查通过：`GET /api/health` 返回 `{"ok": true}`。

## 微信接入的两种路线

### 路线一：微信小程序接入

这是当前项目最适合的方向。

小程序前端只负责收集用户输入，并调用你自己的 FastAPI 后端：

```text
微信小程序
  -> HTTPS 请求你的后端 /api/query
  -> 后端调用天气 API、Tavily、大模型
  -> 后端返回回答
  -> 小程序展示结果
```

关键原则：

- 小程序端不要保存 `LLM_API_KEY`、`TAVILY_API_KEY` 等密钥。
- 所有大模型调用都放在 FastAPI 后端完成。
- 后端必须部署到公网 HTTPS 地址。
- 微信小程序后台需要配置合法 request 域名。

小程序请求示例：

```javascript
wx.request({
  url: 'https://你的域名/api/query',
  method: 'POST',
  header: {
    'content-type': 'application/json'
  },
  data: {
    question: '给出武汉未来3天的天气'
  },
  success(res) {
    console.log(res.data.answer)
  },
  fail(err) {
    console.error(err)
  }
})
```

后端当前不需要专门写“微信 SDK”。小程序只要能访问 HTTPS API，就可以复用现有 FastAPI 接口。

### 路线二：微信公众号 / 服务号消息接入

如果你说的“微信 API”是公众号自动回复，则需要新增一个微信回调入口，而不是直接让微信调用 `/api/query`。

推荐新增接口：

```text
GET  /wechat/callback
POST /wechat/callback
```

作用：

- `GET /wechat/callback`：用于微信服务器首次接入验证。
- `POST /wechat/callback`：接收用户发给公众号的文本消息，调用 `answer_query()`，再按微信要求返回 XML。

需要新增的配置：

```text
WECHAT_TOKEN=你在微信公众平台配置的Token
WECHAT_APP_ID=公众号AppID
WECHAT_APP_SECRET=公众号AppSecret
```

如果启用消息加解密，还需要：

```text
WECHAT_ENCODING_AES_KEY=微信消息加解密Key
```

公众号接入的大致流程：

```text
用户给公众号发消息
  -> 微信服务器 POST 到你的 /wechat/callback
  -> FastAPI 解析 XML
  -> 提取文本内容
  -> 调用 agent_core.answer_query()
  -> 把 answer 包装成微信 XML
  -> 返回给微信服务器
```

注意：微信公众号被动回复通常有响应时间限制。大模型响应较慢时，需要考虑：

- 降低模型响应时间
- 使用客服消息接口异步回复
- 先返回简短提示，再异步推送完整答案

## 推荐下一步

如果目标是微信小程序：

1. 保持现有 FastAPI `/api/query` 不变。
2. 部署后端到公网 HTTPS，例如云服务器、Railway、Render、Fly.io、阿里云、腾讯云等。
3. 在微信小程序后台配置合法 request 域名。
4. 写小程序页面，输入框调用 `POST /api/query`。
5. 增加简单鉴权，避免任何人刷你的后端接口。

如果目标是微信公众号：

1. 新增 `webapp/wechat.py` 或直接在 `webapp/main.py` 增加 `/wechat/callback`。
2. 实现微信签名校验。
3. 实现 XML 消息解析和 XML 被动回复。
4. 将用户文本传给 `answer_query()`。
5. 处理模型超时和异常 fallback。

## 安全注意

- `.env` 不应提交到 Git。
- `.env.example` 里也不应放真实 API key，只应放占位符。
- 当前项目中的 `.env.example` 看起来包含真实格式的密钥，建议立即替换成占位符，并在相关平台轮换密钥。
- 微信小程序或公众号前端永远不要暴露大模型 key。
- 对 `/api/query` 增加限流、鉴权、日志和异常处理后再上线。

## 当前可继续执行的任务

可以直接让我继续做下面任意一项：

```text
帮我新增微信公众号 /wechat/callback 接口
```

```text
帮我写微信小程序端调用 /api/query 的页面代码
```

```text
帮我把 .env.example 里的密钥替换成安全占位符
```

```text
帮我写 FastAPI 部署到公网 HTTPS 的步骤
```

```text
帮我给 /api/query 增加简单鉴权，供微信小程序调用
```
