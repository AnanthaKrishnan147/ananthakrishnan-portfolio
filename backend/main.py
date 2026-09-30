import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from openrouter import OpenRouter
from pydantic import BaseModel, Field, model_validator

from backend.rag.ingestion import chunk_document, read_document
from backend.rag.prompts import GENERAL_SYSTEM_PROMPT, RESUME_SYSTEM_PROMPT, is_profile_question
from backend.rag.retrieval import top_matches
from backend.services.llm import complete


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
STATIC_DIR = BASE_DIR / "static"
DEFAULT_PROFILE = BASE_DIR / "data" / "cv2.pdf"
RESUME_PATH = Path(os.getenv("RESUME_PATH", str(DEFAULT_PROFILE))).expanduser()
CHAT_MODEL = os.getenv("OPENROUTER_CHAT_MODEL", "openai/gpt-4o-mini")
EMBEDDING_MODEL = os.getenv("OPENROUTER_EMBEDDING_MODEL", "openai/text-embedding-3-small")
PROFILE_IMAGE = BASE_DIR / "data" / "my_image.jpeg"
client: OpenRouter | None = None
profile_chunks: list[dict] = []
index_error: str | None = None


async def build_index() -> None:
    global profile_chunks, index_error
    profile_chunks = []
    index_error = None
    text = read_document(RESUME_PATH)
    if not text:
        return
    chunks = chunk_document(text)
    if not chunks:
        return
    if client is None:
        return
    result = await client.embeddings.generate_async(model=EMBEDDING_MODEL, input=chunks)
    profile_chunks = [
        {"text": chunk, "embedding": item.embedding, "source": RESUME_PATH.name}
        for chunk, item in zip(chunks, result.data)
    ]


@asynccontextmanager
async def lifespan(_: FastAPI):
    global client, index_error
    api_key = os.getenv("OPENROUTER_API_KEY")
    if api_key:
        async with OpenRouter(api_key=api_key) as openrouter:
            client = openrouter
            try:
                await build_index()
            except Exception as exc:
                index_error = str(exc)
                print(f"Profile indexing failed: {exc}")
            try:
                yield
            finally:
                client = None
    else:
        yield


app = FastAPI(
    title="Anantha Krishnan Portfolio API",
    description="Portfolio and profile-grounded AI assistant.",
    version="1.0.0",
    lifespan=lifespan,
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_question(cls, values):
        if isinstance(values, dict) and "message" not in values and "question" in values:
            values["message"] = values["question"]
        return values


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "assistant_configured": client is not None,
        "profile_indexed": bool(profile_chunks),
        "index_error": bool(index_error),
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    question = request.message.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Please enter a question.")
    if client is None:
        raise HTTPException(status_code=503, detail="The AI assistant is not configured yet. Add OPENROUTER_API_KEY to .env and restart the server.")
    try:
        sources: list[dict] = []
        if is_profile_question(question):
            if not profile_chunks:
                raise HTTPException(status_code=503, detail="Profile search is not ready. Check that the profile document exists and the embedding service is available.")
            embedded = await client.embeddings.generate_async(model=EMBEDDING_MODEL, input=question)
            matches = top_matches(embedded.data[0].embedding, profile_chunks)
            context = "\n\n---\n\n".join(match["text"] for match in matches)
            system_prompt = RESUME_SYSTEM_PROMPT.format(context=context)
            sources = [{"label": match["source"], "excerpt": match["text"][:220]} for match in matches]
        else:
            system_prompt = GENERAL_SYSTEM_PROMPT
        answer = await complete(client, CHAT_MODEL, system_prompt, question)
        return {"answer": answer, "sources": sources}
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Chat request failed: {exc}")
        raise HTTPException(status_code=502, detail="The assistant hit a snag. Please try again shortly.") from exc


@app.get("/resume.txt")
async def download_profile():
    if not RESUME_PATH.is_file():
        raise HTTPException(status_code=404, detail="Profile document not found.")
    try:
        return PlainTextResponse(read_document(RESUME_PATH), headers={"Content-Disposition": 'attachment; filename="anantha-krishnan-profile.txt"'})
    except Exception as exc:
        raise HTTPException(status_code=500, detail="The profile document could not be read.") from exc


@app.get("/resume.pdf")
async def resume_pdf(download: bool = False):
    if RESUME_PATH.suffix.lower() != ".pdf" or not RESUME_PATH.is_file():
        raise HTTPException(status_code=404, detail="Résumé PDF not found.")
    return FileResponse(
        RESUME_PATH,
        media_type="application/pdf",
        filename="Anantha-Krishnan-CV.pdf",
        content_disposition_type="attachment" if download else "inline",
    )


@app.get("/profile-image")
async def profile_image():
    if not PROFILE_IMAGE.is_file():
        raise HTTPException(status_code=404, detail="Profile image not found.")
    return FileResponse(PROFILE_IMAGE, media_type="image/jpeg")


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="portfolio")
