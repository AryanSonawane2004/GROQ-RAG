import os
import re
import chromadb
from chromadb.utils import embedding_functions
from typing import List, Optional
from dotenv import load_dotenv
from groq import Groq
from .document_loader import extract_text_from_file, chunk_text
from .schemas import SourceCitation

load_dotenv()

class RAGEngine:
    def __init__(self, persist_dir: str = "./data/chroma_db"):
        os.makedirs(persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        self.collection = self.client.get_or_create_collection(
            name="rag_documents",
            embedding_function=self.embedding_fn
        )

    def ingest_document(self, file_path: str, filename: str) -> int:
        pages = extract_text_from_file(file_path, filename)
        all_chunks = []
        metadatas = []
        ids = []

        total_chunks = 0
        for page_text, page_num in pages:
            cleaned_text = re.sub(r'\s+', ' ', page_text).strip()
            chunks = chunk_text(cleaned_text, chunk_size=750, overlap=150)
            
            for i, chunk in enumerate(chunks):
                chunk_id = f"{filename}_p{page_num}_c{i}"
                all_chunks.append(chunk)
                metadatas.append({
                    "document_name": filename,
                    "page_number": page_num,
                    "chunk_index": total_chunks
                })
                ids.append(chunk_id)
                total_chunks += 1

        if all_chunks:
            self.collection.upsert(
                documents=all_chunks,
                metadatas=metadatas,
                ids=ids
            )
        return total_chunks

    def retrieve(self, query: str, top_k: int = 4) -> List[SourceCitation]:
        results = self.collection.query(
            query_texts=[query],
            n_results=top_k
        )

        citations = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            distances = results.get("distances", [[None] * len(docs)])[0]

            for doc, meta, dist in zip(docs, metas, distances):
                citations.append(SourceCitation(
                    document_name=meta.get("document_name", "Unknown"),
                    chunk_index=meta.get("chunk_index", 0),
                    content=doc,
                    score=float(dist) if dist is not None else None
                ))
        return citations

    def generate_answer(
        self, 
        query: str, 
        citations: List[SourceCitation], 
        history: list, 
        api_key: Optional[str] = None, 
        provider: str = "groq"
    ) -> str:
        if not citations:
            return "I couldn't find any relevant information in your uploaded documents to answer that question."

        effective_key = api_key or os.getenv("GROQ_API_KEY")
        if not effective_key:
            return "⚠️ **No Groq Key**: Please enter your Groq API key (`gsk_...`) in the sidebar to generate answers."

        context_blocks = [
            f"--- Document: {c.document_name} (Chunk {c.chunk_index}) ---\n{c.content}"
            for c in citations
        ]
        context_str = "\n\n".join(context_blocks)

        system_instruction = (
            "You are an intelligent, articulate assistant answering questions using document context.\n"
            "Instructions:\n"
            "1. Answer the user's question directly, clearly, and conversationally.\n"
            "2. Present key points, types, and comparisons using clear section headings (###) and clean bullet points (-).\n"
            "3. Do NOT put multi-line bullet lists inside markdown tables (tables break on linebreaks).\n"
            "4. Bold key terms for easy scanning.\n"
            "5. If the context does not contain the answer, say: 'Based on the provided documents, I don't have enough information to answer that.'"
        )

        user_content = f"Context Excerpts:\n{context_str}\n\nUser Question:\n{query}"

        try:
            client = Groq(api_key=effective_key)
            completion = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.2,
                max_tokens=1024,
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            return f"❌ **Groq API Error**: {str(e)}"