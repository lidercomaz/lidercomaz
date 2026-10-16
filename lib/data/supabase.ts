import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DataSource, Post, PostCard } from '../types'

const CARD = 'id,slug,title,title_extra,is_red,image,category_ids,published_at,views'

let client: SupabaseClient | undefined
const sb = () =>
  (client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  }))

function must<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(`Supabase: ${error.message}`)
  return data as T
}

export const supabaseSource: DataSource = {
  async categories(lang) {
    return must(
      await sb().from('categories').select('id,name,slug,position,description').eq('lang', lang).order('position').order('id'),
    )
  },
  async feed(lang, { limit, offset = 0, categoryId, mainOnly }) {
    let q = sb().from('posts').select(CARD).eq('lang', lang)
    if (categoryId) q = q.contains('category_ids', [categoryId])
    if (mainOnly) q = q.eq('show_on_main', true)
    return must<PostCard[]>(await q.order('published_at', { ascending: false }).range(offset, offset + limit - 1))
  },
  async popular(lang, days, limit) {
    const since = new Date(Date.now() - days * 864e5).toISOString()
    return must<PostCard[]>(
      await sb().from('posts').select(CARD).eq('lang', lang).gte('published_at', since)
        .order('views', { ascending: false }).limit(limit),
    )
  },
  async post(lang, id) {
    return must<Post | null>(
      await sb().from('posts').select(`${CARD},excerpt,body,author,keywords`).eq('lang', lang).eq('id', id).maybeSingle(),
    )
  },
  async search(lang, q, limit, offset) {
    return must<PostCard[]>(await sb().rpc('search_posts', { p_lang: lang, p_q: q, p_limit: limit, p_offset: offset }))
  },
  async page(lang, slug) {
    return must(await sb().from('pages').select('slug,title,body').eq('lang', lang).eq('slug', slug).maybeSingle())
  },
  async sitemap(lang) {
    const rows: Awaited<ReturnType<DataSource['sitemap']>> = []
    for (let from = 0; ; from += 1000) {
      const chunk = must<typeof rows>(
        await sb().from('posts').select('id,slug,category_ids,published_at').eq('lang', lang)
          .order('published_at', { ascending: false }).range(from, from + 999),
      )
      rows.push(...chunk)
      if (chunk.length < 1000) return rows
    }
  },
  async incrementViews(lang, id) {
    must(await sb().rpc('increment_views', { p_lang: lang, p_id: id }))
  },
  async translation(lang, id) {
    // `group_id` arrives with supabase/migrations/001_admin.sql; before that there are no links.
    const { data: row, error } = await sb().from('posts').select('group_id').eq('lang', lang).eq('id', id).maybeSingle()
    if (error || !row?.group_id) return null
    return must<Pick<PostCard, 'id' | 'slug' | 'category_ids'> | null>(
      await sb().from('posts').select('id,slug,category_ids').eq('lang', lang === 'az' ? 'ru' : 'az')
        .eq('group_id', row.group_id).limit(1).maybeSingle(),
    )
  },
}
