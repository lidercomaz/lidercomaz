import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { ContentPage } from '@/components/ContentPage'
import { PostTitle } from '@/components/PostTitle'
import { ViewCounter } from '@/components/ViewCounter'
import { formatDayMonth, formatTime, formatYear } from '@/lib/format'
import { articleHtml, isCanonical, loadPost, postMetadata } from '@/lib/post'
import { SITE_URL, isLang } from '@/lib/site'

export const revalidate = 3600

// Rendered on first request, then cached (ISR) for `revalidate` seconds.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/[lang]/[category]/[post]'>): Promise<Metadata> {
  const { lang, post } = await params
  return isLang(lang) ? postMetadata(lang, post) : {}
}

export default async function PostPage({ params }: PageProps<'/[lang]/[category]/[post]'>) {
  const { lang, category, post: segment } = await params
  if (!isLang(lang)) notFound()
  const r = await loadPost(lang, segment)
  if (!r) notFound()
  const { post, path } = r
  // Old links with a wrong/changed category or slug go to the canonical url.
  if (!isCanonical(path, category, segment)) permanentRedirect(path)

  const url = encodeURIComponent(`${SITE_URL[lang]}${path}`)

  return (
    <ContentPage lang={lang}>
      <ViewCounter id={post.id} />
      <div className="full-post-wrap">
        <div className="full-post-a">
          <div className="full-post-i">
            <div className="dt full-post-date">
              <div className="respico" />
              <div className="month">{formatDayMonth(post.published_at, lang)}</div>
              <div className="year">{formatYear(post.published_at)}</div>
            </div>
            <div className="dt time">{formatTime(post.published_at)}</div>
            {lang === 'ru' && (
              <div className="full-post-view">
                <div className="view-wrap"><i /><span>{post.views}</span></div>
              </div>
            )}
            <div className="socialpanel">
              <ul>
                <li className="facebookp"><a href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noopener"><i /></a></li>
                <li className="twitterp"><a href={`https://twitter.com/intent/tweet?url=${url}`} target="_blank" rel="noopener"><i /></a></li>
                <li className="telegramp"><a href={`https://telegram.me/share/url?url=${url}`} target="_blank" rel="noopener"><i /></a></li>
                <li className="whatsappp"><a href={`https://wa.me/?text=${url}`} target="_blank" rel="noopener"><i /></a></li>
              </ul>
            </div>
          </div>

          <h1 className="full-post-title"><PostTitle post={post} /></h1>

          <div className="full-post-article">
            <article className="article-full-story">
              <div dangerouslySetInnerHTML={{ __html: articleHtml(post.body) }} />
            </article>
          </div>
        </div>
      </div>
    </ContentPage>
  )
}
