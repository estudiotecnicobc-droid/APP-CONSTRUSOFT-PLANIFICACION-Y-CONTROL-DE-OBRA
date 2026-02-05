
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: any = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("⚠️ Supabase credentials not found. Auth and RLS features will use fallback mock mode.");
  // Create a dummy client to prevent crashes on initial load
  supabaseInstance = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: null, error: { message: "Supabase not configured" } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) })
    })
  };
}

export const supabase = supabaseInstance;
