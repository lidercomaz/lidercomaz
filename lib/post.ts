import type { Metadata } from 'next'
import { cache } from 'react'
import { data } from './data'
import { categoryMap, postPath } from './format'
import { SITE_URL } from './site'
import type { Lang } from './types'

/** Resolves "{id}-{slug}.html" to the post and its canonical path. */
export const loadPost = cache(async (lang: Lang, segment: string) => {
  const m = /^(\d+)(?:-.*)?\.html$/.exec(decodeURIComponent(segment))
  if (!m) return null
  const [post, cats] = await Promise.all([data.post(lang, Number(m[1])), data.categories(lang)])
  if (!post) return null
  const map = categoryMap(cats)
  return { post, path: postPath(post, map), category: map.get(post.category_ids[0]) ?? null, cats: map }
})

export function isCanonical(path: string, category: string, segment: string) {
  return path === `/${decodeURIComponent(category)}/${decodeURIComponent(segment)}`
}

/** Absolute url of the same story on the other-language site, if one is linked. */
async function translationUrl(lang: Lang, id: number) {
  const other: Lang = lang === 'az' ? 'ru' : 'az'
  const t = await data.translation(lang, id).catch(() => null)
  if (!t) return null
  return `${SITE_URL[other]}${postPath(t, categoryMap(await data.categories(other)))}`
}

export async function postMetadata(lang: Lang, segment: string): Promise<Metadata> {
  const r = await loadPost(lang, segment)
  if (!r) return {}
  const { post, path } = r
  const other = await translationUrl(lang, post.id)
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    keywords: post.keywords ?? undefined,
    // hreflang pair; the header's AZ/RU switch also reads it (lib/lang-switch.ts).
    alternates: {
      canonical: path,
      languages: other ? { [lang]: `${SITE_URL[lang]}${path}`, [lang === 'az' ? 'ru' : 'az']: other } : undefined,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt ?? undefined,
      url: path,
      images: [ogImage(post)],
      publishedTime: post.published_at,
    },
  }
}

/** Article-size lead picture (first element of the body), else the card picture, else the logo. */
function ogImage(post: { body: string; image: string | null }) {
  const lead = /^\s*<img\b[^>]*\bsrc="([^"]+)"/i.exec(post.body)?.[1]
  return lead?.replace(/&amp;/g, '&') ?? post.image ?? '/theme/images/logo.png'
}

/** The lead image is above the fold: load it immediately, keep the rest lazy. */
export function articleHtml(body: string) {
  return body.replace('loading="lazy"', 'loading="eager" fetchpriority="high"')
}
