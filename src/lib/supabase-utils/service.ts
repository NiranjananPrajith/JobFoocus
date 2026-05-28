import { createClient } from '@supabase/supabase-js'

// Direct Supabase client using service role key — bypasses RLS entirely.
// For admin operations like trash/restore/permanent-delete only.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}
