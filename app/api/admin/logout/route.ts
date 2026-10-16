import { cookies } from 'next/headers'
import { SESSION_COOKIE } from '@/lib/admin/auth'
import { json } from '@/lib/admin/http'

export async function POST() {
  ;(await cookies()).delete(SESSION_COOKIE)
  return json({ ok: true })
}
