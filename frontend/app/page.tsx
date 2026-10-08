'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Citation {
  document_name: string;
  chunk_index: number;
  content: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export default function RAGChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Welcome! Enter your Groq API key in the sidebar, upload your documents, and ask any questions.'
    }
  ]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load Groq API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('byok_groq_key') || '';
    setApiKey(savedKey);
  }, []);

  const handleSaveKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem('byok_groq_key', val);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setUploadedFiles((prev) => [...prev, `${file.name} (${data.indexed_chunks || 0} chunks)`]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    if (!apiKey.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ **Groq API Key Required**: Please open the menu and enter your Groq API key (`gsk_...`) before asking questions.'
        }
      ]);
      setIsSidebarOpen(true); // Auto-open sidebar on mobile so user sees the key input
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentInput,
          history: messages,
          api_key: apiKey,
          provider: 'groq'
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, citations: data.citations }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Error connecting to server.' }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Drawer on mobile, fixed sidebar on md+) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Header & Mobile Close Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-orange-400 flex items-center gap-2">
                <span>⚡</span> Groq RAG
              </h2>
              <p className="text-[11px] text-slate-500">Llama 3.3 70B • BYOK Privacy</p>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* BYOK Settings Card */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Groq API Key</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  apiKey ? 'bg-orange-500/20 text-orange-300' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {apiKey ? 'Active' : 'Missing'}
              </span>
            </div>
            <div className="relative">
              <input
                type={showKeyInput ? 'text' : 'password'}
                placeholder="gsk_..."
                value={apiKey}
                onChange={(e) => handleSaveKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 pr-12 text-slate-200 focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-200"
              >
                {showKeyInput ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Stored only in your browser. Get a key at{' '}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 underline"
              >
                console.groq.com
              </a>.
            </p>
          </div>

          {/* Upload Documents Section */}
          <div className="space-y-3">
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-xl p-3.5 text-center transition bg-slate-950/40">
                <span className="text-xs sm:text-sm font-medium text-slate-300 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  {isUploading ? 'Indexing...' : 'Upload Document (.pdf, .txt)'}
                </span>
                <input type="file" onChange={handleFileUpload} accept=".pdf,.txt,.md" className="hidden" />
              </div>
            </label>

            <div>
              <h3 className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider mb-2">
                Indexed Documents
              </h3>
              <ul className="space-y-1.5 text-xs max-h-48 md:max-h-60 overflow-y-auto">
                {uploadedFiles.length === 0 && (
                  <li className="text-slate-600 text-xs italic">No documents indexed yet.</li>
                )}
                {uploadedFiles.map((f, i) => (
                  <li
                    key={i}
                    className="truncate bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-700/50 text-slate-300 flex items-center gap-1.5"
                  >
                    <span>📄</span>
                    <span className="truncate">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center">
          <span>Vector: ChromaDB</span>
          <span>v1.0.0</span>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-slate-950">
        {/* Top Navigation Bar */}
        <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/40 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger button on mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-sm font-semibold text-slate-200 truncate">Document Q&A</h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                apiKey ? 'bg-orange-500/20 text-orange-300' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {apiKey ? '⚡ Groq Ready' : 'Key Missing'}
            </span>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`w-full max-w-[92%] sm:max-w-2xl px-4 py-3 sm:px-5 sm:py-4 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-orange-600 text-white rounded-tr-none'
                    : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800/90 shadow-sm'
                }`}
              >
                {/* Rendered Markdown with responsive tables & typography */}
                <div className="text-xs sm:text-sm leading-relaxed overflow-hidden">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h3: ({ node, ...props }) => (
                        <h3 className="text-sm sm:text-base font-semibold text-orange-400 mt-3 mb-1.5" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-xs sm:text-sm font-semibold text-orange-300 mt-2.5 mb-1" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-orange-200" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-1 my-2 pl-1" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="leading-relaxed" {...props} />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-3 rounded-lg border border-slate-700/80">
                          <table className="w-full border-collapse text-[11px] sm:text-xs min-w-[280px]" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border-b border-slate-700 bg-slate-800/90 px-3 py-2 text-left font-semibold text-slate-200" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border-b border-slate-800/80 px-3 py-2 text-slate-300" {...props} />
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>

                {/* Citations List */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px]">
                    <p className="font-semibold text-orange-400 mb-1.5 flex items-center gap-1">
                      <span>📌</span> Cited Sources:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.citations.map((c, i) => (
                        <span
                          key={i}
                          title={c.content}
                          className="bg-slate-950 px-2 py-1 rounded border border-slate-800 cursor-help text-[10px] text-slate-300 max-w-[200px] truncate"
                        >
                          {c.document_name} (Chunk {c.chunk_index})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="text-xs text-orange-400 animate-pulse flex items-center gap-2 pl-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              Groq LPU synthesizing response...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <footer className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/30 backdrop-blur shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
            />
            <button
              type="submit"
              disabled={isThinking || !input.trim()}
              className="bg-orange-600 hover:bg-orange-500 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>Send</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}