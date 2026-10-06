import os
from typing import List, Tuple
from pypdf import PdfReader

def extract_text_from_file(file_path: str, filename: str) -> List[Tuple[str, int]]:
    ext = os.path.splitext(filename)[1].lower()
    pages_text = []

    if ext == ".pdf":
        reader = PdfReader(file_path)
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_text.append((text, idx + 1))
    elif ext in [".txt", ".md"]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            if content.strip():
                pages_text.append((content, 1))
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    return pages_text

def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start += chunk_size - overlap
    return chunks