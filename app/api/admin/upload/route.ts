import { adminRoute, json } from '@/lib/admin/http'
import { storeImage, storeImageFromUrl } from '@/lib/admin/images'

/** multipart `file`, or JSON `{ "url": "https://…" }` → imgbb urls `{ image: card 480px, full: article 1200px }` */
export const POST = adminRoute(async (req) => {
  if (req.headers.get('content-type')?.includes('application/json')) {
    const { url } = await req.json().catch(() => ({}))
    if (typeof url !== 'string') return json({ error: 'url lazımdır' }, 400)
    return json(await storeImageFromUrl(url), 201)
  }
  const file = (await req.formData().catch(() => null))?.get('file')
  if (!(file instanceof File)) return json({ error: 'Fayl seçilməyib' }, 400)
  return json(await storeImage(Buffer.from(await file.arrayBuffer())), 201)
})
