import { adminRoute, json } from '@/lib/admin/http'
import { deleteMessage, listMessages } from '@/lib/messages'

export const GET = adminRoute(async () => json(await listMessages(200)))

/** DELETE ?id=2026-10/… */
export const DELETE = adminRoute(async (req) => {
  await deleteMessage(new URL(req.url).searchParams.get('id') ?? '')
  return json({ ok: true })
})
