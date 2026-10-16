import { notFound } from 'next/navigation'
import { resolve } from '@/components/CategoryView'
import { ContactSection } from '@/components/ContactSection'
import { LoadMore } from '@/components/LoadMore'
import { data } from '@/lib/data'
import { categoryMap, postPath } from '@/lib/format'
import { SITE, isLang } from '@/lib/site'
import { MPostItem } from './MPostItem'

const PAGE_SIZE = 10

/** smartphone template: category list (shortstory.tpl) or static page (static.tpl). */
export async function renderMobileCategory(lang: string, segment: string, pageNo: number) {
  if (!isLang(lang) || !Number.isInteger(pageNo) || pageNo < 1) notFound()
  const r = await resolve(lang, segment)
  if (!r) notFound()

  if (r.kind === 'page') {
    if (r.page.slug === 'contact') return <div className="post static"><ContactSection lang={lang} title={r.page.title} /></div>
    return (
      <article className="post static">
        <h1 className="title">{r.page.title}</h1>
        <div className="post-cont clrfix" dangerouslySetInnerHTML={{ __html: r.page.body }} />
      </article>
    )
  }

  const map = categoryMap(r.cats)
  const offset = (pageNo - 1) * PAGE_SIZE
  const posts = await data.feed(lang, { limit: PAGE_SIZE, offset, categoryId: r.category.id })
  if (pageNo > 1 && posts.length === 0) notFound()

  return (
    <div className="posts">
      <div className="posts-wrap">
        {posts.map((p) => (
          <MPostItem key={p.id} post={{ ...p, href: postPath(p, map) }} />
        ))}
        <LoadMore label={SITE[lang].loadMore} offset={offset + posts.length} pageSize={PAGE_SIZE} categoryId={r.category.id} variant="m" />
      </div>
    </div>
  )
}
