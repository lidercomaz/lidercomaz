import { NextResponse, type NextRequest } from 'next/server'
import { isMobileUA, langFromHost } from './lib/request'

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone()

  // Legacy DLE links: /index.php?newsid=123 and /index.php?do=search&story=...
  if (url.pathname === '/index.php') {
    const story = url.searchParams.get('story')
    if (story) return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(story)}`, url), 301)
  }

  const lang = langFromHost(req.headers.get('host'))
  // "sitemap.xml" is a reserved Next.js file name, so the route lives at /[lang]/sitemap-xml.
  const path = url.pathname === '/sitemap.xml' ? '/sitemap-xml' : url.pathname
  // Phones get the smartphone template (app/m/...) on the same public url.
  const mobile = isMobileUA(req.headers.get('user-agent')) && !path.startsWith('/sitemap-xml') && !/^\/(rss\.xml|robots\.txt)$/.test(path)
  url.pathname = `${mobile ? '/m' : ''}/${lang}${path === '/' ? '' : path}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/|api/|theme/|theme-m/|favicon.ico).*)'],
}
