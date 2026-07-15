import os
import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from agent_core import answer_query
from webapp.storage import (
    add_favorite,
    add_history,
    clear_history,
    delete_favorite,
    init_db,
    list_favorites,
    list_history,
)

STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="天气与旅行智能体",
    description="网页和未来微信小程序共用的天气旅行助手 API。",
    version="0.2.0",
)
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://127.0.0.1:8000,http://localhost:8000",
    ).split(",")
    if origin.strip()
]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=os.getenv(
            "CORS_ALLOW_ORIGIN_REGEX",
            r"https://.*\.github\.io|https://.*\.pythonanywhere\.com",
        ),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def startup() -> None:
    init_db()


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)


class QueryResponse(BaseModel):
    history_id: int | None = None
    answer: str
    city: str
    days: int
    weather: str
    attraction: str
    include_attraction: bool
    task_type: str = "天气"


class FavoriteRequest(BaseModel):
    history_id: int | None = None
    question: str = Field(..., min_length=1, max_length=500)
    answer: str = Field(..., min_length=1)
    city: str = ""
    days: int = 1
    weather: str = ""
    attraction: str = ""
    include_attraction: bool = False
    task_type: str = "天气"
    note: str = ""


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/query", response_model=QueryResponse)
async def query(payload: QueryRequest) -> dict[str, Any]:
    try:
        question = payload.question.strip()
        result = await run_in_threadpool(answer_query, question)
        history_id = await run_in_threadpool(add_history, question, result)
        result["history_id"] = history_id
        return result
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/history")
def history(limit: int = 20) -> list[dict[str, Any]]:
    init_db()
    return list_history(max(1, min(limit, 100)))


@app.delete("/api/history")
def delete_history() -> dict[str, bool]:
    init_db()
    clear_history()
    return {"ok": True}


@app.get("/api/favorites")
def favorites(limit: int = 50) -> list[dict[str, Any]]:
    init_db()
    return list_favorites(max(1, min(limit, 100)))


@app.post("/api/favorites")
def create_favorite(payload: FavoriteRequest) -> dict[str, int | bool]:
    init_db()
    favorite_id = add_favorite(payload.model_dump())
    return {"ok": True, "id": favorite_id}


@app.delete("/api/favorites/{favorite_id}")
def remove_favorite(favorite_id: int) -> dict[str, bool]:
    init_db()
    deleted = delete_favorite(favorite_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="收藏不存在")
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "webapp.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )
