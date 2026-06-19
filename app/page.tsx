'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatComponent() {
  const router = useRouter();
  const [userChecked, setUserChecked] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedText, setAttachedText] = useState('');
  const [fileName, setFileName] = useState('');

  // 1. Verify User Session State on window startup
  useEffect(() => {
    async function checkUserSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login'); // Boot unauthenticated requests to login terminal
      } else {
        setUserChecked(true); // Grant dashboard execution permission
        loadChatHistory();
      }
    }

    async function loadChatHistory() {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading history:', error.message);
      } else if (data) {
        setMessages(data as LocalMessage[]);
      }
    }

    checkUserSession();
  }, [router]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setAttachedText(text);
    };
    reader.readAsText(file);
  };

  const handleClearHistory = async () => {
    if (messages.length === 0) return;
    const confirmClear = window.confirm("Are you sure you want to clear your conversation context history?");
    if (!confirmClear) return;

    setLoading(true);
    try {
      const response = await fetch('/api/chat/clear', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Secure user sign-out session termination logic
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedText) || loading) return;

    let fullPrompt = input;
    if (attachedText) {
      fullPrompt = `[Uploaded File: ${fileName}]\nFile Contents:\n${attachedText}\n\nUser Question: ${input || 'Analyze this file contents.'}`;
    }

    const currentText = fullPrompt;
    setInput('');
    setAttachedText('');
    setFileName('');
    setLoading(true);

    const tempUserMsg: LocalMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentText,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    await supabase.from('chat_history').insert([{ role: 'user', content: currentText }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, tempUserMsg] }),
      });

      const data = await response.json();
      
      if (data.text) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: 'assistant', content: data.text },
        ]);
        await supabase.from('chat_history').insert([{ role: 'assistant', content: data.text }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Prevent flashing design layers while check resolves
  if (!userChecked) {
    return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-xs font-mono text-zinc-500">SYNCHRONIZING_SESSION...</div>;
  }

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto h-screen py-6 px-4 bg-[#09090b] text-zinc-100 antialiased font-sans">
      
      {/* App Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
          <h1 className="text-sm font-semibold tracking-wider uppercase text-zinc-400">Obsidian AI Engine v1.0</h1>
        </div>
        
        {/* Action Panel Holder (Wipe Button, Logout Button, and Status Gauge) */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={handleClearHistory} className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-950 bg-red-950/20 px-2.5 py-1 rounded-md transition duration-200">
              WIPE CONTEXT
            </button>
          )}
          <button onClick={handleLogout} className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 rounded-md transition duration-200">
            DISCONNECT
          </button>
          <div className="text-xs text-zinc-500 font-mono bg-zinc-950 px-2.5 py-1 border border-zinc-800 rounded-md">
            SYSTEM STATUS: ONLINE
          </div>
        </div>
      </div>
      
      {/* Workspace Terminal View */}
      <div className="flex-1 overflow-y-auto space-y-6 mb-4 p-4 border border-zinc-800/80 rounded-2xl bg-[#0c0c0e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center mt-12">
            <span className="text-3xl mb-3 opacity-50">⚡</span>
            <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
              Workspace initialized. Upload a text or code document or type a query below to prompt the neural model.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md leading-relaxed ${
              m.role === 'user' 
                ? 'bg-zinc-900 border border-zinc-700/50 text-zinc-100 font-medium' 
                : 'bg-zinc-950 border border-cyan-950/60 text-zinc-300 shadow-[0_0_15px_rgba(0,0,0,0.2)]'
            }`}>
              <span className={`font-mono block text-[10px] uppercase tracking-widest mb-1.5 opacity-60 ${
                m.role === 'user' ? 'text-zinc-400' : 'text-cyan-400'
              }`}>
                {m.role === 'user' ? '■ CORE_USER' : '◆ ASSISTANT_LOGIC'}
              </span>
              <p className="whitespace-pre-wrap font-mono text-xs">{m.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* File Attachment Status Indicator */}
      {fileName && (
        <div className="mb-3 p-2.5 bg-cyan-950/30 border border-cyan-800/50 rounded-xl text-xs text-cyan-400 flex justify-between items-center shadow-[0_0_10px_rgba(34,211,238,0.05)]">
          <span className="flex items-center gap-2 font-mono">📎 ATTACHED_NODE: <strong>{fileName}</strong></span>
          <button onClick={() => { setFileName(''); setAttachedText(''); }} className="hover:text-cyan-200 bg-cyan-900/30 p-1 rounded-md border border-cyan-700/30">✕</button>
        </div>
      )}

      {/* User Input Entry Dock */}
      <form onSubmit={handleSubmit} className="flex gap-2 bg-[#0c0c0e] p-2 border border-zinc-800 rounded-xl shadow-xl items-center focus-within:border-cyan-500/40 transition-colors duration-300">
        <label className="cursor-pointer p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-cyan-400" title="Attach file">
          <span className="text-lg">📎</span>
          <input type="file" accept=".txt,.js,.ts,.tsx,.json,.csv,.md" className="hidden" onChange={handleFileUpload} disabled={loading} />
        </label>
        <input className="flex-1 px-2 py-2 text-xs font-mono text-zinc-200 outline-none bg-transparent placeholder-zinc-600" value={input} placeholder={fileName ? "Input variables regarding this file..." : "Compile a new query script or attach file..."} onChange={(e) => setInput(e.target.value)} disabled={loading} />
        <button type="submit" disabled={loading || (!input.trim() && !attachedText)} className="bg-zinc-100 text-zinc-950 text-xs font-mono font-bold px-4 py-2.5 rounded-lg hover:bg-zinc-200 active:scale-95 transition-all duration-200 disabled:opacity-20 disabled:pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          {loading ? 'RUNNING...' : 'EXECUTE'}
        </button>
      </form>
      
    </div>
  );
}