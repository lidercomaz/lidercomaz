import { cookies } from 'next/headers'
import { SESSION_COOKIE, checkPassword, createSession, isConfigured } from '@/lib/admin/auth'
import { json } from '@/lib/admin/http'

export async function POST(req: Request) {
  if (!isConfigured()) return json({ error: 'ADMIN_PASSWORD serverdə təyin edilməyib' }, 503)
  const { password } = await req.json().catch(() => ({}))
  if (typeof password !== 'string' || !checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800)) // slows down password guessing
    return json({ error: 'Şifrə yanlışdır' }, 401)
  }
  const { value, maxAge } = createSession()
  ;(await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  })
  return json({ ok: true })
}
