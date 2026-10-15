import type { Metadata } from 'next'
import { renderCategory, resolve } from '@/components/CategoryView'
import { isLang } from '@/lib/site'

export const revalidate = 60

// Rendered on first request, then cached (ISR) for `revalidate` seconds.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/[lang]/[category]/page/[n]'>): Promise<Metadata> {
  const { lang, category, n } = await params
  if (!isLang(lang)) return {}
  const r = await resolve(lang, category)
  return r?.kind === 'category' ? { title: `${r.category.name} – ${n}` } : {}
}

export default async function CategoryPageN({ params }: PageProps<'/[lang]/[category]/page/[n]'>) {
  const { lang, category, n } = await params
  return renderCategory(lang, category, Number(n))
}
