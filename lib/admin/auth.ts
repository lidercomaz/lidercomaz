import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'lider_admin'
const SESSION_DAYS = 14

const adminEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase()

/** Sessions are signed with a key derived from the credentials, so changing ADMIN_EMAIL/ADMIN_PASSWORD logs everyone out. */
function signingKey() {
  const email = adminEmail()
  const password = process.env.ADMIN_PASSWORD
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!email || !password || !pepper) return null
  return createHash('sha256').update(`lider-admin\0${email}\0${password}\0${pepper}`).digest()
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function isConfigured() {
  return signingKey() !== null
}

const digest = (s: string) => createHash('sha256').update(s).digest('hex')

export function checkCredentials(email: string, password: string) {
  const expectedEmail = adminEmail()
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedEmail || !expectedPassword) return false
  // Both comparisons always run, so timing does not reveal which one failed.
  const emailOk = safeEqual(digest(email.trim().toLowerCase()), digest(expectedEmail))
  const passwordOk = safeEqual(digest(password), digest(expectedPassword))
  return emailOk && passwordOk
}

export function createSession() {
  const key = signingKey()
  if (!key) throw new Error('ADMIN_EMAIL / ADMIN_PASSWORD are not set')
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
