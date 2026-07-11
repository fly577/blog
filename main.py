import os
import sys

from agent_core import read_user_prompt, run_agent, run_travel_assistant


if __name__ == "__main__":
    user_prompt = read_user_prompt()
    if not user_prompt:
        raise SystemExit("未输入问题，程序结束。")
    if "--verbose" in sys.argv:
        run_agent(user_prompt)
    else:
        run_travel_assistant(user_prompt)
