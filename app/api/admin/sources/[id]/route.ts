import { InputError } from '@/lib/admin/posts'
import { adminRoute, json, readJson } from '@/lib/admin/http'
import { SourcePatch, deleteSource, updateSource } from '@/lib/bot/sources'

type Ctx = RouteContext<'/api/admin/sources/[id]'>

const idOf = async (ctx: Ctx) => {
  const n = Number((await ctx.params).id)
  if (!Number.isInteger(n) || n <= 0) throw new InputError('Mənbə tapılmadı')
  return n
}

export const PATCH = adminRoute(async (req, ctx: Ctx) => {
  const r = SourcePatch.safeParse(await readJson(req))
  if (!r.success) throw new InputError(r.error.issues.map((i) => i.message).join('; '))
  return json(await updateSource(await idOf(ctx), r.data))
})

export const DELETE = adminRoute(async (_req, ctx: Ctx) => {
  await deleteSource(await idOf(ctx))
  return json({ ok: true })
})
