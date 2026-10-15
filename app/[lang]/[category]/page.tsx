import type { Metadata } from 'next'
import { renderCategory, resolve } from '@/components/CategoryView'
import { isLang } from '@/lib/site'

export const revalidate = 60

// Rendered on first request, then cached (ISR) for `revalidate` seconds.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/[lang]/[category]'>): Promise<Metadata> {
  const { lang, category } = await params
  if (!isLang(lang)) return {}
  const r = await resolve(lang, category)
  if (!r) return {}
  return r.kind === 'page'
    ? { title: r.page.title }
    : { title: r.category.name, description: r.category.description ?? undefined }
}

export default async function CategoryPage({ params }: PageProps<'/[lang]/[category]'>) {
  const { lang, category } = await params
  return renderCategory(lang, category, 1)
}
