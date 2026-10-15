import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { preload } from 'react-dom'
import { Footer } from '@/components/Footer'
import { MHeader } from '@/components/m/MHeader'
import { SiteAnalytics } from '@/components/SiteAnalytics'
import { siteMetadata } from '@/lib/meta'
import { LANGS, SITE, isLang } from '@/lib/site'

// Smartphone template (DLE templates/smartphone). proxy.ts rewrites phone requests here.
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: LayoutProps<'/m/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  return isLang(lang) ? siteMetadata(lang) : {}
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const FONTS = ['/theme-m/fonts/subset-Montserrat-Regular.woff2', '/theme-m/fonts/subset-Montserrat-Medium.woff2']

const CSS = ['/theme-m/css/style.css', '/theme-m/css/responsive.css', '/theme-m/css/custom.css', '/theme/css/footer.css']

export default async function MobileLayout({ children, params }: LayoutProps<'/m/[lang]'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  for (const href of FONTS) preload(href, { as: 'font', type: 'font/woff2', crossOrigin: '' })

  return (
    <html lang={SITE[lang].htmlLang}>
      <head>
        {CSS.map((f) => (
          <link key={f} rel="stylesheet" href={f} precedence="default" />
        ))}
      </head>
      <body>
        <div className="xsayt">
          <MHeader lang={lang} />
          <div id="site_content">
            <div className="homepage">{children}</div>
          </div>
          <Footer lang={lang} />
        </div>
        <SiteAnalytics />
      </body>
    </html>
  )
}
