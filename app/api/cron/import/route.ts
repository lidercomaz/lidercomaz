import { adminRoute, json } from '@/lib/admin/http'
import { runImport } from '@/lib/bot/sources'

export const maxDuration = 300

/**
 * Scheduled import, called every 10 minutes by .github/workflows/news-bot.yml
 * with `Authorization: Bearer <ADMIN_API_TOKEN>`.
 */
async function run() {
  const report = await runImport({ budgetMs: 200_000 })
  console.log('[news-bot]', JSON.stringify({ ...report, details: report.details.length }))
  return json(report)
}

export const GET = adminRoute(run)
export const POST = adminRoute(run)
