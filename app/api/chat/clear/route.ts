import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Securely load the administrative service key inside our private backend function
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function POST() {
  try {
    // Execute global target row cleanup bypassing RLS safety locks cleanly
    const { error } = await adminSupabase
      .from('chat_history')
      .delete()
      .filter('id', 'not.is', null);

    if (error) {
      console.error('Supabase internal admin clear error:', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}