import { SITE_URL, isLang } from '@/lib/site'

export async function GET(_: Request, { params }: RouteContext<'/[lang]/robots.txt'>) {
  const { lang } = await params
  if (!isLang(lang)) return new Response(null, { status: 404 })
  const body = `User-agent: *\nDisallow: /search\nDisallow: /api/\nSitemap: ${SITE_URL[lang]}/sitemap.xml\n`
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } })
}
