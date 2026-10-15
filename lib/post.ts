import type { Metadata } from 'next'
import { cache } from 'react'
import { data } from './data'
import { categoryMap, postPath } from './format'
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

export async function postMetadata(lang: Lang, segment: string): Promise<Metadata> {
  const r = await loadPost(lang, segment)
  if (!r) return {}
  const { post, path } = r
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    keywords: post.keywords ?? undefined,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt ?? undefined,
      url: path,
      images: [post.image ? post.image.replace(/-s\.webp$/, '.webp') : '/theme/images/logo.png'],
      publishedTime: post.published_at,
    },
  }
}

/** The lead image is above the fold: load it immediately, keep the rest lazy. */
export function articleHtml(body: string) {
  return body.replace('loading="lazy"', 'loading="eager" fetchpriority="high"')
}
