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
    // Default preview for pages without their own picture (posts set their own image).
    openGraph: { siteName: t.title, type: 'website', locale: lang === 'ru' ? 'ru_RU' : 'az_AZ', images: ['/theme/images/logo.png'] },
    twitter: { card: 'summary_large_image' },
  }
}
