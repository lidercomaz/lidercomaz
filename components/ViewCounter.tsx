'use client'

import { useEffect } from 'react'

export function ViewCounter({ id }: { id: number }) {
  useEffect(() => {
    const key = `v:${id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {}
    fetch('/api/views', { method: 'POST', body: JSON.stringify({ id }), keepalive: true }).catch(() => {})
  }, [id])
  return null
}
