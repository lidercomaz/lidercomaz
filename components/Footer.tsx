import Link from 'next/link'
import { SITE } from '@/lib/site'
import type { Lang } from '@/lib/types'

/** Site footer: sections, site pages, contacts, legal links (desktop and mobile). */
export function Footer({ lang }: { lang: Lang }) {
  const t = SITE[lang]
  const f = t.footer
  const sections = [...t.mainMenu.slice(1), ...t.otherMenu]
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="centered">
        <div className="f-top">
          <div>
            <Link href="/" className="f-logo"><img src="/theme/images/logo.png" alt={t.title} /></Link>
            <p className="f-about">{f.about}</p>
          </div>
          <div>
            <h4>{f.sectionsTitle}</h4>
            <ul className="f-cols">
              {sections.map((m) => (
                <li key={m.href}><Link href={m.href}>{m.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>{f.siteTitle}</h4>
            <ul>
              {f.siteLinks.map((m) => (
                <li key={m.href}><Link href={m.href} prefetch={!m.href.endsWith('.xml')}>{m.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>{f.contactTitle}</h4>
            <ul className="f-contact">
              {t.footerInfo.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="f-bottom">
          <div>
            © 2023-{year} Lider.com.az. {f.copyright}
            <br />
            {f.citation}
          </div>
          <div className="f-legal">
            {f.legal.map((m) => (
              <Link key={m.href} href={m.href}>{m.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
