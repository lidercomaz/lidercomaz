import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

/** Service-role client: bypasses RLS. Only ever used in authorized admin route handlers. */
export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  return (client ??= createClient(url, key, { auth: { persistSession: false } }))
}
