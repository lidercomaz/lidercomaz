import { data } from '@/lib/data'
import { categoryMap, postPath } from '@/lib/format'
import { isLang } from '@/lib/site'

/** Old DLE links that carry only the news id (see proxy.ts) → 301 to the canonical post url. */
export async function GET(req: Request, { params }: RouteContext<'/[lang]/go/[id]'>) {
  const { lang, id } = await params
  const n = Number(id)
  if (!isLang(lang) || !Number.isInteger(n) || n <= 0) return new Response(null, { status: 404 })
  const [post, cats] = await Promise.all([data.post(lang, n), data.categories(lang)])
  if (!post) return new Response(null, { status: 404 })
  const url = new URL(req.url)
  url.pathname = postPath(post, categoryMap(cats))
  url.search = ''
  return Response.redirect(url, 301)
}
