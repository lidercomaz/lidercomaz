import type { Metadata } from 'next'
import { categoryMetadata } from '@/components/CategoryView'
import { renderMobileCategory } from '@/components/m/MCategoryView'

export const revalidate = 300

export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/m/[lang]/[category]'>): Promise<Metadata> {
  const { lang, category } = await params
  return categoryMetadata(lang, category)
}

export default async function MobileCategoryPage({ params }: PageProps<'/m/[lang]/[category]'>) {
  const { lang, category } = await params
  return renderMobileCategory(lang, category, 1)
}
