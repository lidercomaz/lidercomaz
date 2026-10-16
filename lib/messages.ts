import 'server-only'
import { randomBytes } from 'node:crypto'
import { adminDb } from './admin/db'
import type { Lang } from './types'

// Contact-form messages live as JSON files in a private Storage bucket (no table or migration needed).
const BUCKET = 'messages'
const PREFIX = 'contact'

export interface ContactMessage {
  id: string
  lang: Lang
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  created_at: string
}

let bucketReady: Promise<void> | undefined
function ensureBucket() {
  return (bucketReady ??= (async () => {
    const storage = adminDb().storage
    const { data } = await storage.getBucket(BUCKET)
    if (data) return
    const { error } = await storage.createBucket(BUCKET, { public: false, fileSizeLimit: '64KB', allowedMimeTypes: ['application/json'] })
    if (error && !/already exists/i.test(error.message)) throw new Error(`Storage: ${error.message}`)
  })().catch((e) => {
    bucketReady = undefined
    throw e
  }))
}

export async function saveMessage(m: Omit<ContactMessage, 'id' | 'created_at'>) {
  await ensureBucket()
  const now = new Date()
  const month = now.toISOString().slice(0, 7)
  // Reverse timestamp in the name: Storage lists names ascending, so the newest message comes first.
  const id = `${month}/${String(9e15 - now.getTime()).padStart(16, '0')}-${randomBytes(4).toString('hex')}`
  const body: ContactMessage = { ...m, id, created_at: now.toISOString() }
  const { error } = await adminDb().storage.from(BUCKET).upload(`${PREFIX}/${id}.json`, JSON.stringify(body), { contentType: 'application/json', upsert: false })
  if (error) throw new Error(`Storage: ${error.message}`)
  return body
}

const SAFE_ID = /^\d{4}-\d{2}\/\d{16}-[0-9a-f]{8}$/

export async function listMessages(limit = 100) {
  await ensureBucket()
  const storage = adminDb().storage.from(BUCKET)
  const { data: months, error } = await storage.list(PREFIX, { limit: 120, sortBy: { column: 'name', order: 'desc' } })
  if (error) throw new Error(`Storage: ${error.message}`)
  const ids: string[] = []
  for (const m of months ?? []) {
    if (ids.length >= limit || !/^\d{4}-\d{2}$/.test(m.name)) continue
    const { data: files } = await storage.list(`${PREFIX}/${m.name}`, { limit: limit - ids.length, sortBy: { column: 'name', order: 'asc' } })
    for (const f of files ?? []) if (f.name.endsWith('.json')) ids.push(`${m.name}/${f.name.slice(0, -5)}`)
  }
  const messages = await Promise.all(
    ids.map(async (id) => {
      const { data } = await storage.download(`${PREFIX}/${id}.json`)
      return data ? (JSON.parse(await data.text()) as ContactMessage) : null
    }),
  )
  return messages.filter((m): m is ContactMessage => m !== null)
}

export async function deleteMessage(id: string) {
  if (!SAFE_ID.test(id)) throw new Error('Mesaj tapılmadı')
  const { error } = await adminDb().storage.from(BUCKET).remove([`${PREFIX}/${id}.json`])
  if (error) throw new Error(`Storage: ${error.message}`)
}

/** Optional e-mail copy via Resend (RESEND_API_KEY + a verified sender domain). Never blocks saving. */
export async function notifyByEmail(m: ContactMessage) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const to = process.env.CONTACT_NOTIFY_EMAIL || 'info@lider.com.az'
  const from = process.env.CONTACT_FROM_EMAIL || 'Lider.com.az <noreply@lider.com.az>'
  const text = [`Ad: ${m.name}`, `E-poçt: ${m.email}`, m.phone && `Telefon: ${m.phone}`, `Sayt: ${m.lang.toUpperCase()}`, '', m.message].filter((l) => l !== null).join('\n')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, reply_to: m.email, subject: `Əlaqə forması: ${m.subject || m.name}`, text }),
    signal: AbortSignal.timeout(8000),
  }).catch((e) => console.error('[contact] e-mail', e))
}
