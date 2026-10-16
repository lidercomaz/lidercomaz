'use client'

import { SITE_URL } from '@/lib/site'
import type { Lang } from '@/lib/types'

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {}
  const res = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && !path.endsWith('/login')) {
    window.location.replace(`${window.location.origin}/admin/login`)
  }
  if (!res.ok) throw new ApiError(data.error ?? `Xəta (HTTP ${res.status})`, res.status)
  return data as T
}

export interface AdminCategory {
  id: number
  slug: string
  az: string
  ru: string
}

/** Public url of a post (same scheme as lib/format postPath). */
export function publicUrl(lang: Lang, post: { id: number; slug: string; category_ids: number[] }, cats: AdminCategory[]) {
  const cat = cats.find((c) => c.id === post.category_ids[0])
  return `${SITE_URL[lang]}${cat ? `/${cat.slug}` : ''}/${post.id}-${post.slug}.html`
}

const BAKU_OFFSET = 4 * 3600e3 // Asia/Baku, UTC+4 all year

/** ISO → value for <input type="datetime-local"> in Baku time. */
export const toLocalInput = (iso: string) => new Date(Date.parse(iso) + BAKU_OFFSET).toISOString().slice(0, 16)
export const fromLocalInput = (v: string) => `${v}:00+04:00`

export function formatBaku(iso: string) {
  return new Intl.DateTimeFormat('az', { timeZone: 'Asia/Baku', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/** Shrinks big photos in the browser so uploads stay under the 4.5 MB serverless body limit. */
export async function prepareUpload(file: File): Promise<Blob> {
  if (file.type === 'image/gif' || file.size < 3.5 * 1024 * 1024) return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Şəkil hazırlanmadı'))), 'image/jpeg', 0.9))
}

export async function uploadImage(file: File) {
  const form = new FormData()
  form.append('file', await prepareUpload(file), file.name)
  return api<{ image: string; full: string }>('/api/admin/upload', { method: 'POST', body: form })
}
