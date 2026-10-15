import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { FontSize } from '@/components/m/FontSize'
import { MPostItem } from '@/components/m/MPostItem'
import { PostTitle } from '@/components/PostTitle'
import { ViewCounter } from '@/components/ViewCounter'
import { data } from '@/lib/data'
import { formatTime, postPath } from '@/lib/format'
import { articleHtml, isCanonical, loadPost, postMetadata } from '@/lib/post'
import { SITE, isLang } from '@/lib/site'

export const revalidate = 300

export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/m/[lang]/[category]/[post]'>): Promise<Metadata> {
  const { lang, post } = await params
  return isLang(lang) ? postMetadata(lang, post) : {}
}

/** smartphone/fullstory.tpl */
export default async function MobilePostPage({ params }: PageProps<'/m/[lang]/[category]/[post]'>) {
  const { lang, category, post: segment } = await params
  if (!isLang(lang)) notFound()
  const r = await loadPost(lang, segment)
  if (!r) notFound()
  const { post, path, cats } = r
  if (!isCanonical(path, category, segment)) permanentRedirect(path)

  const related = r.category
    ? (await data.feed(lang, { limit: 7, categoryId: r.category.id })).filter((p) => p.id !== post.id).slice(0, 6)
    : []
  const d = new Date(post.published_at)
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baku', day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(d)
    .replace(/\//g, '.')

  return (
    <div className="full-post">
      <ViewCounter id={post.id} />
      <div className="full-post-wrap">
        <div className="full-post-w">
          <div className="full-post-extra">
            <div className="fl">
              {r.category && <a href={`/${r.category.slug}/`}>{r.category.name}</a>}
            </div>
            <FontSize />
          </div>
          <div className="full-post-content">
            <h1 className="full-post-title"><PostTitle post={post} /></h1>
            <div className="full-post-article" id="full-post-article" dangerouslySetInnerHTML={{ __html: articleHtml(post.body) }} />
            <div className="full-post-extra">
              <div className="fl f-date">{formatTime(post.published_at)} | {day}</div>
            </div>
          </div>
        </div>
        {related.length > 0 && (
          <div className="posts related">
            <div className="c-title"><h2>{SITE[lang].m.relatedTitle}</h2></div>
            <div className="posts-wrap">
              {related.map((p) => (
                <MPostItem key={p.id} post={{ ...p, href: postPath(p, cats) }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
