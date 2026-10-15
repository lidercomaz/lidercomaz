import { NextResponse, type NextRequest } from 'next/server'
import { isMobileUA, langFromHost } from './lib/request'

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone()
  const host = req.headers.get('host') ?? ''

  // www.lider.com.az → lider.com.az (one canonical host for SEO)
  if (host.startsWith('www.')) {
    url.host = host.slice(4)
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  const lang = langFromHost(host)

  // Legacy DLE urls (old .htaccess) → new pages
  if (url.pathname === '/index.php') {
    const story = url.searchParams.get('story')
    if (story) return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(story)}`, url), 301)
    const newsid = url.searchParams.get('newsid')
    if (newsid && /^\d+$/.test(newsid)) return rewriteTo(url, `/${lang}/go/${newsid}`)
    return NextResponse.redirect(new URL('/', url), 301)
  }
  // /123-slug.html, /cat/page,2,123-slug.html, /page,1,2,123-slug.html, print:page,...
  const legacy = /^\/(?:[^/]+\/)?(?:print:)?(?:page,\d+,(?:\d+,)?)?(\d+)-[^/]*\.html$/.exec(url.pathname)
  if (legacy && !/^\/[^/]+\/\d+-[^/]*\.html$/.test(url.pathname)) return rewriteTo(url, `/${lang}/go/${legacy[1]}`)
  // /page/2/, /lastnews/, /2026/10/15/ archives → home
  if (/^\/(page\/\d+|lastnews|newposts|\d{4}(\/\d{2}){0,2}(\/page\/\d+)?)\/?$/.test(url.pathname)) {
    return NextResponse.redirect(new URL('/', url), 301)
  }

  // "sitemap.xml" is a reserved Next.js file name, so the route lives at /[lang]/sitemap-xml.
  const path = url.pathname === '/sitemap.xml' ? '/sitemap-xml' : url.pathname
  // Phones get the smartphone template (app/m/...) on the same public url.
  const mobile = isMobileUA(req.headers.get('user-agent')) && !path.startsWith('/sitemap-xml') && !/^\/(rss\.xml|robots\.txt)$/.test(path)
  url.pathname = `${mobile ? '/m' : ''}/${lang}${path === '/' ? '' : path}`
  return NextResponse.rewrite(url)
}

function rewriteTo(url: URL, pathname: string) {
  const target = new URL(url)
  target.pathname = pathname
  target.search = ''
  return NextResponse.rewrite(target)
}

export const config = {
  matcher: ['/((?!_next/|api/|img/|theme/|theme-m/|favicon.ico).*)'],
}
