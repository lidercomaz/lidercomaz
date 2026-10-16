import { after } from 'next/server'
import { z } from 'zod'
import { notifyByEmail, saveMessage } from '@/lib/messages'
import { langFromHost } from '@/lib/request'

const Input = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(''),
  subject: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(10).max(5000),
  /** Honeypot: hidden field that people never fill in. */
  website: z.string().optional().default(''),
  /** When the form was rendered (ms); forms sent within 3 s are bots. */
  t: z.number().optional(),
})

// Per-instance flood guard: at most 5 messages per address in 10 minutes.
const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60e3)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > 5
}

export async function POST(req: Request) {
  const r = Input.safeParse(await req.json().catch(() => null))
  if (!r.success) return Response.json({ error: 'invalid' }, { status: 400 })
  const { website, t, ...m } = r.data
  // Bots get a normal-looking success so they do not retry.
  if (website || (t && Date.now() - t < 3000)) return Response.json({ ok: true })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  if (limited(ip)) return Response.json({ error: 'rate' }, { status: 429 })

  const saved = await saveMessage({
    lang: langFromHost(req.headers.get('host')),
    name: m.name,
    email: m.email,
    phone: m.phone || null,
    subject: m.subject || null,
    message: m.message,
  })
  after(() => notifyByEmail(saved))
  return Response.json({ ok: true })
}
