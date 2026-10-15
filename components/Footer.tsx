import Link from 'next/link'
import { SITE, SOCIAL } from '@/lib/site'
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
            <div className="f-social">
              <a href={SOCIAL.facebook} target="_blank" rel="noopener" aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8h3.3z" /></svg>
              </a>
              <a href={SOCIAL.instagram} target="_blank" rel="noopener" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
              </a>
              <a href={SOCIAL.youtube} target="_blank" rel="noopener" aria-label="YouTube">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z" /></svg>
              </a>
            </div>
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
              {f.legal.map((m) => (
                <li key={m.href}><Link href={m.href}>{m.label}</Link></li>
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
            © {year} Lider.com.az. {f.copyright}
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
