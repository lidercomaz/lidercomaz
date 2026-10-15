import type { Metadata } from 'next'
import { categoryMetadata, renderCategory } from '@/components/CategoryView'

export const revalidate = 60

// Rendered on first request, then cached (ISR) for `revalidate` seconds.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/[lang]/[category]'>): Promise<Metadata> {
  const { lang, category } = await params
  return categoryMetadata(lang, category)
}

export default async function CategoryPage({ params }: PageProps<'/[lang]/[category]'>) {
  const { lang, category } = await params
  return renderCategory(lang, category, 1)
}
