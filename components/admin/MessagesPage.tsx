'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '@/lib/types'
import { api, formatBaku } from './api'

interface Message {
  id: string
  lang: Lang
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  created_at: string
}

/** Messages sent through the contact form on both sites. */
export function MessagesPage() {
  const [items, setItems] = useState<Message[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await api<Message[]>('/api/admin/messages'))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
      setItems([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load()
  }, [load])

  async function remove(m: Message) {
    if (!confirm(`${m.name} adlı şəxsin mesajı silinsin?`)) return
    try {
      await api(`/api/admin/messages?id=${encodeURIComponent(m.id)}`, { method: 'DELETE' })
      setItems((list) => list?.filter((x) => x.id !== m.id) ?? null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <div className="adm-head">
        <h1>Mesajlar (əlaqə forması)</h1>
        <button className="btn" onClick={load}>Yenilə</button>
      </div>
      {error && <div className="notice err">{error}</div>}
      {items === null ? (
        <div className="card empty">Yüklənir…</div>
      ) : !items.length ? (
        <div className="card empty">Hələ mesaj yoxdur.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((m) => (
            <div key={m.id} className="card card-pad">
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div className="ptitle">{m.subject || 'Mövzusuz'}</div>
                  <div className="meta">
                    {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a>
                    {m.phone && <> · <a href={`tel:${m.phone.replace(/[^\d+]/g, '')}`}>{m.phone}</a></>}
                    {' · '}{formatBaku(m.created_at)} · <span className="badge">{m.lang.toUpperCase()} sayt</span>
                  </div>
                </div>
                <div className="actions">
                  <a className="btn small" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'Lider.com.az'}`)}`}>Cavab yaz</a>
                  <button className="btn small danger" onClick={() => remove(m)}>Sil</button>
                </div>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', margin: '12px 0 0', lineHeight: 1.6 }}>{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
