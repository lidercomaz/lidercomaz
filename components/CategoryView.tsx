import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ContentPage } from '@/components/ContentPage'
import { LoadMore } from '@/components/LoadMore'
import { NewsItem } from '@/components/NewsItem'
import { data } from '@/lib/data'
import { categoryMap, postPath } from '@/lib/format'
import { fallbackPage } from '@/lib/pages'
import { SITE, isLang } from '@/lib/site'
import type { Lang } from '@/lib/types'

const PAGE_SIZE = 10

export async function resolve(lang: Lang, segment: string) {
  const slug = decodeURIComponent(segment)
  if (slug.endsWith('.html')) {
    const pageSlug = slug.slice(0, -5)
    const page = (await data.page(lang, pageSlug)) ?? fallbackPage(lang, pageSlug)
    return page ? ({ kind: 'page', page } as const) : null
  }
  const cats = await data.categories(lang)
  const category = cats.find((c) => c.slug === slug)
  return category ? ({ kind: 'category', category, cats } as const) : null
}

export async function categoryMetadata(lang: string, segment: string, pageNo = 1): Promise<Metadata> {
  if (!isLang(lang)) return {}
  const r = await resolve(lang, segment)
  if (!r) return {}
  if (r.kind === 'page') return { title: r.page.title }
  return {
    title: pageNo > 1 ? `${r.category.name} – ${pageNo}` : r.category.name,
    description: r.category.description ?? undefined,
  }
}

/** Shared with /{category}/page/{n}/ (DLE pagination urls). */
export async function renderCategory(lang: string, category: string, pageNo: number) {
  if (!isLang(lang) || !Number.isInteger(pageNo) || pageNo < 1) notFound()
  const r = await resolve(lang, category)
  if (!r) notFound()

  if (r.kind === 'page') {
    return (
      <ContentPage lang={lang}>
        <article className="static-page">
          <h1>{r.page.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: r.page.body }} />
        </article>
      </ContentPage>
    )
  }

  const map = categoryMap(r.cats)
  const offset = (pageNo - 1) * PAGE_SIZE
  const posts = await data.feed(lang, { limit: PAGE_SIZE, offset, categoryId: r.category.id })
  if (pageNo > 1 && posts.length === 0) notFound()

  return (
    <ContentPage lang={lang}>
      <div id="dle-content">
        {posts.map((p) => (
          <NewsItem key={p.id} post={{ ...p, href: postPath(p, map) }} />
        ))}
        <LoadMore label={SITE[lang].loadMore} offset={offset + posts.length} pageSize={PAGE_SIZE} categoryId={r.category.id} />
      </div>
    </ContentPage>
  )
}
