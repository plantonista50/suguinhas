from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse
from app.schemas import ChatRequest
from app.auth import verify_token
from app.lgpd import process_text
from app.llm.router import stream_llm
import asyncio

app = FastAPI(title="SuGa GPT Backend")

@app.post("/chat/stream")
async def chat_stream(
    payload: ChatRequest,
    user=Depends(verify_token)
):
    clean_text, _ = process_text(payload.message, payload.mode)

    async def event_generator():
        async for token in await stream_llm(clean_text, payload.model):
            yield token
            await asyncio.sleep(0)  # cooperação async

    return StreamingResponse(
        event_generator(),
        media_type="text/plain"
    )
