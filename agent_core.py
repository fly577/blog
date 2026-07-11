import os
import re
import sys
from pathlib import Path

from get_attraction import get_attraction
from get_weather import get_weather
from OpenAICompatibleClient import OpenAICompatibleClient


AGENT_SYSTEM_PROMPT = """你是一个可以使用工具完成任务的旅行助手。

你必须严格按下面格式回复，且每次只输出一个 Thought 和一个 Action：

Thought: 说明你下一步要做什么
Action: 工具调用或最终回答

可用工具：
1. get_weather(city="城市名")
   查询指定城市的实时天气。
2. get_attraction(city="城市名", weather="天气描述")
   根据城市和天气搜索并推荐合适景点。
3. Finish[最终回答]
   当已经得到足够信息时，用自然语言给用户最终答复。

示例：
Thought: 我需要先查询北京天气。
Action: get_weather(city="北京")

注意：
- 工具参数必须使用双引号。
- 不要编造工具结果，只能根据 Observation 继续推理。
- 不要一次输出多个 Action。
"""


# 将所有工具函数放入一个字典，方便主循环按模型输出调用。
available_tools = {
    "get_weather": get_weather,
    "get_attraction": get_attraction,
}


FINAL_SYSTEM_PROMPT = """你是一个中文旅行助手，回答风格简洁、直接、像豆包或 DeepSeek。

要求：
- 不要输出 Thought、Action、Observation。
- 不要解释工具调用过程。
- 先给结论，再给简短理由。
- 回答控制在 4 行以内。
- 天气炎热时必须提醒防晒、补水或避开正午。
- 如果用户只问天气，不要推荐景点。
"""


KNOWN_CITIES = (
    "北京", "上海", "广州", "深圳", "杭州", "南京", "苏州", "成都", "重庆", "武汉",
    "西安", "天津", "青岛", "厦门", "长沙", "郑州", "济南", "宁波", "无锡", "合肥",
    "福州", "昆明", "大理", "丽江", "桂林", "三亚", "海口", "哈尔滨", "沈阳", "长春",
    "大连", "太原", "石家庄", "南昌", "南宁", "贵阳", "兰州", "西宁", "银川", "乌鲁木齐",
)


