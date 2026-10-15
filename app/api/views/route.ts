import type { NextRequest } from 'next/server'
import { data } from '@/lib/data'
import { langFromHost } from '@/lib/request'

export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}))
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 400 })
  await data.incrementViews(langFromHost(req.headers.get('host')), id)
  return new Response(null, { status: 204 })
}
