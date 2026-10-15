'use client'

import { useState } from 'react'
import { MPostItem } from './m/MPostItem'
import { NewsItem, type CardWithHref } from './NewsItem'

interface Props {
  label: string
  offset: number
  pageSize: number
  categoryId?: number
  query?: string
  /** 'm' renders smartphone-template cards */
  variant?: 'm'
}

/** Replaces DLE "Daha çox" ajax navigation / infinite scroll. */
export function LoadMore({ label, offset: initial, pageSize, categoryId, query, variant }: Props) {
  const Item = variant === 'm' ? MPostItem : NewsItem
  const [items, setItems] = useState<CardWithHref[]>([])
  const [offset, setOffset] = useState(initial)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: String(pageSize) })
      if (categoryId) params.set('category', String(categoryId))
      if (query) params.set('q', query)
      const res = await fetch(`/api/posts?${params}`)
      if (!res.ok) throw new Error(String(res.status))
      const next: CardWithHref[] = await res.json()
      setItems((prev) => [...prev, ...next])
      setOffset((o) => o + next.length)
      if (next.length < pageSize) setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {items.map((p) => (
        <Item key={p.id} post={p} />
      ))}
      {!done && (
        <div className="bottom-nav ignore-select">
          <div className="nav-load">
            <button type="button" onClick={load} disabled={loading}>
              {loading ? '...' : label}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
