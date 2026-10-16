import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { preload } from 'react-dom'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { siteMetadata } from '@/lib/meta'
import { LANGS, SITE, isLang } from '@/lib/site'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  return isLang(lang) ? siteMetadata(lang) : {}
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

const FONTS = ['/theme/fonts/subset-SFProDisplay-Regular.woff2', '/theme/fonts/subset-AlumniSans-SemiBold.woff2']

const CSS = ['engine', 'fonts', 'responsive', 'styles', 'custom', 'enhance', 'footer']

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  for (const href of FONTS) preload(href, { as: 'font', type: 'font/woff2', crossOrigin: '' })

  return (
    <html lang={SITE[lang].htmlLang} translate="no">
      <head>
        <meta name="google" content="notranslate" />
        {CSS.map((f) => (
          <link key={f} rel="stylesheet" href={`/theme/css/${f}.css`} precedence="default" />
        ))}
      </head>
      <body>
        <div className="xsayt">
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
