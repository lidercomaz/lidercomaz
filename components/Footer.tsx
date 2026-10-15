import Link from 'next/link'
import { SITE } from '@/lib/site'
import type { Lang } from '@/lib/types'

/** footer.tpl */
export function Footer({ lang }: { lang: Lang }) {
  const t = SITE[lang]
  return (
    <footer className="footer">
      <div className="centered">
        <div id="dis_bolme">
          <div className="ic_bolme">
            {t.footerInfo.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <div className="ic_bolme1">
            <div className="footer-menu">
              <ul>
                {t.footerMenu.map((m) => (
                  <li key={m.href}><Link href={m.href}>{m.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
