import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

/** Vercel Web Analytics + Speed Insights, and Google Analytics 4 when NEXT_PUBLIC_GA_ID is set. */
export function SiteAnalytics() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
      {GA_ID && /^G-[A-Z0-9]+$/.test(GA_ID) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
    </>
  )
}