def load_dotenv(path: str | None = None) -> None:
    """Load KEY=VALUE lines from a local .env file if it exists."""
    env_path = Path(path) if path else Path(__file__).with_name(".env")
    if not env_path.exists():
        return

    with env_path.open("r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip().lstrip("\ufeff")
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def get_required_config(name: str, aliases: tuple[str, ...] = ()) -> str:
    """Read a required value from environment variables."""
    for key in (name, *aliases):
        value = os.environ.get(key)
        if value:
            return value
    all_names = ", ".join((name, *aliases))
    raise SystemExit(f"缺少环境变量: {all_names}")


def print_progress(step: int, total: int, message: str) -> None:
    width = 20
    filled = int(width * step / total)
    bar = "#" * filled + "-" * (width - filled)
    percent = int(100 * step / total)
    print(f"[{bar}] {percent:>3}% {message}", flush=True)


def parse_days(user_prompt: str) -> int:
    digit_match = re.search(r"(?:未来|接下来|近|后面)?\s*([1-3])\s*天", user_prompt)
    if digit_match:
        return int(digit_match.group(1))

    chinese_days = {
        "一天": 1,
        "两天": 2,
        "二天": 2,
        "三天": 3,
    }
    for text, days in chinese_days.items():
        if text in user_prompt:
            return days

    return 1


def wants_attraction(user_prompt: str) -> bool:
    keywords = ("景点", "旅游", "旅行", "游玩", "去哪", "哪里玩", "推荐", "路线", "攻略")
    return any(keyword in user_prompt for keyword in keywords)


def extract_city(user_prompt: str) -> str:
    for city in KNOWN_CITIES:
        if city in user_prompt:
            return city

    prompt = re.sub(
        r"(请|帮我|我想|想|查一下|查询|给出|告诉我|看一下|一下|今天|今日|明天|未来|接下来|近|后面|天气|预报|适合|景点|旅游|旅行|推荐|的|[0-9一二两三]天)",
        "",
        user_prompt,
    )
    prompt = re.sub(r"[，。,.\s？?！!].*$", "", prompt).strip()
    if 1 < len(prompt) <= 8:
        return prompt

    patterns = (
        r"(?:查询|给出|告诉我|看一下)(.+?)(?:今天|今日|明天|未来|天气)",
        r"(.+?)(?:今天|今日|明天|未来)?的天气",
        r"(.+?)天气",
    )
    for pattern in patterns:
        match = re.search(pattern, user_prompt)
        if match:
            city = re.sub(r"^(请|帮我|我想|想|查一下|查询|给出|告诉我|看一下)", "", match.group(1)).strip()
            city = re.sub(r"[，。,.\s].*$", "", city).strip()
            if city:
                return city

    return ""


def create_llm_client() -> OpenAICompatibleClient:
    load_dotenv()

    api_key = get_required_config(
        "LLM_API_KEY",
        aliases=("OPENAI_API_KEY", "ANTHROPIC_AUTH_TOKEN"),
    )
    base_url = get_required_config(
        "LLM_BASE_URL",
        aliases=("OPENAI_BASE_URL", "ANTHROPIC_BASE_URL"),
    )
    model_id = get_required_config("LLM_MODEL", aliases=("MODEL_ID",))

    return OpenAICompatibleClient(
        model=model_id,
        api_key=api_key,
        base_url=base_url,
    )


def run_travel_assistant(user_prompt: str) -> None:
    print(f"问题: {user_prompt}")
    result = answer_query(user_prompt, progress_cb=print_progress)
    print("\n回答:")
    print(result["answer"])


def answer_query(user_prompt: str, progress_cb=None) -> dict[str, str | bool | int]:
    include_attraction = wants_attraction(user_prompt)
    total_steps = 4 if include_attraction else 3

    if progress_cb:
        progress_cb(1, total_steps, "读取配置")
    llm = create_llm_client()

    if progress_cb:
        progress_cb(2, total_steps, "识别城市并查询天气")
    city = extract_city(user_prompt)
    if not city:
        raise ValueError("未识别到城市，请在问题里写明城市，例如：给出武汉未来3天的天气。")
    days = parse_days(user_prompt)
    weather = get_weather(city, days=days)

    attraction = ""
    if include_attraction:
        if progress_cb:
            progress_cb(3, total_steps, "搜索适合景点")
        attraction = get_attraction(city=city, weather=weather)

    if progress_cb:
        progress_cb(total_steps, total_steps, "整理答案")
    final_prompt = f"""用户问题：{user_prompt}
城市：{city}
查询天数：{days}
天气结果：{weather}
景点搜索结果：{attraction or "用户未要求推荐景点，本次不需要景点建议。"}

请给用户一个简洁中文答复。"""
    answer = llm.generate(final_prompt, system_prompt=FINAL_SYSTEM_PROMPT, verbose=False)

    if answer.startswith("错误:调用语言模型服务时出错"):
        fallback = f"{city}天气信息：{weather}"
        if attraction:
            fallback += f"\n景点建议：{attraction}"
        fallback += f"\n备注：模型整理答案失败，原始错误为：{answer}"
        answer = fallback

    return {
        "answer": answer.strip(),
        "city": city,
        "days": days,
        "weather": weather,
        "attraction": attraction,
        "include_attraction": include_attraction,
    }


def parse_action(action_str: str) -> tuple[str, dict[str, str] | str]:
    """Parse `tool(arg="value")` or `Finish[...]` from the model output."""
    if action_str.startswith("Finish"):
        finish_match = re.fullmatch(r"Finish\[(.*)\]", action_str, re.DOTALL)
        if not finish_match:
            raise ValueError("Finish 格式错误，应为 Finish[最终回答]")
        return "Finish", finish_match.group(1).strip()

    tool_match = re.fullmatch(r"(\w+)\((.*)\)", action_str, re.DOTALL)
    if not tool_match:
        raise ValueError("Action 格式错误，应为 tool_name(arg=\"value\") 或 Finish[...]")

    tool_name = tool_match.group(1)
    args_str = tool_match.group(2)
    kwargs = dict(re.findall(r'(\w+)="([^"]*)"', args_str))
    return tool_name, kwargs


def run_agent(user_prompt: str, max_rounds: int = 5) -> None:
    llm = create_llm_client()

    prompt_history = [f"用户请求: {user_prompt}"]
    print(f"用户输入: {user_prompt}\n" + "=" * 40)

    for i in range(max_rounds):
        print(f"--- 循环 {i + 1} ---\n")
        full_prompt = "\n".join(prompt_history)

        llm_output = llm.generate(full_prompt, system_prompt=AGENT_SYSTEM_PROMPT)
        if llm_output.startswith("错误:调用语言模型服务时出错"):
            print(f"模型输出:\n{llm_output}\n")
            print("模型调用失败，已停止。请先修正 API 配置后再运行。")
            return

        match = re.search(
            r"(Thought:.*?Action:.*?)(?=\n\s*(?:Thought:|Action:|Observation:)|\Z)",
            llm_output,
            re.DOTALL,
        )
        if match:
            truncated = match.group(1).strip()
            if truncated != llm_output.strip():
                llm_output = truncated
                print("已截断多余的 Thought-Action 对")

        print(f"模型输出:\n{llm_output}\n")
        prompt_history.append(llm_output)

        action_match = re.search(r"Action:\s*(.*)", llm_output, re.DOTALL)
        if not action_match:
            observation = "错误: 未能解析到 Action 字段。请严格遵循 'Thought: ... Action: ...' 格式。"
            observation_str = f"Observation: {observation}"
            print(f"{observation_str}\n" + "=" * 40)
            prompt_history.append(observation_str)
            continue

        action_str = action_match.group(1).strip()
        try:
            tool_name, tool_payload = parse_action(action_str)
        except ValueError as exc:
            observation_str = f"Observation: 错误:{exc}"
            print(f"{observation_str}\n" + "=" * 40)
            prompt_history.append(observation_str)
            continue

        if tool_name == "Finish":
            print(f"任务完成，最终答案: {tool_payload}")
            return

        if tool_name not in available_tools:
            observation = f"错误: 未定义的工具 '{tool_name}'"
        else:
            try:
                observation = available_tools[tool_name](**tool_payload)
            except TypeError as exc:
                observation = f"错误: 工具参数不正确 - {exc}"

        observation_str = f"Observation: {observation}"
        print(f"{observation_str}\n" + "=" * 40)
        prompt_history.append(observation_str)

    print("达到最大循环次数，任务未完成。")


def read_user_prompt() -> str:
    prompt_parts = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    if prompt_parts:
        return " ".join(prompt_parts).strip()

    env_prompt = os.environ.get("USER_PROMPT", "").strip()
    if env_prompt:
        return env_prompt

    try:
        return input("请输入你的问题: ").strip()
    except EOFError:
        return ""
