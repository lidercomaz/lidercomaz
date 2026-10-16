'use client'

/**
 * Counterpart of the current page on the other-language site: categories and static pages
 * share slugs between AZ and RU; a news story maps to its category (stories differ per site).
 */
export function counterpartPath(pathname: string) {
  // During SSR the pathname is the internal one (/az/..., /m/ru/...) set by proxy.ts.
  const p = (pathname || '/').replace(/^\/(?:m\/)?(?:az|ru)(?=\/|$)/, '') || '/'
  if (/^\/search\/?$/.test(p)) return '/search'
  const page = /^\/([a-z0-9-]+)\.html$/.exec(p)
  if (page && !/^\d/.test(page[1])) return p
  const section = /^\/([a-z0-9-]+)(?:\/|$)/.exec(p)
  if (section && !/^\d/.test(section[1])) return `/${section[1]}/`
  return '/'
}

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/** Client hook: counterpart path, resolved after mount so SSR and hydration agree. */
export function useCounterpartPath() {
  const [path, setPath] = useState('/')
  const routerPath = usePathname() // re-run on client-side navigation
  useEffect(() => {
    // A story linked to its translation carries <link rel="alternate" hreflang> (lib/post.ts postMetadata).
    const own = document.documentElement.lang
    const alt = [...document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')].find((l) => l.hreflang !== own)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads window.location, unavailable during SSR
    setPath(alt ? new URL(alt.href).pathname : counterpartPath(window.location.pathname))
  }, [routerPath])
  return path
}
