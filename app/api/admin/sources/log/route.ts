import { adminRoute, json } from '@/lib/admin/http'
import { recentItems } from '@/lib/bot/sources'

export const GET = adminRoute(async () => json(await recentItems(60)))
