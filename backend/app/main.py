import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .rag_engine import RAGEngine
from .schemas import ChatRequest, ChatResponse

app = FastAPI(title="RAG QA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "./data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
rag_engine = RAGEngine()

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    allowed_exts = [".pdf", ".txt", ".md"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not supported")

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    chunks_count = rag_engine.ingest_document(save_path, file.filename)
    return {
        "status": "success",
        "filename": file.filename,
        "indexed_chunks": chunks_count
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    citations = rag_engine.retrieve(req.question, top_k=req.top_k)
    answer = rag_engine.generate_answer(
        query=req.question,
        citations=citations,
        history=req.history,
        api_key=req.api_key,
        provider=req.provider
    )
    return ChatResponse(answer=answer, citations=citations)

@app.get("/api/health")
def health():
    return {"status": "ok"}