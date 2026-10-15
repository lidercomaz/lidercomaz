export type Lang = 'az' | 'ru'

export interface Category {
  id: number
  name: string
  slug: string
  position: number
  description: string | null
}

export interface PostCard {
  id: number
  slug: string
  title: string
  title_extra: string | null
  is_red: boolean
  image: string | null
  category_ids: number[]
  published_at: string
  views: number
}

export interface Post extends PostCard {
  excerpt: string | null
  body: string
  author: string | null
  keywords: string | null
}

export interface Page {
  slug: string
  title: string
  body: string
}

export interface FeedOptions {
  limit: number
  offset?: number
  categoryId?: number
  mainOnly?: boolean
}

export interface DataSource {
  categories(lang: Lang): Promise<Category[]>
  feed(lang: Lang, opts: FeedOptions): Promise<PostCard[]>
  popular(lang: Lang, days: number, limit: number): Promise<PostCard[]>
  post(lang: Lang, id: number): Promise<Post | null>
  search(lang: Lang, q: string, limit: number, offset: number): Promise<PostCard[]>
  page(lang: Lang, slug: string): Promise<Page | null>
  sitemap(lang: Lang): Promise<Pick<PostCard, 'id' | 'slug' | 'category_ids' | 'published_at'>[]>
  incrementViews(lang: Lang, id: number): Promise<void>
}
