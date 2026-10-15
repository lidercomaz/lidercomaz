import type { ReactNode } from 'react'
import type { Lang } from '@/lib/types'
import { Sidebar } from './Sidebar'

/** main.tpl inner pages: content left, feed sidebar right. */
export function ContentPage({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <section className="page full-post">
      <div className="page-wrap">
        <div className="page-left">{children}</div>
        <Sidebar lang={lang} />
      </div>
    </section>
  )
}
