'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SITE, SITE_URL, SOCIAL } from '@/lib/site'
import type { Lang } from '@/lib/types'

/** header.tpl */
export function Header({ lang }: { lang: Lang }) {
  const t = SITE[lang]
  const [open, setOpen] = useState(false)
  const other: Lang = lang === 'az' ? 'ru' : 'az'

  useEffect(() => {
    document.body.classList.toggle('mobil-open', open)
  }, [open])

  return (
    <header className="header">
      <div className="header-top">
        <div className="centered">
          <div className="header-top-left">
            <div className="h-menu">
              <ul>
                {t.topMenu.map((m) => (
                  <li key={m.href}><Link href={m.href}>{m.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="header-top-right">
            <div className="language">
              <ul>
                <li><a href={`${SITE_URL.az}/`}>AZ</a></li>
                <li><a href={`${SITE_URL.ru}/`}>RU</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="header-m">
        <div className="centered">
          <div className="header-m-left">
            <div className="mobil-menu" onClick={() => setOpen(true)} />
            <div className="logo">
              <Link href="/"><img src="/theme/images/logo.png" alt={t.title} /></Link>
            </div>
          </div>
          <div className="header-m-right">
            <div className="mobil-language">
              <a href={`${SITE_URL[other]}/`}>{other.toUpperCase()}</a>
            </div>
            <div className="x-b">
              <div className="search">
                <form className="droptopbar" id="q_search" action="/search" method="get">
                  <div className="wrp">
                    <div className="q_search">
                      <input id="story" name="q" placeholder={t.searchPlaceholder} type="search" style={{ marginTop: 22, height: 20 }} />
                      <button className="btn btn_border" type="submit" title={t.searchButton}>
                        <b className="ultrabold">{t.searchButton}</b>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="header-bottom">
        <div className="centered">
          <nav className={`top-menu${open ? ' open' : ''}`}>
            <div className="mobil-menu-close" onClick={() => setOpen(false)} />
            <div className="top-menu-wrap">
              <ul>
                {t.mainMenu.map((m) => (
                  <li key={m.href}><Link href={m.href}>{m.label}</Link></li>
                ))}
                <li className="has-sub">
                  <a role="button" tabIndex={0}>{t.otherLabel}</a>
                  <div className="sub-menu">
                    <ul>
                      {t.otherMenu.map((m) => (
                        <li key={m.href}><Link href={m.href}>{m.label}</Link></li>
                      ))}
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
            <div className="h-social">
              <ul>
                <li className="facebook"><a href={SOCIAL.facebook} target="_blank" rel="noopener" aria-label="Facebook" /></li>
                <li className="instagram"><a href={SOCIAL.instagram} target="_blank" rel="noopener" aria-label="Instagram" /></li>
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
