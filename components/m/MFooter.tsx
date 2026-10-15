import { SITE } from '@/lib/site'
import type { Lang } from '@/lib/types'

export function MFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="footer">
      <div className="footer-bottom">
        <div className="cp">
          <p>
            {SITE[lang].footerInfo.map((line) => (
              <span key={line}><br />{line}</span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  )
}
