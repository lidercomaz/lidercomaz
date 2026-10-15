import type { Metadata } from 'next'
import { categoryMetadata } from '@/components/CategoryView'
import { renderMobileCategory } from '@/components/m/MCategoryView'

export const revalidate = 60

export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps<'/m/[lang]/[category]/page/[n]'>): Promise<Metadata> {
  const { lang, category, n } = await params
  return categoryMetadata(lang, category, Number(n))
}

export default async function MobileCategoryPageN({ params }: PageProps<'/m/[lang]/[category]/page/[n]'>) {
  const { lang, category, n } = await params
  return renderMobileCategory(lang, category, Number(n))
}
