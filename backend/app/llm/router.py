from app.llm.openai import stream_openai

async def stream_llm(prompt: str, model: str):
    # Estratégia simples (por enquanto)
    return stream_openai(prompt)
