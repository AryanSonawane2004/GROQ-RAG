from pydantic import BaseModel
from typing import List, Optional

class SourceCitation(BaseModel):
    document_name: str
    chunk_index: int
    content: str
    score: Optional[float] = None

class ChatMessage(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    question: str
    history: Optional[List[ChatMessage]] = []
    top_k: Optional[int] = 4
    api_key: Optional[str] = None  # BYOK parameter
    provider: Optional[str] = "gemini"  # "gemini" | "openai"

class ChatResponse(BaseModel):
    answer: str
    citations: List[SourceCitation]

class DocumentInfo(BaseModel):
    id: str
    filename: str
    chunks_count: int
    upload_time: str