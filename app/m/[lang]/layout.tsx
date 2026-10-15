import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { MFooter } from '@/components/m/MFooter'
import { MHeader } from '@/components/m/MHeader'
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

const CSS = ['style', 'responsive', 'custom']

export default async function MobileLayout({ children, params }: LayoutProps<'/m/[lang]'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()

  return (
    <html lang={SITE[lang].htmlLang}>
      <head>
        {CSS.map((f) => (
          <link key={f} rel="stylesheet" href={`/theme-m/css/${f}.css`} precedence="default" />
        ))}
      </head>
      <body>
        <div className="xsayt">
          <MHeader lang={lang} />
          <div id="site_content">
            <div className="homepage">{children}</div>
          </div>
          <MFooter lang={lang} />
        </div>
      </body>
    </html>
  )
}
