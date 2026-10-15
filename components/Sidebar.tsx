import { data } from '@/lib/data'
import { categoryMap, formatTime, postPath } from '@/lib/format'
import { SITE } from '@/lib/site'
import type { Lang, PostCard } from '@/lib/types'
import { PostTitle } from './PostTitle'

function Lent({ posts, href }: { posts: PostCard[]; href: (p: PostCard) => string }) {
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>
          <div className="s-post-item">
            <a href={href(p)}>
              <div className="post-image">{formatTime(p.published_at)}</div>
              <div className="post-info-wrap">
                <div className="post-info">
                  <h2 className="post-title">
                    <div className="h-wr"><PostTitle post={p} /></div>
                  </h2>
                </div>
              </div>
            </a>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** page-right column of main.tpl: latest feed + most read (7 days). */
export async function Sidebar({ lang }: { lang: Lang }) {
  const t = SITE[lang]
  const [cats, latest, popular] = await Promise.all([
    data.categories(lang),
    data.feed(lang, { limit: 14 }),
    data.popular(lang, 7, 4),
  ])
  const map = categoryMap(cats)
  const href = (p: PostCard) => postPath(p, map)

  return (
    <div className="page-right">
      <div className="s-widget">
        <div className="w-title-wrap"><h2 className="w-title">{t.feedTitle}</h2></div>
        <div className="s-posts"><Lent posts={latest} href={href} /></div>
      </div>
      <div className="s-widget">
        <div className="w-title-wrap"><h2 className="w-title">{t.popularTitle}</h2></div>
        <div className="s-posts"><Lent posts={popular} href={href} /></div>
      </div>
    </div>
  )
}
