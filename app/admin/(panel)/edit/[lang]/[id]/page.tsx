import { notFound } from 'next/navigation'
import { StoryEditor } from '@/components/admin/StoryEditor'
import { isLang } from '@/lib/site'

export const metadata = { title: 'Redaktə' }

export default async function EditPost({ params }: PageProps<'/admin/edit/[lang]/[id]'>) {
  const { lang, id } = await params
  const n = Number(id)
  if (!isLang(lang) || !Number.isInteger(n) || n <= 0) notFound()
  return <StoryEditor key={`${lang}-${n}`} edit={{ lang, id: n }} />
}
