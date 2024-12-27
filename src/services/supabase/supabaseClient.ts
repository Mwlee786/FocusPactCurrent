// src/services/supabase/supabaseClient.ts

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables!');
    throw new Error('Missing Supabase environment variables!');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);