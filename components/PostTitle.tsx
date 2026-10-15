import type { PostCard } from '@/lib/types'

/** DLE xfields: "qirmizi" paints the whole title red, "red" appends a red suffix. */
export function PostTitle({ post }: { post: Pick<PostCard, 'title' | 'title_extra' | 'is_red'> }) {
  if (post.is_red) return <span className="red-title">{post.title}</span>
  return (
    <>
      {post.title}
      {post.title_extra && <span className="red-title"> {post.title_extra}</span>}
    </>
  )
}
