import { notFound } from 'next/navigation'
import { LoadMore } from '@/components/LoadMore'
import { MainSlider } from '@/components/MainSlider'
import { NewsItem } from '@/components/NewsItem'
import { PostTitle } from '@/components/PostTitle'
import { data } from '@/lib/data'
import { NO_IMAGE, categoryMap, formatDate, postPath } from '@/lib/format'
import { SITE, isLang } from '@/lib/site'

export const revalidate = 60

const PAGE_SIZE = 10

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const t = SITE[lang]

  const [cats, latest, feed] = await Promise.all([
    data.categories(lang),
    data.feed(lang, { limit: 16 }),
    data.feed(lang, { limit: PAGE_SIZE, mainOnly: true }),
  ])
  const map = categoryMap(cats)
  // Visual blocks (top strip, slider) prefer posts that have a picture.
  const withImage = [...latest.filter((p) => p.image), ...latest.filter((p) => !p.image)]
  const withHref = <T extends Parameters<typeof postPath>[0]>(p: T) => ({ ...p, href: postPath(p, map) })

  return (
    <>
      {/* ust.tpl */}
      <section className="top-news">
        <div className="top-news-wrap">
          {withImage.slice(0, 5).map((p) => (
            <div key={p.id} className="top-news-item">
              <a href={postPath(p, map)}>
                <div className="top-news-item-a">
                  <div className="top-news-image">
                    <img src={p.image ?? NO_IMAGE} alt="" style={{ height: 150 }} />
                    <h2 className="top-news-title"><PostTitle post={p} /></h2>
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="site-top">
        <MainSlider
          posts={withImage.slice(0, 4).map((p) => ({ ...withHref(p), date: formatDate(p.published_at, lang) }))}
          readMore={t.readMore}
        />
        {/* ozel.tpl */}
        <div className="a-posts">
          <h2 className="at-title">{t.feedTitle}</h2>
          <div className="a-posts-wrap">
            <div className="scrl">
              {latest.slice(0, 8).map((p) => (
                <div key={p.id} className="a-post-item">
                  <a href={postPath(p, map)}>
                    <div className="a-post-image"><img src={p.image ?? NO_IMAGE} alt="" /></div>
                    <div className="a-post-info">
                      <div className="a-post-b"><h2 className="a-post-title">{p.title}</h2></div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="news-block fxd">
        <div className="news-block-wrap infinite">
          {feed.map((p) => (
            <NewsItem key={p.id} post={withHref(p)} />
          ))}
          <LoadMore label={t.loadMore} offset={feed.length} pageSize={PAGE_SIZE} />
        </div>
      </section>
    </>
  )
}
