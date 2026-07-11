import os
import sys
import webbrowser
from threading import Timer

import uvicorn


def parse_port() -> int:
    for index, arg in enumerate(sys.argv):
        if arg == "--port" and index + 1 < len(sys.argv):
            return int(sys.argv[index + 1])
        if arg.startswith("--port="):
            return int(arg.split("=", 1)[1])
    return int(os.getenv("PORT", "8000"))


def open_browser(port: int) -> None:
    if "--no-browser" not in sys.argv:
        webbrowser.open(f"http://127.0.0.1:{port}")


def main() -> None:
    port = parse_port()
    Timer(0.8, open_browser, args=(port,)).start()
    uvicorn.run(
        "webapp.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=port,
        reload="--reload" in sys.argv,
    )


if __name__ == "__main__":
    main()
