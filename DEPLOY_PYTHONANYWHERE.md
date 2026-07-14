# Deploy PythonAnywhere Backend

Current public frontend:

```text
https://fly577.github.io/blog/
```

PythonAnywhere backend target, assuming the PythonAnywhere username is `fly577`:

```text
https://fly577.pythonanywhere.com
```

The GitHub Pages frontend will call:

```text
https://fly577.pythonanywhere.com/api/query
```

If your PythonAnywhere username is not `fly577`, replace `fly577` everywhere with your actual PythonAnywhere username, then update `webapp/static/config.js` and republish GitHub Pages.

## Important

GitHub Pages cannot run Python or store API keys. PythonAnywhere runs the FastAPI backend and keeps these server-side environment variables:

```text
LLM_API_KEY
LLM_BASE_URL
LLM_MODEL
TAVILY_API_KEY
CORS_ALLOW_ORIGINS
```

PythonAnywhere free accounts may restrict outbound Internet access. This project calls:

```text
token.sensenova.cn
api.tavily.com
wttr.in
```

If `/api/query` fails because outbound access is blocked, use a paid PythonAnywhere account or request allowlist support from PythonAnywhere.

## 1. Push Code to GitHub

From local PowerShell:

```powershell
cd "C:\Users\qiany\Desktop\新建文件夹\LLM"
git push -u origin main
```

## 2. Open PythonAnywhere Bash

In PythonAnywhere:

```text
Consoles -> Bash
```

## 3. Clone or Update the Repository

First install from GitHub:

```bash
cd ~
git clone https://github.com/fly577/blog.git LLM
cd ~/LLM
```

If `~/LLM` already exists:

```bash
cd ~/LLM
git pull origin main
```

## 4. Create Virtualenv

Use Python 3.10 or newer:

```bash
mkvirtualenv llm-web --python=python3.10
cd ~/LLM
pip install -r requirements.txt
pip install --upgrade pythonanywhere
```

If `mkvirtualenv` is unavailable:

```bash
python3.10 -m venv ~/.virtualenvs/llm-web
source ~/.virtualenvs/llm-web/bin/activate
cd ~/LLM
pip install -r requirements.txt
pip install --upgrade pythonanywhere
```

## 5. Create `.env`

In PythonAnywhere Bash:

```bash
cd ~/LLM
nano .env
```

Paste real values:

```text
LLM_API_KEY=your_llm_api_key
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
TAVILY_API_KEY=your_tavily_api_key
CORS_ALLOW_ORIGINS=https://fly577.github.io,https://fly577.github.io/blog,https://fly577.pythonanywhere.com
```

Save with `Ctrl+O`, Enter, then `Ctrl+X`.

Never commit `.env` to GitHub.

## 6. Create ASGI Website

In PythonAnywhere, create an API token:

```text
Account -> API Token -> Create a new API token
```

Then run:

```bash
pa website create --domain fly577.pythonanywhere.com --command '/home/fly577/.virtualenvs/llm-web/bin/uvicorn --app-dir /home/fly577/LLM --uds ${DOMAIN_SOCKET} webapp.main:app'
```

If your username is different, replace `fly577` in both the domain and paths.

## 7. Reload

```bash
pa website reload --domain fly577.pythonanywhere.com
```

## 8. Test

Backend health:

```text
https://fly577.pythonanywhere.com/api/health
```

Expected:

```json
{"ok":true}
```

Frontend:

```text
https://fly577.github.io/blog/
```

Ask:

```text
给出武汉未来3天的天气
```

## Logs

If the backend fails:

```bash
tail -100 /var/log/fly577.pythonanywhere.com.error.log
tail -100 /var/log/fly577.pythonanywhere.com.server.log
tail -100 /var/log/fly577.pythonanywhere.com.access.log
```
