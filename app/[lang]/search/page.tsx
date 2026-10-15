import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ContentPage } from '@/components/ContentPage'
import { LoadMore } from '@/components/LoadMore'
import { NewsItem } from '@/components/NewsItem'
import { data } from '@/lib/data'
import { categoryMap, postPath } from '@/lib/format'
import { SITE, isLang } from '@/lib/site'

const PAGE_SIZE = 20

export async function generateMetadata({ params }: PageProps<'/[lang]/search'>): Promise<Metadata> {
  const { lang } = await params
  return isLang(lang) ? { title: SITE[lang].searchTitle, robots: { index: false } } : {}
}

export default async function SearchPage({ params, searchParams }: PageProps<'/[lang]/search'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const t = SITE[lang]
  const raw = (await searchParams).q
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? ''

  const [cats, posts] = await Promise.all([
    data.categories(lang),
    q.length >= 2 ? data.search(lang, q, PAGE_SIZE, 0) : Promise.resolve([]),
  ])
  const map = categoryMap(cats)

  return (
    <ContentPage lang={lang}>
      <div className="search-page">
        <h1>{t.searchTitle}{q && `: «${q}»`}</h1>
        {posts.length === 0 && <p>{t.searchEmpty}</p>}
      </div>
      <div id="dle-content">
        {posts.map((p) => (
          <NewsItem key={p.id} post={{ ...p, href: postPath(p, map) }} />
        ))}
        {posts.length === PAGE_SIZE && <LoadMore label={t.loadMore} offset={PAGE_SIZE} pageSize={PAGE_SIZE} query={q} />}
      </div>
    </ContentPage>
  )
}
