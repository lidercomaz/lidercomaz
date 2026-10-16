'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SITE_URL } from '@/lib/site'
import { api } from './api'

const LINKS = [
  { href: '/admin', label: 'Xəbərlər' },
  { href: '/admin/new', label: '+ Yeni xəbər' },
  { href: '/admin/sources', label: 'Mənbələr (bot)' },
  { href: '/admin/bot', label: 'API' },
]

export function AdminNav() {
  const path = usePathname()
  const router = useRouter()
  async function logout() {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {})
    router.replace('/admin/login')
    router.refresh()
  }
  return (
    <header className="adm-top">
      <Link href="/admin"><img src="/theme/images/logo.png" alt="Lider" /></Link>
      <nav>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? 'active' : undefined}>{l.label}</Link>
        ))}
      </nav>
      <div className="sites">
        <a href={SITE_URL.az} target="_blank" rel="noopener">lider.com.az ↗</a>
        <a href={SITE_URL.ru} target="_blank" rel="noopener">ru.lider.com.az ↗</a>
      </div>
      <button className="btn small ghost" style={{ color: '#fff' }} onClick={logout}>Çıxış</button>
    </header>
  )
}
