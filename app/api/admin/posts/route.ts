import { adminRoute, json, readJson } from '@/lib/admin/http'
import { createStory, listPosts, parseStory } from '@/lib/admin/posts'
import { isLang } from '@/lib/site'

/** GET /api/admin/posts?lang=az&q=&page=1&category= — admin list (drafts and scheduled included). */
export const GET = adminRoute(async (req) => {
  const sp = new URL(req.url).searchParams
  const lang = sp.get('lang') ?? 'az'
  if (!isLang(lang)) return json({ error: 'lang: az | ru' }, 400)
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const perPage = Math.min(100, Math.max(5, Number(sp.get('per_page')) || 30))
  const q = sp.get('q')?.trim().slice(0, 100) || undefined
  const category = Number(sp.get('category')) || undefined
  return json({ page, perPage, ...(await listPosts(lang, { q, page, perPage, category })) })
})

/** POST /api/admin/posts — new story on both sites (missing language is translated automatically). */
export const POST = adminRoute(async (req) => json(await createStory(parseStory(await readJson(req))), 201))
