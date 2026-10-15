import type { DataSource } from '../types'
import { localSource } from './local'
import { supabaseSource } from './supabase'

export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export const data: DataSource = hasSupabase ? supabaseSource : localSource
