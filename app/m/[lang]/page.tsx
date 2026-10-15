import { notFound } from 'next/navigation'
import { LoadMore } from '@/components/LoadMore'
import { MPostItem } from '@/components/m/MPostItem'
import { MSlider } from '@/components/m/MSlider'
import { data } from '@/lib/data'
import { categoryMap, formatDotted, postPath } from '@/lib/format'
import { SITE, isLang } from '@/lib/site'

export const revalidate = 60

const PAGE_SIZE = 12

export default async function MobileHome({ params }: PageProps<'/m/[lang]'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const t = SITE[lang]

  const [cats, slides, feed] = await Promise.all([
    data.categories(lang),
    data.feed(lang, { limit: 12, categoryId: t.m.sliderCategoryId }),
    data.feed(lang, { limit: PAGE_SIZE }),
  ])
  const map = categoryMap(cats)

  return (
    <>
      <MSlider
        posts={[...slides.filter((p) => p.image), ...slides.filter((p) => !p.image)].slice(0, 5).map((p) => ({
          ...p,
          href: postPath(p, map),
          date: formatDotted(p.published_at),
          categoryName: map.get(p.category_ids[0])?.name ?? '',
        }))}
      />
      <div className="posts last">
        <div className="p-title"><h2>{t.m.latestTitle}</h2></div>
        <div className="posts-wrap infinity">
          {feed.map((p) => (
            <MPostItem key={p.id} post={{ ...p, href: postPath(p, map) }} />
          ))}
          <LoadMore label={t.loadMore} offset={feed.length} pageSize={10} variant="m" />
        </div>
      </div>
    </>
  )
}
