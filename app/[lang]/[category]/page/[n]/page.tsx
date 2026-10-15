import type { Metadata } from 'next'
import { categoryMetadata, renderCategory } from '@/components/CategoryView'

export const revalidate = 60

// Rendered on first request, then cached (ISR) for `revalidate` seconds.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/[lang]/[category]/page/[n]'>): Promise<Metadata> {
  const { lang, category, n } = await params
  return categoryMetadata(lang, category, Number(n))
}

export default async function CategoryPageN({ params }: PageProps<'/[lang]/[category]/page/[n]'>) {
  const { lang, category, n } = await params
  return renderCategory(lang, category, Number(n))
}
