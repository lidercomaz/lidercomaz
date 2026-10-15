import type { NextRequest } from 'next/server'
import { data } from '@/lib/data'
import { categoryMap, postPath } from '@/lib/format'
import { langFromHost } from '@/lib/request'

export async function GET(req: NextRequest) {
  const lang = langFromHost(req.headers.get('host'))
  const sp = req.nextUrl.searchParams
  const offset = Math.max(0, Number(sp.get('offset')) || 0)
  const limit = Math.min(30, Math.max(1, Number(sp.get('limit')) || 10))
  const categoryId = Number(sp.get('category')) || undefined
  const q = sp.get('q')?.trim().slice(0, 100)

  const [cats, posts] = await Promise.all([
    data.categories(lang),
    q ? data.search(lang, q, limit, offset) : data.feed(lang, { limit, offset, categoryId, mainOnly: !categoryId }),
  ])
  const map = categoryMap(cats)
  return Response.json(posts.map((p) => ({ ...p, href: postPath(p, map) })), {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
