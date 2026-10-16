import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'lider_admin'
const SESSION_DAYS = 14

/** Sessions are signed with a key derived from the password, so changing ADMIN_PASSWORD logs everyone out. */
function signingKey() {
  const password = process.env.ADMIN_PASSWORD
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!password || !pepper) return null
  return createHash('sha256').update(`lider-admin\0${password}\0${pepper}`).digest()
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function isConfigured() {
  return signingKey() !== null
}

export function checkPassword(input: string) {
  const password = process.env.ADMIN_PASSWORD
  return Boolean(password) && safeEqual(createHash('sha256').update(input).digest('hex'), createHash('sha256').update(password!).digest('hex'))
}

export function createSession() {
  const key = signingKey()
  if (!key) throw new Error('ADMIN_PASSWORD is not set')
  const exp = Date.now() + SESSION_DAYS * 864e5
  const sig = createHmac('sha256', key).update(String(exp)).digest('base64url')
  return { value: `${exp}.${sig}`, maxAge: SESSION_DAYS * 86400 }
}

export function verifySession(value: string | undefined) {
  const key = signingKey()
  if (!key || !value) return false
  const [exp, sig] = value.split('.')
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false
  return safeEqual(sig, createHmac('sha256', key).update(exp).digest('base64url'))
}

/** Bot / automation access: `Authorization: Bearer <ADMIN_API_TOKEN>`. */
function verifyToken(header: string | null) {
  const token = process.env.ADMIN_API_TOKEN
  if (!token || token.length < 24 || !header?.startsWith('Bearer ')) return false
  return safeEqual(header.slice(7).trim(), token)
}

export async function isAuthorized(req: Request) {
  if (verifyToken(req.headers.get('authorization'))) return true
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value)
}

/** For server components under /admin. */
export async function hasSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value)
}
