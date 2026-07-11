$ErrorActionPreference = "Stop"

$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "未找到虚拟环境，请先运行：python -m venv .venv"
    exit 1
}

Write-Host "正在启动天气与旅行智能体网页..."
Write-Host "地址：http://127.0.0.1:8000"
Write-Host "按 Ctrl + C 停止服务。"
& $python -m uvicorn webapp.main:app --host 127.0.0.1 --port 8000 --reload
