import type { Metadata, Viewport } from 'next'
import './admin.css'

export const metadata: Metadata = {
  title: { default: 'İdarəetmə paneli', template: '%s · Lider admin' },
  robots: { index: false, follow: false },
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function AdminRootLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  )
}
