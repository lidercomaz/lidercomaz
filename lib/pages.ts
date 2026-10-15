import { SITE } from './site'
import type { Lang, Page } from './types'

/** Used until the page is created in the `pages` table. */
export function fallbackPage(lang: Lang, slug: string): Page | null {
  const t = SITE[lang]
  const contact = t.footerInfo.map((l) => `<p>${l}</p>`).join('')
  const title = t.footerMenu.find((m) => m.href === `/${slug}.html`)?.label
  if (!title) return null
  return { slug, title, body: contact }
}
