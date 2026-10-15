import { NO_IMAGE, formatDotted } from '@/lib/format'
import { PostTitle } from '../PostTitle'
import type { CardWithHref } from '../NewsItem'

/** smartphone/news.tpl */
export function MPostItem({ post }: { post: CardWithHref }) {
  return (
    <div className="post">
      <div className="post-wr">
        <a href={post.href}>
          <div className="post-image">
            <img src={post.image ?? NO_IMAGE} height={210} alt="" loading="lazy" />
            <div className="a-post-date">{formatDotted(post.published_at)}</div>
          </div>
          <div className="post-info">
            <h2 className="post-title"><PostTitle post={post} /></h2>
          </div>
        </a>
      </div>
    </div>
  )
}
