// Dev-only source: reads the cleaned JSON export in .data/ (used when Supabase env is missing).
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Category, DataSource, Lang, Post, PostCard } from '../types'

interface Row extends Post {
  is_published: boolean
  show_on_main: boolean
}

const cache = new Map<Lang, Promise<{ categories: Category[]; posts: Row[] }>>()

function load(lang: Lang) {
  let p = cache.get(lang)
  if (!p) {
    const dir = path.join(process.cwd(), '.data', lang)
    p = Promise.all([
      readFile(path.join(dir, 'categories.json'), 'utf8'),
      readFile(path.join(dir, 'posts.json'), 'utf8'),
    ]).then(([c, ps]) => ({
      categories: (JSON.parse(c) as Category[]).sort((a, b) => a.position - b.position || a.id - b.id),
      posts: (JSON.parse(ps) as Row[])
        .filter((r) => r.is_published)
        .sort((a, b) => b.published_at.localeCompare(a.published_at)),
    }))
    cache.set(lang, p)
  }
  return p
}

const card = ({ id, slug, title, title_extra, is_red, image, category_ids, published_at, views }: Row): PostCard =>
  ({ id, slug, title, title_extra, is_red, image, category_ids, published_at, views })

const live = (r: Row) => r.published_at <= new Date().toISOString()

export const localSource: DataSource = {
  async categories(lang) {
    return (await load(lang)).categories
  },
  async feed(lang, { limit, offset = 0, categoryId, mainOnly }) {
    const { posts } = await load(lang)
    return posts
      .filter((r) => live(r) && (!categoryId || r.category_ids.includes(categoryId)) && (!mainOnly || r.show_on_main))
      .slice(offset, offset + limit)
      .map(card)
  },
  async popular(lang, days, limit) {
    const since = new Date(Date.now() - days * 864e5).toISOString()
    const { posts } = await load(lang)
    return posts
      .filter((r) => live(r) && r.published_at >= since)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)
      .map(card)
  },
  async post(lang, id) {
    const r = (await load(lang)).posts.find((p) => p.id === id && live(p))
    return r ?? null
  },
  async search(lang, q, limit, offset) {
    const needle = q.toLocaleLowerCase()
    return (await load(lang)).posts
      .filter((r) => live(r) && (r.title.toLocaleLowerCase().includes(needle) || r.excerpt?.toLocaleLowerCase().includes(needle)))
      .slice(offset, offset + limit)
      .map(card)
  },
  async page() {
    return null
  },
  async sitemap(lang) {
    return (await load(lang)).posts.filter(live).map(({ id, slug, category_ids, published_at }) => ({ id, slug, category_ids, published_at }))
  },
  async incrementViews() {},
}
