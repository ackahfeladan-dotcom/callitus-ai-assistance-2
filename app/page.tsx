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
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModel, setActiveModel] = useState<string>('Default Assistant');
  const [currentView, setCurrentView] = useState<'chat' | 'projects' | 'explore' | 'codex'>('chat');
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
   {/* Slide-out Library Context Panel */}
      <div 
        className="fixed top-0 right-0 h-screen w-80 bg-[#0d0d0d] border-l border-zinc-800/60 p-5 flex flex-col justify-between transition-all duration-300 ease-in-out font-sans"
        style={{ 
          transform: isLibraryOpen ? 'translateX(0)' : 'translateX(100%)',
          zIndex: 9998,
          visibility: isLibraryOpen ? 'visible' : 'hidden',
          opacity: isLibraryOpen ? 1 : 0
        }}
      >
        <div>
          {/* HEADER SECTOR */}
          <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <svg className="text-cyan-500" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span className="text-xs font-mono tracking-widest text-zinc-300 font-bold uppercase">System Knowledge Library</span>
            </div>
            <button 
              onClick={() => setIsLibraryOpen(false)} 
              className="p-1 hover:bg-zinc-800/50 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* ASSET UPLOAD DROP ZONE */}
          <div className="border border-dashed border-zinc-800 hover:border-cyan-800/60 transition-colors rounded-xl p-4 text-center cursor-pointer mb-5 bg-[#121212]/40 group">
            <span className="text-zinc-500 text-xs block mb-1 group-hover:text-zinc-400">Drag or drop document assets</span>
            <span className="text-[10px] text-zinc-600 font-mono">PDF, TXT, JSON, MD</span>
          </div>

          {/* SAVED DOCUMENTS LIST LOG */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Index Core Nodes</span>
            
            <div className="p-2.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-1">
              <span className="text-xs text-zinc-300 font-medium truncate">system_architecture_spec.json</span>
              <span className="text-[9px] font-mono text-zinc-600">UPLOADED: 24_MAY_2026 • 12.4KB</span>
            </div>

            <div className="p-2.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-1">
              <span className="text-xs text-zinc-300 font-medium truncate">neural_weight_embeddings.md</span>
              <span className="text-[9px] font-mono text-zinc-600">UPLOADED: 02_JUN_2026 • 4.1KB</span>
            </div>
          </div>
        </div>

        {/* BOTTOM STATISTICS STATUS GAUGE */}
        <div className="border-t border-zinc-800/40 pt-3 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>STORAGE CAPACITY</span>
          <span className="text-zinc-400">16.5 KB / 100 MB</span>
        </div>
      </div>

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
            <span className="text-sm font-semibold tracking-wide text-zinc-100 pl-1">CALLITUS</span>
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
               setCurrentView('chat');
            }}
            aria-label="New chat"
            className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#171717] border border-zinc-800/40 text-sm font-medium text-zinc-100 transition-colors mb-6 group"
          >
            <span>New chat</span>
            <svg className="text-zinc-500 group-hover:text-zinc-300 transition-colors" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>

          {/* MAIN NAV ITEM LIST (CLEAN TECH ICONS) */}
          <nav className="space-y-0.5 text-sm font-normal text-zinc-300">
 {/* COMPACT HOVER SEARCH ANCHOR ENTRY BOX */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-[#171717]/60 border border-zinc-800/40 rounded-xl mx-0.5 my-2 focus-within:border-zinc-700 transition-colors">
              <svg className="text-zinc-500 shrink-0" xmlns="http://w3.org" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder-zinc-500 font-sans"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-500 hover:text-zinc-300 text-xs px-0.5 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            
           <button 
              onClick={() => {
                setIsLibraryOpen(true);
                setIsSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#171717] transition-colors text-left group"
            >
              <svg className="text-zinc-500 group-hover:text-zinc-300" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span>Library</span>
            </button>
            
<button 
  onClick={() => setCurrentView('projects')}
  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
    currentView === 'projects' ? 'bg-zinc-800 text-white' : 'hover:bg-[#171717] text-zinc-400'
  }`}
>
  <svg className="text-zinc-500 group-hover:text-zinc-300" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
  <span>Projects</span>
</button>
       <button 
  onClick={() => setCurrentView('explore')}
  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
    currentView === 'explore' ? 'bg-zinc-800 text-white' : 'hover:bg-[#171717] text-zinc-400'
  }`}
>
  <svg className="text-zinc-500 group-hover:text-zinc-300" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
  <span>Explore GPTs</span>
</button>
   <button 
  onClick={() => setCurrentView('codex')}
  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
    currentView === 'codex' ? 'bg-zinc-800 text-white' : 'hover:bg-[#171717] text-zinc-400'
  }`}
>
  <svg className="text-zinc-500 group-hover:text-zinc-300" xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
  <span>Codex</span>
</button>
</nav>

          {/* RECENTS TIMELINE LOG */}
          <div className="mt-7 px-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 tracking-wide">
              <span>Recent Chats</span>
              <svg xmlns="http://w3.org" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
           {/* DYNAMIC SEARCH FILTER MAP */}
            <div className="mt-3 text-xs text-zinc-400 space-y-2.5">
              {[
                "Obsidian System Workspace Initialization",
                "Database User Session Management"
              ]
                .filter(title => title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((title, idx) => (
                  <p key={idx} className="hover:text-zinc-200 cursor-pointer truncate pl-0.5">
                    {title}
                  </p>
                ))}
              
              {searchQuery && ["Obsidian System Workspace Initialization", "Database User Session Management"].filter(title => title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="text-zinc-600 italic pl-0.5 text-[11px]">No results found</p>
              )}
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
          className="p-1.5 mr-2 text-zinc-400 hover:text-white rounded bg-zinc-900 border border-zinc-800 text-sm"
        >
          ☰
        </button>
        <h1 className="text-sm font-semibold tracking-wider uppercase text-zinc-400">CALLITUS AI SYSTEM</h1>
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
  <div className="flex-1 overflow-y-auto space-y-6 mb-4 p-4 border border-zinc-800/80 rounded-2xl">
    
    {currentView === 'chat' && (
      <>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center mt-12">
  <span className="text-3xl mb-3 opacity-50">⚡</span>
  <p className="text-zinc-500 text-xs max-w-sm leading-relaxed">
    Workspace Initialized. Active System Engine: <strong className="text-cyan-400 font-mono font-semibold">{activeModel}</strong>. 
    Upload a text or code document or type a query below to prompt the neural model.
  </p>
</div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md leading-relaxed ${
              m.role === 'user'
                ? 'bg-zinc-900 border border-zinc-700/50 text-zinc-100 font-medium'
                : 'bg-zinc-950 border border-cyan-950/60 text-zinc-300 shadow-[0_0_15px_rgba(0,0,0,0.4)]'
            }`}>
              <div className="prose prose-invert max-w-none font-sans text-sm md:text-base text-zinc-300">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </>
    )}

    {/* PROJECTS VIEW CONTAINER */}
    {currentView === 'projects' && (
      <div className="flex flex-col h-full text-zinc-200 p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">📁 Projects Workspace</h2>
          <p className="text-xs text-zinc-500 mt-1">Manage, organize, and view your uploaded data modules.</p>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl p-8 bg-zinc-900/20 text-center">
          <span className="text-2xl opacity-40 mb-2">📁</span>
          <p className="text-xs text-zinc-400">No active projects found</p>
          <button className="mt-4 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md transition-colors">
            Create New Project
          </button>
        </div>
      </div>
    )}
    {/* EXPLORE GPTS VIEW CONTAINER */}
{currentView === 'explore' && (
  <div className="flex flex-col h-full text-zinc-200 p-4">
    
    {/* Layout Header with Close Button */}
    <div className="mb-6 flex justify-between items-start">
      <div>
        <h2 className="text-lg font-semibold text-white">🧭 Explore GPTs</h2>
        <p className="text-xs text-zinc-500 mt-1">Discover custom, specialized modules configured for unique technical operations.</p>
      </div>
      <button 
        onClick={() => setCurrentView('chat')}
        className="text-xs font-mono bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white px-3 py-1.5 rounded-lg text-zinc-400 transition-all flex items-center gap-1.5 shadow-md"
      >
        <span>✕</span> Close
      </button>
    </div>

   {/* Models Grid Selector */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-y-auto">
      
      {/* Card 1: Code Wizard */}
      <div 
        onClick={() => {
          setActiveModel('Code Specialist');
          setCurrentView('chat');
        }}
        className="border border-zinc-800/80 bg-zinc-900/10 p-4 rounded-xl hover:border-cyan-800/50 hover:bg-cyan-950/5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div>
          <span className="text-xl block mb-2 group-hover:scale-110 transition-transform w-fit">💻</span>
          <h3 className="text-sm font-semibold text-zinc-100">Code Specialist</h3>
          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">Debug scripts, refactor complex blocks, and build robust system architectures.</p>
        </div>
        <span className="text-[10px] text-cyan-400 font-mono mt-4 block">Activate Agent →</span>
      </div>

      {/* Card 2: Data Analyst */}
      <div 
        onClick={() => {
          setActiveModel('Data Module Analyst');
          setCurrentView('chat');
        }}
        className="border border-zinc-800/80 bg-zinc-900/10 p-4 rounded-xl hover:border-purple-800/50 hover:bg-purple-950/5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div>
          <span className="text-xl block mb-2 group-hover:scale-110 transition-transform w-fit">📊</span>
          <h3 className="text-sm font-semibold text-zinc-100">Data Module Analyst</h3>
          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">Parse CSV files, format structured JSON outputs, and compute mathematical data points.</p>
        </div>
        <span className="text-[10px] text-purple-400 font-mono mt-4 block">Activate Agent →</span>
      </div>

    
      {/* Card 3: System Prompt Architect */}
        <div 
        onClick={() => {
          setActiveModel('Prompt Architect');
          setCurrentView('chat');
        }}
        className="border border-zinc-800/80 bg-zinc-900/10 p-4 rounded-xl hover:border-amber-800/50 hover:bg-amber-950/5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div>
          <span className="text-xl block mb-2 group-hover:scale-110 transition-transform w-fit">⚙️</span>
          <h3 className="text-sm font-semibold text-zinc-100">Prompt Architect</h3>
          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">Optimize engineering rulesets, inject custom system tokens, and refine persona constraints.</p>
        </div>
        <span className="text-[10px] text-amber-400 font-mono mt-4 block">Activate Agent →</span>
      </div>

    </div>
  </div>
)}
  </div>
 {/* CODEX CODE INTERPRETER VIEW CONTAINER */}
{currentView === 'codex' && (
  <div className="flex flex-col h-full text-zinc-200 p-4">
    
    {/* Layout Top Header Row */}
    <div className="mb-6 flex justify-between items-start">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>💻</span> Codex Terminal Playground
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Compile blocks, refactor variables, and run real-time execution routines.</p>
      </div>
      <button 
        onClick={() => setCurrentView('chat')}
        className="text-xs font-mono bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white px-3 py-1.5 rounded-lg text-zinc-400 transition-all flex items-center gap-1.5 shadow-md"
      >
        <span>✕</span> Close
      </button>
    </div>

    {/* Split Screen Workbench Layout */}
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
      
      {/* Left Input: Clean Editor Mockup */}
      <div className="border border-zinc-800 bg-[#070A12]/60 rounded-xl p-4 flex flex-col font-mono text-xs">
        <div className="text-zinc-500 mb-2 border-b border-zinc-800/80 pb-2 flex justify-between items-center">
          <span>📄 main_module.py</span>
          <span className="text-[10px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded">Python 3.10</span>
        </div>
        <textarea 
          placeholder="# Paste or draft your engineering script algorithms here..." 
          className="flex-1 bg-transparent text-zinc-300 outline-none resize-none leading-relaxed placeholder-zinc-700 font-mono text-xs"
        />
        <div className="flex justify-end mt-2">
          <button className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-lg shadow-cyan-950/20">
            <span>▶️</span> EXECUTE CODE
          </button>
        </div>
      </div>

      {/* Right Output: Isolated Sandbox Log */}
      <div className="border border-zinc-800 bg-black/40 rounded-xl p-4 flex flex-col font-mono text-xs">
        <div className="text-zinc-500 mb-2 border-b border-zinc-800/80 pb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SYSTEM_COMPILER_LOG: READY</span>
        </div>
        <div className="flex-1 text-zinc-600 italic select-none flex flex-col items-center justify-center text-center p-4">
          <p className="text-[11px] font-mono not-italic text-zinc-500">No logs generated yet.</p>
          <p className="text-[10px] text-zinc-600 mt-1 max-w-[200px]">Hit execute on your workbench container to process output logs.</p>
        </div>
      </div>

    </div>
  </div>
)} 

      {/* File Attachment Status Indicator */}
  {currentView === 'chat' && fileName && (
    <div className="mb-3 p-2.5 bg-cyan-950/50 border border-cyan-800/50 rounded-xl text-xs text-cyan-200">
      <div className="flex items-center justify-between w-full font-mono">
        <span className="flex items-center gap-2">
          <svg className="text-cyan-400" xmlns="http://w3.org" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          NODE_ATTACHED: <strong className="text-white font-semibold">{fileName}</strong>
        </span>
        <button 
          type="button" 
          onClick={() => { setFileName(''); setAttachedText(''); }} 
          className="text-cyan-400/70 hover:text-red-400 transition-colors flex items-center gap-1 text-[11px]"
        >
          <span>✕</span> Remove
        </button>
      </div>
    </div>
  )}

  {/* User Input Entry Dock */}
  {currentView === 'chat' && (
    <form onSubmit={handleSubmit} className="w-full flex items-center gap-2 bg-[#0E131F]/90 backdrop-blur border border-zinc-800/60 rounded-xl p-2 shadow-xl">
      <label className="cursor-pointer p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 transition-colors flex items-center justify-center">
        <svg xmlns="http://w3.org" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 hover:text-zinc-200 transition-colors"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
 <input 
  id="file-upload-input"
  aria-label="Upload document attachment"
  type="file" 
  accept=".txt,.js,.ts,.tsx,.json,.csv,.md" 
  className="hidden" 
  onChange={handleFileUpload} 
/>
      </label>

      <input 
        type="text"
        value={input}
       onChange={(e) => setInput(e.target.value)}
        placeholder="Prompt or attach file..." 
        className="flex-1 px-2 py-2 text-xs font-mono text-zinc-200 outline-none bg-transparent placeholder-zinc-600" 
      />

      <button 
        type="submit" 
        disabled={loading || (!input.trim() && !attachedText)} 
        className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:hover:bg-zinc-800"
      >
        {loading ? 'RUNNING...' : 'EXECUTE'}
      </button>
    </form>
  )}
      <div ref={messagesEndRef} />
    </div>
  );
}