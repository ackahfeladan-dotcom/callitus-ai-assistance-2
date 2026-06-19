import { createClient } from '@supabase/supabase-js';

// Fallback directly to the public project keys if process variables hide during client-side compilation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bHhqcWFqaHhjb3h2ZGhtdmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDI3OTIsImV4cCI6MjA5NzQxODc5Mn0.v6_zBOqckBhQIHxmXIfJRt1tQeCCTOjnhy0IKSh0msU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);