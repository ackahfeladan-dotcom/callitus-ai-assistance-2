import { supabase } from '@/app/supabase';

export async function POST() {
  try {
    // Execute global target row cleanup using your working client config
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