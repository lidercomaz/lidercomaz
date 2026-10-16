import { adminRoute, json } from '@/lib/admin/http'
import { listCategories } from '@/lib/admin/posts'

export const GET = adminRoute(async () => json(await listCategories()))
