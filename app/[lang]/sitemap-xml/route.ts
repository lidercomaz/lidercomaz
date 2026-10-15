import { data } from '@/lib/data'
import { categoryMap, postPath } from '@/lib/format'
import { SITE_URL, isLang } from '@/lib/site'

// Dynamic route + CDN cache: a prerendered [lang] route handler is not served on Vercel.
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: RouteContext<'/[lang]/sitemap-xml'>) {
  const { lang } = await params
  if (!isLang(lang)) return new Response(null, { status: 404 })
  const base = SITE_URL[lang]
  const [cats, posts] = await Promise.all([data.categories(lang), data.sitemap(lang)])
  const map = categoryMap(cats)
  const urls = [
    `<url><loc>${base}/</loc><changefreq>hourly</changefreq></url>`,
    ...cats.map((c) => `<url><loc>${base}/${c.slug}/</loc><changefreq>hourly</changefreq></url>`),
    ...posts.map((p) => `<url><loc>${base}${postPath(p, map)}</loc><lastmod>${p.published_at}</lastmod></url>`),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
