'use client'

import { useEffect, useState } from 'react'
import { api } from './api'

interface Usage {
  measured: boolean
  dbBytes: number
  storageBytes: number | null
  posts: number
  perDay: number
  today: { az: number; ru: number }
  limits: { az: number; ru: number; dbBytes: number; storageBytes: number }
  yearsLeft: number | null
  yearsAtLimit: number
}

const mb = (b: number) => `${Math.round(b / 1048576)} MB`

function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct > 85 ? '#c30d23' : pct > 65 ? '#b26a00' : '#1a7f4b'
  return (
    <div style={{ height: 8, background: '#eef0f4', borderRadius: 99, overflow: 'hidden', margin: '6px 0' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
    </div>
  )
}

/** Supabase free-plan usage and the bot's daily limits. */
export function UsageCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [u, setU] = useState<Usage | null>(null)
  useEffect(() => {
    api<Usage>('/api/admin/usage').then(setU).catch(() => {})
  }, [refreshKey])
  if (!u) return null
  return (
    <div className="card card-pad" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
      <div>
        <div className="meta">Baza (Supabase, pulsuz plan)</div>
        <b>{mb(u.dbBytes)} / {mb(u.limits.dbBytes)}</b>{!u.measured && <span className="meta"> (təxmini)</span>}
        <Bar value={u.dbBytes} max={u.limits.dbBytes} />
        <div className="meta">{u.posts.toLocaleString('az')} xəbər · son 7 gündə gündə ~{u.perDay}</div>
      </div>
      {u.storageBytes !== null && (
        <div>
          <div className="meta">Fayllar (köhnə arxiv şəkilləri)</div>
          <b>{mb(u.storageBytes)} / {mb(u.limits.storageBytes)}</b>
          <Bar value={u.storageBytes} max={u.limits.storageBytes} />
          <div className="meta">Yeni şəkillər imgbb-yə gedir, bu rəqəm artmır</div>
        </div>
      )}
      <div>
        <div className="meta">Bu gün əlavə olunub / günlük limit</div>
        <b>AZ {u.today.az}/{u.limits.az} · RU {u.today.ru}/{u.limits.ru}</b>
        <Bar value={u.today.az + u.today.ru} max={u.limits.az + u.limits.ru} />
        <div className="meta">Limit dolanda bot növbəti günə qədər dayanır</div>
      </div>
      <div>
        <div className="meta">Baza nə qədər çatar</div>
        <b>{u.yearsLeft !== null ? `~${u.yearsLeft} il` : '—'}</b>
        <div className="meta" style={{ marginTop: 6 }}>Hər gün limit qədər xəbər olsa: ~{u.yearsAtLimit} il</div>
      </div>
    </div>
  )
}
