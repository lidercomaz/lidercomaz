import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LANGS, SITE, SITE_URL, isLang } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

const CSS = ['engine', 'fonts', 'responsive', 'styles', 'custom']

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()

  return (
    <html lang={SITE[lang].htmlLang}>
      <head>
        {CSS.map((f) => (
          <link key={f} rel="stylesheet" href={`/theme/css/${f}.css`} precedence="default" />
        ))}
      </head>
      <body>
        <div className="xsayt">
          {SITE[lang].adPlaceholder && <div className="ad-placeholder">{SITE[lang].adPlaceholder}</div>}
          <Header lang={lang} />
          <div className="container">
            <div className="centered">
              <div id="site_content">
                <section className="site-a">{children}</section>
              </div>
            </div>
          </div>
          <Footer lang={lang} />
        </div>
      </body>
    </html>
  )
}
