from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    mode: Optional[str] = "proxy"   # proxy | escriba | auditoria
    model: Optional[str] = "auto"
