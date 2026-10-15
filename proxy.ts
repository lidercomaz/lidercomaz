import { NextResponse, type NextRequest } from 'next/server'
import { langFromHost } from './lib/request'

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
  url.pathname = `/${lang}${path === '/' ? '' : path}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/|api/|theme/|favicon.ico).*)'],
}
