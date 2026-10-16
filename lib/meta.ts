import type { Metadata } from 'next'
import { SITE, SITE_URL } from './site'
import type { Lang } from './types'

export function siteMetadata(lang: Lang): Metadata {
  const t = SITE[lang]
  return {
    metadataBase: new URL(SITE_URL[lang]),
    title: { default: t.title, template: `%s » ${t.title}` },
    description: t.description,
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '48x48' },
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
        { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
      ],
      apple: '/apple-touch-icon.png',
    },
    alternates: { types: { 'application/rss+xml': '/rss.xml' } },
    formatDetection: { telephone: false },
    // Default preview for pages without their own picture (posts set their own image).
    openGraph: { siteName: t.title, type: 'website', locale: lang === 'ru' ? 'ru_RU' : 'az_AZ', images: ['/theme/images/logo.png'] },
    twitter: { card: 'summary_large_image' },
  }
}
