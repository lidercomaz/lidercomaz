import { adminRoute, json, readJson } from '@/lib/admin/http'
import { deleteStory, getStory, parseStory, updateStory } from '@/lib/admin/posts'
import { isLang } from '@/lib/site'
import type { Lang } from '@/lib/types'

type Ctx = RouteContext<'/api/admin/posts/[lang]/[id]'>

async function target(ctx: Ctx): Promise<[Lang, number] | null> {
  const { lang, id } = await ctx.params
  const n = Number(id)
  return isLang(lang) && Number.isInteger(n) && n > 0 ? [lang, n] : null
}

export const GET = adminRoute(async (_req, ctx: Ctx) => {
  const t = await target(ctx)
  const story = t && (await getStory(...t))
  return story ? json(story) : json({ error: 'Xəbər tapılmadı' }, 404)
})

export const PATCH = adminRoute(async (req, ctx: Ctx) => {
  const t = await target(ctx)
  if (!t) return json({ error: 'Xəbər tapılmadı' }, 404)
  return json(await updateStory(...t, parseStory(await readJson(req))))
})

/** DELETE …?both=1 also removes the linked translation. */
export const DELETE = adminRoute(async (req, ctx: Ctx) => {
  const t = await target(ctx)
  if (!t) return json({ error: 'Xəbər tapılmadı' }, 404)
  return json(await deleteStory(...t, new URL(req.url).searchParams.get('both') === '1'))
})
