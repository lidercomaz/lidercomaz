'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCounterpartPath } from '@/lib/lang-switch'
import { SITE, SITE_URL, SOCIAL } from '@/lib/site'
import type { Lang } from '@/lib/types'

/** smartphone/main.tpl header, slide-out menu and search panel */
export function MHeader({ lang }: { lang: Lang }) {
  const t = SITE[lang]
  const [panel, setPanel] = useState<'menu' | 'search' | null>(null)
  const path = useCounterpartPath()

  useEffect(() => {
    document.body.classList.toggle('mobil-open', panel === 'menu')
    document.body.classList.toggle('mobil-search', panel === 'search')
  }, [panel])

  const close = () => setPanel(null)

  return (
    <>
      <header className="header">
        <div className="header-wrap">
          <div className="logo">
            <Link href="/"><img src="/theme-m/images/logo.png" height={32} alt={t.title} /></Link>
          </div>
          <div className="header-right">
            <div className="search-b" onClick={() => setPanel('search')} />
            <div className="menu-b" onClick={() => setPanel('menu')} />
          </div>
        </div>
      </header>

      <div className="mobile-fixed" onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="menu-panel">
          <div className="menu-a">
            <div className="m-lang">
              <a href={lang === 'az' ? path : `${SITE_URL.az}${path}`} className={lang === 'az' ? 'active' : undefined}>AZ</a>
              <a href={lang === 'ru' ? path : `${SITE_URL.ru}${path}`} className={lang === 'ru' ? 'active' : undefined}>RU</a>
            </div>
            <div className="menu-top">
              <div className="m-social">
                <ul>
                  <li className="fb"><a href={SOCIAL.facebook} target="_blank" rel="noopener" aria-label="Facebook" /></li>
                  <li className="tw"><a href={SOCIAL.twitter} target="_blank" rel="noopener" aria-label="Twitter" /></li>
                  <li className="ins"><a href={SOCIAL.instagram} target="_blank" rel="noopener" aria-label="Instagram" /></li>
                  <li className="yt"><a href={SOCIAL.youtube} target="_blank" rel="noopener" aria-label="YouTube" /></li>
                </ul>
              </div>
              <div className="menu-panel-close" onClick={close} />
            </div>
            <nav className="top-menu">
              {t.m.menuCols.map((col, i) => (
                <div key={i} className="top-menu-col">
                  <ul>
                    {col.map((m) => (
                      <li key={m.href}><Link href={m.href} onClick={close}>{m.label}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div className="f-menu">
            <ul>
              {t.m.footerMenu.map((m) => (
                <li key={m.href}><Link href={m.href} onClick={close}>{m.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mobile-search">
        <div className="search-close" onClick={close} />
        <form action="/search" method="get" onSubmit={close}>
          <div className="search-wrap">
            <input type="text" placeholder={t.m.searchPlaceholder} name="q" />
            <button type="submit" aria-label={t.searchButton} />
          </div>
        </form>
      </div>
    </>
  )
}
