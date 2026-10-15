import type { DataSource } from '../types'
import { localSource } from './local'
import { supabaseSource } from './supabase'

export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// The .data/ JSON export exists only on a developer machine; deployments must use Supabase.
if (!hasSupabase && process.env.VERCEL) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Add them in Vercel → Project → Settings → Environment Variables (Production + Preview), then redeploy.',
  )
}

export const data: DataSource = hasSupabase ? supabaseSource : localSource
