import { createClient } from '@supabase/supabase-js';

// Fallback directly to the public project keys if process variables hide during client-side compilation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_E9G8Rb93qUD2eILgAxMHBg_dFuPULzu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);