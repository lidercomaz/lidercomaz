import { adminRoute, json } from '@/lib/admin/http'
import { usage } from '@/lib/admin/usage'

export const GET = adminRoute(async () => json(await usage()))
