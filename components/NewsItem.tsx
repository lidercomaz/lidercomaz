import { NO_IMAGE } from '@/lib/format'
import { PostTitle } from './PostTitle'
import type { PostCard } from '@/lib/types'

export type CardWithHref = PostCard & { href: string }

/** shortstory.tpl */
export function NewsItem({ post }: { post: CardWithHref }) {
  return (
    <div className="news-block-item">
      <div className="nw-wrap" style={{ height: 215 }}>
        {/* Same DOM the browser builds from the original (mis-nested) shortstory.tpl, which the theme CSS targets. */}
        <a href={post.href} title="">
          <div className="news-block-image">
            <img src={post.image ?? NO_IMAGE} alt="" loading="lazy" style={{ height: 148 }} />
          </div>
        </a>
        <div className="news-block-info">
          <a href={post.href} title="">
            <h2 className="news-block-title">
              <PostTitle post={post} />
            </h2>
          </a>
        </div>
      </div>
    </div>
  )
}
