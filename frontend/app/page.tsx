'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';

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
    { role: 'assistant', content: 'Welcome! Enter your Groq API key in the sidebar, upload your documents, and start asking questions.' }
  ]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

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
      setUploadedFiles((prev) => [...prev, `${file.name} (${data.indexed_chunks} chunks)`]);
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
        { role: 'assistant', content: '⚠️ **Groq API Key Required**: Please enter your Groq API key (`gsk_...`) in the sidebar before chatting.' }
      ]);
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsThinking(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
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
        { role: 'assistant', content: '❌ Error contacting backend API.' }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-84 border-r border-slate-800 p-6 flex flex-col justify-between bg-slate-900/50">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-orange-400">⚡ Groq RAG</h2>
            <p className="text-xs text-slate-500 mt-1">GPT-OSS-20B • High-Speed BYOK</p>
          </div>

          {/* Groq BYOK Settings Card */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Groq API Key</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${apiKey ? 'bg-orange-500/20 text-orange-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {apiKey ? 'Active' : 'Missing'}
              </span>
            </div>
            <div className="relative">
              <input
                type={showKeyInput ? 'text' : 'password'}
                placeholder="gsk_..."
                value={apiKey}
                onChange={(e) => handleSaveKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-2 pr-12 text-slate-200 focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="absolute right-2 top-2 text-[10px] text-slate-400 hover:text-slate-200"
              >
                {showKeyInput ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Get a free instant key at{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-orange-400 underline">
                console.groq.com
              </a>.
            </p>
          </div>

          {/* Upload Documents */}
          <div>
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-xl p-4 text-center transition">
                <span className="text-sm font-medium text-slate-300">
                  {isUploading ? 'Indexing...' : '+ Upload Document (.pdf, .txt)'}
                </span>
                <input type="file" onChange={handleFileUpload} accept=".pdf,.txt,.md" className="hidden" />
              </div>
            </label>

            <h3 className="text-xs uppercase font-semibold text-slate-500 tracking-wider mt-4 mb-2">Indexed Documents</h3>
            <ul className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
              {uploadedFiles.length === 0 && <li className="text-slate-600 italic">No files indexed yet.</li>}
              {uploadedFiles.map((f, i) => (
                <li key={i} className="truncate bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-700/40 text-slate-300">
                  📄 {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
          <h1 className="text-sm font-medium text-slate-300">Grounded Document Q&A</h1>
          <span className="text-xs text-orange-400/80 font-mono">Engine: GPT-OSS-20B</span>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-2xl px-5 py-3.5 rounded-2xl ${
                m.role === 'user'
                  ? 'bg-orange-600 text-white rounded-tr-none'
                  : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800'
              }`}>
                <div className="text-sm leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    rehypePlugins = {[rehypeRaw]}
                    components={{
                      h3: ({ node, ...props }) => (
                        <h3 className="text-base font-semibold text-orange-400 mt-4 mb-2" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-sm font-semibold text-orange-300 mt-3 mb-1" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-2.5 last:mb-0 leading-relaxed" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-orange-200" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-3 rounded-lg border border-slate-700">
                          <table className="w-full border-collapse text-xs" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border-b border-slate-700 bg-slate-800/80 px-3 py-2 text-left font-semibold text-slate-200" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border-b border-slate-800 px-3 py-2 text-slate-300" {...props} />
                      ),
                    }}
                  >
                    {m.content.replace(/<br\s*\/?>/gi, '\n')}
                  </ReactMarkdown>
                </div>

                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
                    <p className="font-semibold text-orange-400 mb-1.5">Sources Cited:</p>
                    <div className="flex flex-wrap gap-2">
                      {m.citations.map((c, i) => (
                        <span key={i} title={c.content} className="bg-slate-950 px-2 py-1 rounded border border-slate-800 cursor-help text-[11px] text-slate-300">
                          📌 {c.document_name} (Chunk {c.chunk_index})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="text-xs text-orange-400 animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
              Inferencing at ultra-high speed via Groq...
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2 bg-slate-900/20">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 text-sm"
          />
          <button
            type="submit"
            disabled={isThinking}
            className="bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded-xl font-medium text-sm transition disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}