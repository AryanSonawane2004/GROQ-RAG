# ⚡ Groq RAG

A high-speed **Retrieval-Augmented Generation (RAG) chat application** that lets users upload documents and ask questions grounded in their content.

The application combines a **Next.js + React frontend** with a backend document-indexing service and **Groq's GPT-OSS-20B** model for generating answers from retrieved document context.

## Features

- 📄 **Document Upload**
  - Upload `.pdf`, `.txt`, and `.md` documents.
  - Documents are sent to the backend for indexing.
  - Displays the number of indexed chunks for each uploaded document.

- 💬 **Grounded Document Q&A**
  - Ask questions about uploaded documents through a conversational chat interface.
  - Retrieved document chunks are passed to the LLM as context.
  - The model is instructed to avoid fabricating answers when the provided context does not contain the required information.

- ⚡ **Groq Inference**
  - Uses Groq for low-latency LLM inference.
  - Currently configured with `openai/gpt-oss-20b`.

- 🔑 **Bring Your Own Key (BYOK)**
  - Users provide their own Groq API key.
  - The key is stored in browser `localStorage`.
  - No shared Groq API key is required by the frontend.

- 📌 **Source Citations**
  - Assistant responses can display the document and chunk used as supporting context.
  - Citation content can be inspected from the chat interface.

- 📝 **Markdown Rendering**
  - Supports headings, lists, tables, emphasis, and other GitHub-Flavored Markdown features.
  - Responses are rendered using `react-markdown`.

- 🌙 **Dark UI**
  - Dark-themed interface built with Tailwind CSS.
  - Includes a sidebar for API-key configuration and document management.

---

## Architecture

```text
┌───────────────────────────────┐
│        Next.js Frontend       │
│                               │
│  • Chat Interface             │
│  • API Key Management         │
│  • Document Upload            │
│  • Citation Display           │
└───────────────┬───────────────┘
                │
                │ HTTP
                ▼
┌───────────────────────────────┐
│       RAG Backend API         │
│                               │
│  POST /api/upload             │
│  • Process document           │
│  • Split/index content        │
│                               │
│  POST /api/chat               │
│  • Retrieve relevant context  │
│  • Generate response          │
└───────────────┬───────────────┘
                │
                │ Context + Question
                ▼
┌───────────────────────────────┐
│          Groq API             │
│                               │
│       GPT-OSS-20B             │
└───────────────────────────────┘
```

The frontend communicates with the backend through:

```text
POST http://localhost:8000/api/upload
POST http://localhost:8000/api/chat
```

The frontend itself does **not** implement the document retrieval/vector-search pipeline. That responsibility belongs to the backend service.

---

## Tech Stack

### Frontend

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **React Markdown**
- **Remark GFM**
- **Remark Breaks**
- **Rehype Raw**

### AI / LLM

- **Groq API**
- **GPT-OSS-20B**
- Groq SDK

### Backend Integration

- REST API
- Document upload endpoint
- RAG chat endpoint
- Citation-based context passing

### Deployment

- **Netlify**
- Netlify Functions
- Next.js production build

---

## Project Structure

```text
.
├── app/
│   ├── page.tsx              # Main RAG chat interface
│   ├── layout.tsx            # Application layout
│   └── globals.css           # Global styles
│
├── netlify/
│   └── functions/
│       └── chat.ts           # Netlify chat function
│
├── public/                   # Static assets
│
├── next.config.ts            # Next.js configuration
├── netlify.toml              # Netlify configuration
├── postcss.config.mjs        # PostCSS configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies and scripts
└── README.md
```

---

## Getting Started

### Prerequisites

Make sure you have:

- Node.js **20.9+**
- npm
- A running RAG backend
- A Groq API key

The current Next.js version requires Node.js 20.9 or newer.

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd <project-directory>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

---

## Backend Requirement

The frontend currently expects a backend API running on:

```text
http://localhost:8000
```

### Document upload

```http
POST /api/upload
```

The frontend sends the selected document as multipart form data:

```text
file=<document>
```

The backend is expected to return information including:

```json
{
  "indexed_chunks": 52
}
```

### Chat

```http
POST /api/chat
```

Example request:

```json
{
  "question": "What is the main idea of the document?",
  "history": [],
  "api_key": "gsk_...",
  "provider": "groq"
}
```

The backend returns the generated answer and supporting citations:

```json
{
  "answer": "The main idea is...",
  "citations": [
    {
      "document_name": "document.pdf",
      "chunk_index": 4,
      "content": "Relevant document content..."
    }
  ]
}
```

