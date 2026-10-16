import { InputError } from '@/lib/admin/posts'
import { adminRoute, json, readJson } from '@/lib/admin/http'
import { SourceInput, addSource, listSources } from '@/lib/bot/sources'
import { isLang } from '@/lib/site'

export const maxDuration = 60

export const GET = adminRoute(async (req) => {
  const lang = new URL(req.url).searchParams.get('lang')
  return json(await listSources(lang && isLang(lang) ? lang : undefined))
})

/** Adds a news site; its RSS feed is found automatically. */
export const POST = adminRoute(async (req) => {
  const r = SourceInput.safeParse(await readJson(req))
  if (!r.success) throw new InputError(r.error.issues.map((i) => i.message).join('; '))
  return json(await addSource(r.data), 201)
})
