import { z } from 'zod'
import { cleanHtml, toHtml } from '@/lib/admin/content'
import { adminRoute, json, readJson } from '@/lib/admin/http'
import { canTranslate, translatePost } from '@/lib/admin/translate'

const Input = z.object({
  from: z.enum(['az', 'ru']),
  title: z.string().trim().min(1).max(300),
  title_extra: z.string().trim().max(200).nullish(),
  body: z.string().max(500_000).default(''),
})

export const GET = adminRoute(async () => json({ available: canTranslate() }))

/** { from: "az", title, title_extra, body } → the same fields in the other language. */
export const POST = adminRoute(async (req) => {
  const r = Input.safeParse(await readJson(req))
  if (!r.success) return json({ error: 'Başlıq və mətn lazımdır' }, 400)
  const { from, title, title_extra, body } = r.data
  return json(await translatePost(from, from === 'az' ? 'ru' : 'az', { title, title_extra: title_extra || null, body: cleanHtml(toHtml(body)) }))
})
