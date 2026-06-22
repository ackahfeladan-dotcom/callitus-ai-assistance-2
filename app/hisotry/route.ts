import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // Queries your chat sessions table (assumes your table name is 'chats')
    const { data: chats, error } = await supabase
      .from('chats')
      .select('id, title')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return Response.json(chats);
  } catch (error) {
    console.error('Sidebar history fetch error:', error);
    return Response.json({ error: 'Failed to fetch history list' }, { status: 500 });
  }
}