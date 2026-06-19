import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize a privileged direct database connection
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST() {
  try {
    // Execute an unconditional direct cloud truncate via table targeting
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .filter('id', 'not.is', null);

    if (error) {
      console.error('Supabase internal clear error:', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}