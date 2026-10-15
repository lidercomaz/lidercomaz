import content from '@/content/pages.json'
import type { Lang, Page } from './types'

const PAGES = content as Record<Lang, Record<string, { title: string; body: string }>>

/** Built-in page content (content/pages.json), used until the page exists in the `pages` table. */
export function fallbackPage(lang: Lang, slug: string): Page | null {
  const p = PAGES[lang][slug]
  return p ? { slug, ...p } : null
}
