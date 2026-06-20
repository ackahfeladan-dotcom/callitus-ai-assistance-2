'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
import ReactMarkdown from 'react-markdown';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatComponent() {
  const router = useRouter();
  const [userChecked, setUserChecked] = useState(true);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedText, setAttachedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  <div className="flex flex-col w-full min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-6 font-sans select-none antialiased">
 {/* Collapsible Sidebar Overlay */}
      <div 
        className="fixed top-0 left-0 h-screen w-68 bg-[#0d0d0d] border-r border-zinc-800/40 p-3.5 flex flex-col justify-between transition-all duration-300 ease-in-out font-sans text-zinc-200"
        style={{ 
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          zIndex: 9999,
          visibility: isSidebarOpen ? 'visible' : 'hidden',
          opacity: isSidebarOpen ? 1 : 0
        }}
      >
        {/* TOP SECTION: LOGO & NAVIGATION LIST */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold tracking-wide text-zinc-100 pl-1">ChatGPT</span>
           <button 
            onClick={() => setIsSidebarOpen(false)} 
            aria-label="Close sidebar"
            className="p-1.5 hover:bg-zinc-800/50 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
          >
              <svg xmlns="http://w3.org" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {/* NEW CHAT BUTTON */}
          <button 
            onClick={() => {
              setMessages([]);
              setIsSidebarOpen(false);
            }}
            aria-label="New chat"
            className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#171717] border border-zinc-800/40 text-sm font-medium text-zinc-100 transition-colors mb-6 group"
          >
            <span>New chat</span>
            <svg className="text-zinc-500 group-hover:text-zinc-300 transition-colors" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>

          {/* MAIN NAV ITEM LIST (CLEAN TECH ICONS) */}
          <nav className="space-y-0.5 text-sm font-normal text-zinc-300">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#171717] transition-colors text-left group">
              <svg className="text-zinc-500 group-hover:text-zinc-300" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span>Search chats</span>
            </button>
            
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#171717] transition-colors text-left group">
              <svg className="text-zinc-500 group-hover:text-zinc-300" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span>Library</span>
            </button>
            
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#171717] transition-colors text-left group">
              <svg className="text-zinc-500 group-hover:text-zinc-300" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span>Projects</span>
            </button>
            
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#171717] transition-colors text-left group">
              <svg className="text-zinc-500 group-hover:text-zinc-300" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>Explore GPTs</span>
            </button>
            
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#171717] transition-colors text-left group">
              <svg className="text-zinc-500 group-hover:text-zinc-300" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              <span>Codex</span>
            </button>
          </nav>

          {/* RECENTS TIMELINE LOG */}
          <div className="mt-7 px-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 tracking-wide">
              <span>Recent Chats</span>
              <svg xmlns="http://w3.org" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
            <div className="mt-3 text-xs text-zinc-400 space-y-2.5">
              <p className="hover:text-zinc-200 cursor-pointer truncate pl-0.5">Obsidian System Workspace Initialization</p>
              <p className="hover:text-zinc-200 cursor-pointer truncate pl-0.5">Database User Session Management</p>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: PREMIUM USER PROFILE ACTION */}
        <div className="border-t border-zinc-800/40 pt-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-[11px] font-bold text-white shadow">
              WC
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-medium text-zinc-200 leading-none mb-0.5">Wek Callitus</span>
              <span className="text-[10px] text-zinc-500 font-mono">NODE_USER_FREE</span>
            </div>
          </div>
          
          <button className="bg-zinc-900 border border-zinc-800/60 hover:bg-zinc-800 text-zinc-200 text-[11px] font-medium px-3 py-1 rounded-full transition-colors">
            Upgrade
          </button>
        </div>

      </div>

      {/* App Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
 <button
          onClick={() => setIsSidebarOpen(true)}
          className="relative z-[99999] p-1.5 mr-2 text-zinc-400 hover:text-white rounded bg-zinc-900 border border-zinc-800 text-sm"
        >
          ☰
        </button>
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
       
              
              <div className="prose prose-invert max-w-none font-sans text-sm md:text-base text-zinc-100 font-medium leading-relaxed space-y-3 selection:bg-cyan-500/30">
  <ReactMarkdown>{m.content}</ReactMarkdown>
</div>
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
     <form onSubmit={handleSubmit} className="w-full flex items-center gap-2 bg-[#0E131F]/90 backdrop-blur-md p-2 md:p-3 border border-slate-800/80 rounded-xl md:rounded-2xl shadow-xl focus-within:border-cyan-500/40 transition-all">
        <label className="cursor-pointer p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-cyan-400" title="Attach file">
          <span className="text-lg">📎</span>
          <input type="file" accept=".txt,.js,.ts,.tsx,.json,.csv,.md" className="hidden" onChange={handleFileUpload} disabled={loading} />
        </label>
        <input className="flex-1 px-2 py-2 text-xs font-mono text-zinc-200 outline-none bg-transparent placeholder-zinc-600" value={input} placeholder={fileName ? "Input variables regarding this file..." : "Compile a new query script or attach file..."} onChange={(e) => setInput(e.target.value)} disabled={loading} />
        <button type="submit" disabled={loading || (!input.trim() && !attachedText)} className="bg-zinc-100 text-zinc-950 text-xs font-mono font-bold px-4 py-2.5 rounded-lg hover:bg-zinc-200 active:scale-95 transition-all duration-200 disabled:opacity-20 disabled:pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          {loading ? 'RUNNING...' : 'EXECUTE'}
        </button>
      </form>
      <div ref={messagesEndRef} />
    </div>
  );
}