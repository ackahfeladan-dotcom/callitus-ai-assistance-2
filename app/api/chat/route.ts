import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 1. POST: Handles sending a new message to the AI
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: 'You are an advanced, hyper-capable AI assistant specialized in solving complex problems.',
      messages,
    });

    return Response.json({ text: result.text });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to process AI response' }, { status: 500 });
  }
}

// 2. GET: Fetches actual message history for a specific chatId from Supabase
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('id');

    if (!chatId) {
      return Response.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const { data: messages, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return Response.json({ messages });
  } catch (error) {
    console.error('Supabase fetch error:', error);
    return Response.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}