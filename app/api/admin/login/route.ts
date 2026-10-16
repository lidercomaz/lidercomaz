import { cookies } from 'next/headers'
import { SESSION_COOKIE, checkCredentials, createSession, isConfigured } from '@/lib/admin/auth'
import { json } from '@/lib/admin/http'

export async function POST(req: Request) {
  if (!isConfigured()) return json({ error: 'ADMIN_EMAIL və ADMIN_PASSWORD serverdə (Vercel) təyin edilməyib' }, 503)
  const { email, password } = await req.json().catch(() => ({}))
  if (typeof email !== 'string' || typeof password !== 'string' || !checkCredentials(email, password)) {
    await new Promise((r) => setTimeout(r, 800)) // slows down password guessing
    return json({ error: 'E-poçt və ya şifrə yanlışdır' }, 401)
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
