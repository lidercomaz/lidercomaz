import { data } from '@/lib/data'
import { categoryMap, postPath } from '@/lib/format'
import { SITE, SITE_URL, isLang } from '@/lib/site'

export const dynamic = 'force-dynamic'

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)

export async function GET(_: Request, { params }: RouteContext<'/[lang]/rss.xml'>) {
  const { lang } = await params
  if (!isLang(lang)) return new Response(null, { status: 404 })
  const base = SITE_URL[lang]
  const [cats, posts] = await Promise.all([data.categories(lang), data.feed(lang, { limit: 50 })])
  const map = categoryMap(cats)
  const items = posts
    .map((p) => {
      const link = `${base}${postPath(p, map)}`
      return `<item><title>${esc(p.title)}</title><link>${link}</link><guid>${link}</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate>${p.image ? `<enclosure url="${esc(new URL(p.image, base).href)}" type="${p.image.endsWith('.webp') ? 'image/webp' : 'image/jpeg'}" length="0"/>` : ''}</item>`
    })
    .join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(SITE[lang].title)}</title><link>${base}/</link><description>${esc(SITE[lang].description)}</description><language>${lang}</language>${items}</channel></rss>`
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  })
}
