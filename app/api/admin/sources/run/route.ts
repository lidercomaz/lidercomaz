import { adminRoute, json } from '@/lib/admin/http'
import { runImport } from '@/lib/bot/sources'

export const maxDuration = 300

/** "Check now" in the panel: POST { source_id? } */
export const POST = adminRoute(async (req) => {
  const body = await req.json().catch(() => ({}))
  const sourceId = Number(body.source_id) || undefined
  return json(await runImport({ sourceId, budgetMs: 240_000 }))
})
