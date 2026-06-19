import { createClient } from '@supabase/supabase-js';

// Fallback directly to the public project keys if process variables hide during client-side compilation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bHhqcWFqaHhjb3h2ZGhtdmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg4Mzg2MDYsImV4cCI6MjAzNDQxNDYwNn0.8w4W6B8k06V-m44bWfU96B3E9G8Rb93qUD2eILgAxMHBg_dfuPU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);