---

## Groq API Key

The application follows a **BYOK (Bring Your Own Key)** model.

Enter your Groq API key in the sidebar:

```text
gsk_...
```

The key is stored locally in the browser using:

```text
localStorage
```

with the key:

```text
byok_groq_key
```

The frontend does not require you to hard-code a Groq API key into the source code.

> **Security note:** storing an API key in `localStorage` is convenient for a personal/demo application but is not an ideal approach for a production application. For a production deployment, API credentials should generally be handled server-side.

---

## How It Works

### 1. Upload a document

The user selects a PDF, TXT, or Markdown file.

```text
User
 ↓
Next.js Frontend
 ↓
POST /api/upload
 ↓
RAG Backend
 ↓
Document Processing / Indexing
```

### 2. Ask a question

The user enters a question about the uploaded material.

```text
User Question
      ↓
Next.js Frontend
      ↓
POST /api/chat
      ↓
RAG Backend
      ↓
Relevant Document Context
      ↓
Groq API
      ↓
GPT-OSS-20B
      ↓
Generated Answer
      ↓
Frontend
```

### 3. Display grounded response

The generated answer is rendered as Markdown, while available source chunks are displayed underneath the response.

This makes it possible to inspect which document chunks contributed to the answer.

---

## Model Configuration

The chat function currently uses:

```text
Model: openai/gpt-oss-20b
Temperature: 0.2
Maximum tokens: 1024
```

The relatively low temperature is intentional because this application is designed for **document-grounded question answering**, where consistency is generally more useful than highly creative responses.

---

## Response Behavior

The LLM receives a system instruction to:

- Answer the question directly.
- Use clear section headings.
- Use bullet points for structured information.
- Highlight important terms.
- Avoid putting multi-line bullet lists inside Markdown tables.
- Avoid inventing information when the supplied document context is insufficient.

When the context does not contain enough information, the model is instructed to respond:

```text
Based on the provided documents, I don't have enough information to answer that.
```

---

## Available Scripts

### Development

```bash
npm run dev
```

Starts the Next.js development server.

### Production Build

```bash
npm run build
```

Creates a production build.

### Production Server

```bash
npm run start
```

Starts the production Next.js server.

### Lint

```bash
npm run lint
```

Runs ESLint.

---

## Netlify Deployment

The project includes a `netlify.toml` configuration.

The build command is:

```bash
npm run build
```

Netlify Functions are configured under:

```text
netlify/functions
```

The `/api/chat` route is redirected to the Netlify chat function:

```text
/api/chat
    ↓
/.netlify/functions/chat
```

To deploy with Netlify:

```bash
npm run build
netlify deploy --prod
```

Make sure the backend used for document upload and retrieval is also publicly accessible when deploying the frontend outside your local machine.

---

## Current Limitations

This project is currently structured as a **frontend + RAG backend** system rather than a completely self-contained Next.js RAG application.

Important limitations:

- The frontend expects the RAG backend at `localhost:8000`.
- The document retrieval/indexing implementation is not contained in this frontend repository.
- The Groq API key is stored in browser `localStorage`.
- The application currently supports one selected file per upload action.
- There is no authentication or user account system.
- Indexed-document state is currently maintained in frontend state rather than as a persistent document-management layer.

These are acceptable for a development/demo project but should be addressed before treating the application as a production-grade multi-user RAG platform.

---

## Future Improvements

Potential improvements include:

- [ ] Connect the frontend to a production RAG backend
- [ ] Add persistent document management
- [ ] Support multiple simultaneous uploads
- [ ] Add document deletion
- [ ] Add conversation persistence
- [ ] Add streaming LLM responses
- [ ] Add authentication
- [ ] Move API-key handling away from browser storage
- [ ] Add configurable LLM models
- [ ] Add configurable retrieval parameters
- [ ] Display retrieved chunks more clearly
- [ ] Add evaluation metrics for RAG quality
- [ ] Add production monitoring and error tracking

---

## Learning Goals

This project demonstrates practical implementation of:

- Retrieval-Augmented Generation
- LLM-powered document question answering
- Context injection
- Source attribution
- LLM API integration
- BYOK architecture
- REST API communication
- Next.js application development
- TypeScript
- Markdown rendering
- Serverless deployment

---

## License

This project is intended for educational and portfolio use.

Add an appropriate open-source license if you plan to distribute the project publicly.