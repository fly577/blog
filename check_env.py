import os

from agent_core import load_dotenv


load_dotenv()

groups = {
    "模型 API key": ("LLM_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_AUTH_TOKEN"),
    "模型 Base URL": ("LLM_BASE_URL", "OPENAI_BASE_URL", "ANTHROPIC_BASE_URL"),
    "模型 ID": ("LLM_MODEL", "MODEL_ID"),
    "Tavily API key": ("TAVILY_API_KEY",),
}

ok = True
for label, names in groups.items():
    found_name = next((name for name in names if os.environ.get(name)), None)
    if found_name:
        value = os.environ[found_name]
        print(f"{label}: 已设置 ({found_name}, 长度 {len(value)})")
    else:
        ok = False
        print(f"{label}: 缺失，需要设置其中之一: {', '.join(names)}")

if not ok:
    raise SystemExit(1)

print("环境变量检查通过")
