# RAG QA Backend

A FastAPI-based Retrieval-Augmented Generation (RAG) backend for uploading documents, indexing their contents in ChromaDB, retrieving relevant chunks, and generating grounded answers with Groq.

## Overview

This project provides the backend API for a document-based question-answering system.

The pipeline is:

```text
Document Upload
      ↓
Text Extraction
      ↓
Chunking
      ↓
ChromaDB Vector Store
      ↓
Similarity Retrieval
      ↓
Relevant Context
      ↓
Groq LLM
      ↓
Answer + Source Citations
```

The backend currently supports **PDF, TXT, and Markdown (`.md`)** documents.

## Features

- Upload and index documents through a FastAPI endpoint
- PDF text extraction using `pypdf`
- TXT and Markdown document ingestion
- Configurable text chunking with overlap
- Persistent ChromaDB vector storage
- Similarity-based retrieval of relevant document chunks
- Grounded question answering using retrieved document context
- Source citations containing document name and chunk information
- Conversation history support in the request schema
- Bring Your Own Groq API Key (BYOK)
- CORS enabled for frontend integration
- Health-check endpoint
- Environment-variable support through `.env`

## Tech Stack

### Backend

- Python 3.11+
- FastAPI
- Uvicorn
- Pydantic

### RAG / Retrieval

- ChromaDB
- Sentence Transformers dependency
- `pypdf`
- Custom text chunking and retrieval pipeline

### LLM

- Groq API
- Current model: `openai/gpt-oss-20b`

### Utilities

- `python-dotenv`
- `python-multipart`

## Project Structure

```text
backend/
├── main.py
├── rag_engine.py
├── document_loader.py
├── schemas.py
├── data/
│   ├── uploads/
│   └── chroma_db/
├── .env
├── .gitignore
├── pyproject.toml
├── requirements.txt
└── README.md
```

### Core Components

#### `main.py`

Defines the FastAPI application and HTTP endpoints.

It handles:

- Document uploads
- Chat requests
- Health checks
- CORS configuration

#### `document_loader.py`

Responsible for:

- Extracting text from PDF, TXT, and Markdown files
- Splitting extracted text into overlapping chunks

The RAG engine uses a larger chunk configuration of **750 characters with 150 characters of overlap** during ingestion.

#### `rag_engine.py`

Contains the main RAG pipeline:

1. Loads document text
2. Cleans extracted text
3. Splits text into chunks
4. Stores chunks in ChromaDB
5. Retrieves the most relevant chunks for a question
6. Builds the context passed to the LLM
7. Generates the final answer through Groq

#### `schemas.py`

Defines Pydantic models for:

- Chat requests
- Chat responses
- Conversation messages
- Source citations
- Document metadata

## Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd backend
```

### 2. Create a virtual environment

Using Python 3.11 or newer:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Activate it on Linux/macOS:

```bash
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

Or, if using `uv`:

```bash
uv sync
```

## Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
```

The application loads `GROQ_API_KEY` from the environment when an API key is not supplied directly in the chat request.

> **Security:** Never commit your real API key to Git. Keep `.env` excluded through `.gitignore`.

## Running the API

Start the FastAPI server with Uvicorn:

```bash
uvicorn main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

For a network-accessible development server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Interactive API Documentation

FastAPI automatically provides:

```text
http://127.0.0.1:8000/docs
```

and:

```text
http://127.0.0.1:8000/redoc
```

## API Endpoints

### `GET /api/health`

Checks whether the backend is running.

#### Response

```json
{
  "status": "ok"
}
```

---

### `POST /api/upload`

Uploads and indexes a document.

#### Supported file types

- `.pdf`
- `.txt`
- `.md`

#### Example response

```json
{
  "status": "success",
  "filename": "example.pdf",
  "indexed_chunks": 12
}
```

The uploaded file is stored under:

```text
./data/uploads/
```

The extracted chunks are persisted in:

```text
./data/chroma_db/
```

---

### `POST /api/chat`

Retrieves relevant document chunks and generates an answer using the retrieved context.

#### Request

```json
{
  "question": "What is the main topic of the document?",
  "history": [],
  "top_k": 4,
  "api_key": "gsk_...",
  "provider": "groq"
}
```

`api_key` is optional. If omitted, the backend attempts to use `GROQ_API_KEY` from the environment.

#### Response

```json
{
  "answer": "The document discusses ...",
  "citations": [
    {
      "document_name": "example.pdf",
      "chunk_index": 0,
      "content": "Relevant document content...",
      "score": 0.42
    }
  ]
}
```

## RAG Pipeline

### 1. Document ingestion

When a document is uploaded, the backend first extracts its text.

For PDFs, each non-empty page is extracted separately. TXT and Markdown files are loaded as a single text source.

### 2. Text cleaning

Whitespace is normalized before chunking:

```text
multiple     spaces
and
line breaks

→

multiple spaces and line breaks
```

### 3. Chunking

The RAG engine splits the cleaned text into chunks of:

- **750 characters**
- **150-character overlap**

The overlap helps preserve context between adjacent chunks.

### 4. Vector storage

Chunks are stored in a persistent ChromaDB collection named:

```text
rag_documents
```

Each chunk stores metadata including:

- Document name
- Page number
- Chunk index

### 5. Retrieval

For a user question, ChromaDB performs similarity search and returns the requested number of relevant chunks.

The default is:

```text
top_k = 4
```

### 6. Context construction

The retrieved chunks are combined into context blocks containing the document name and chunk index.

### 7. Answer generation

The retrieved context is passed to Groq along with the user's question.

The current Groq model configured in the backend is:

```text
openai/gpt-oss-20b
```

The model is instructed to answer using the supplied document context and to acknowledge when the documents do not contain enough information.

## Example Workflow

### Upload a document

```bash
curl -X POST "http://127.0.0.1:8000/api/upload" \
  -F "file=@example.pdf"
```

### Ask a question

```bash
curl -X POST "http://127.0.0.1:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is this document about?",
    "top_k": 4
  }'
```

## Data Persistence

The backend creates two local directories:

```text
data/
├── uploads/
└── chroma_db/
```

`uploads/` contains the uploaded source documents.

`chroma_db/` contains the persistent ChromaDB data used for retrieval.

These directories should generally not be committed to Git because they contain generated/runtime data.

## Error Handling

The API rejects unsupported document extensions with HTTP 400.

If no relevant document context is retrieved, the backend returns a message indicating that the uploaded documents do not contain enough relevant information.

If no Groq API key is available, the chat response reports that a Groq key is required.

Groq API exceptions are returned as an API error message.

## Development Notes

The backend is currently designed as a straightforward RAG service that can be connected to a separate frontend.

The frontend can:

1. Upload documents using `/api/upload`
2. Send questions using `/api/chat`
3. Display the generated answer
4. Display the returned source citations
5. Check backend availability using `/api/health`

## Requirements

The project requires Python `3.11` or newer.

Core dependencies include:

```text
fastapi
uvicorn
pydantic
python-multipart
chromadb
sentence-transformers
pypdf
google-genai
groq
python-dotenv
```

## License

Add your preferred license here before publishing the repository.
