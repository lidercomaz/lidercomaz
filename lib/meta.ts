import type { Metadata } from 'next'
import { SITE, SITE_URL } from './site'
import type { Lang } from './types'

export function siteMetadata(lang: Lang): Metadata {
  const t = SITE[lang]
  return {
    metadataBase: new URL(SITE_URL[lang]),
    title: { default: t.title, template: `%s » ${t.title}` },
    description: t.description,
    icons: { icon: '/favicon.ico', apple: '/theme/images/touch-icon-ipad-retina.png' },
    alternates: { types: { 'application/rss+xml': '/rss.xml' } },
    formatDetection: { telephone: false },
  }
}
