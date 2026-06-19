'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        // Handle User Sign Up Creation
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Registration successful! Check your email for a verification link.');
      } else {
        // Handle User Login Authentication
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/'); // Forward directly into the AI interface
      }
   } catch (err) {
  const errorObject = err as Error;
  setMessage(errorObject.message || 'Authentication failed.');
}
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-zinc-100 px-4">
      <div className="w-full max-w-md p-8 border border-zinc-800 bg-[#0c0c0e] rounded-2xl shadow-xl">
        
        {/* Animated Cyber Header Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.5)] mb-3" />
          <h2 className="text-lg font-mono font-bold tracking-widest uppercase text-cyan-400">
            {isSignUp ? 'REGISTER_NODE' : 'ACCESS_GATE'}
          </h2>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">User Identity Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg outline-none focus:border-cyan-500/40 text-sm font-mono"
              placeholder="operator@domain.com"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">Access Passphrase</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg outline-none focus:border-cyan-500/40 text-sm font-mono"
              placeholder="••••••••••••"
              disabled={loading}
              required
            />
          </div>

          {message && (
            <p className="text-xs font-mono text-center p-2 bg-zinc-900 rounded-lg text-zinc-400 border border-zinc-800">
              {message}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-zinc-100 text-zinc-950 text-xs font-mono font-bold py-2.5 rounded-lg hover:bg-zinc-200 transition active:scale-95 disabled:opacity-30"
          >
            {loading ? 'PROCESSING...' : isSignUp ? 'INITIALIZE USER' : 'AUTHENTICATE'}
          </button>
        </form>

        {/* Toggle between Login and Register accounts */}
        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-mono text-zinc-500 hover:text-cyan-400 transition"
          >
            {isSignUp ? '■ Already registered? Access terminal' : '◆ Request new operator clearance'}
          </button>
        </div>

      </div>
    </div>
  );
}