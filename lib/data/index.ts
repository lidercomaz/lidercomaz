import { unstable_cache } from 'next/cache'
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

/** Cache tags; writes in the admin panel / bot call revalidateTag on them (lib/admin/posts.ts). */
export const TAGS = { posts: 'posts', categories: 'categories', pages: 'pages' } as const

/**
 * Supabase reads go through the shared Next.js data cache, so pages that render again (ISR, many
 * visitors, crawlers) reuse one query result instead of hitting the database — this keeps Supabase
 * egress far inside the free plan. Content changes reach the site through revalidateTag.
 */
function cached<A extends unknown[], R>(name: string, fn: (...args: A) => Promise<R>, revalidate: number, tags: string[]) {
  return unstable_cache(fn, ['data', name], { revalidate, tags })
}

const s = supabaseSource
const cachedSource: DataSource = {
  categories: cached('categories', s.categories, 86400, [TAGS.categories]),
  feed: cached('feed', s.feed, 600, [TAGS.posts]),
  popular: cached('popular', s.popular, 1800, [TAGS.posts]),
  post: cached('post', s.post, 3600, [TAGS.posts]),
  search: cached('search', s.search, 600, [TAGS.posts]),
  page: cached('page', s.page, 86400, [TAGS.pages]),
  sitemap: cached('sitemap', s.sitemap, 3600, [TAGS.posts]),
  translation: cached('translation', s.translation, 3600, [TAGS.posts]),
  incrementViews: s.incrementViews,
}

export const data: DataSource = hasSupabase ? cachedSource : localSource
