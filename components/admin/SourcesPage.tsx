'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '@/lib/types'
import { api, formatBaku, type AdminCategory } from './api'

interface Source {
  id: number
  lang: Lang
  name: string
  site_url: string
  feed_url: string
  category_id: number | null
  is_active: boolean
  rewrite: boolean
  cross_post: boolean
  auto_publish: boolean
  with_image: boolean
  max_per_run: number
  last_checked_at: string | null
  last_error: string | null
}

interface LogRow {
  id: number
  source_id: number
  url: string
  title: string | null
  status: string
  post_lang: Lang | null
  post_id: number | null
  error: string | null
  created_at: string
}

interface RunReport {
  sources: number
  published: number
  drafts: number
  skipped: number
  errors: number
  details: { source: string; title: string; status: string; error?: string }[]
}

const STATUS: Record<string, [string, string]> = {
  published: ['ok', 'Dərc olundu'],
  draft: ['warn', 'Qaralama'],
  skipped: ['', 'Keçildi'],
  error: ['red', 'Xəta'],
  processing: ['warn', 'Emal olunur'],
}

const TOGGLES: { key: 'is_active' | 'rewrite' | 'cross_post' | 'auto_publish' | 'with_image'; label: string; hint: string }[] = [
  { key: 'is_active', label: 'Aktiv', hint: 'Bot bu saytı yoxlayır' },
  { key: 'rewrite', label: 'Öz sözlərimizlə yaz', hint: 'Cümlələr yenidən qurulur, məna eyni qalır' },
  { key: 'cross_post', label: 'Digər sayta da tərcümə et', hint: 'AZ mənbə → RU saytında da, RU mənbə → AZ saytında da' },
  { key: 'auto_publish', label: 'Avtomatik dərc et', hint: 'Söndürülsə qaralama kimi saxlanılır, paneldən yoxlayıb dərc edirsiniz' },
  { key: 'with_image', label: 'Şəkli götür', hint: 'Mənbənin əsas şəklini yükləyir' },
]

export function SourcesPage() {
  const [lang, setLang] = useState<Lang>('az')
  const [sources, setSources] = useState<Source[] | null>(null)
  const [log, setLog] = useState<LogRow[]>([])
  const [cats, setCats] = useState<AdminCategory[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [running, setRunning] = useState<number | 'all' | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', site_url: '', category_id: 0, cross_post: false, auto_publish: true, rewrite: true })

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([api<Source[]>('/api/admin/sources'), api<LogRow[]>('/api/admin/sources/log')])
      setSources(s)
      setLog(l)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
      setSources([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load()
    api<AdminCategory[]>('/api/admin/categories').then(setCats).catch(() => {})
  }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError(null)
    setNotice(null)
    try {
      const r = await api<{ source: Source; feedItems: number }>('/api/admin/sources', {
        method: 'POST',
        json: { lang, name: form.name, site_url: form.site_url, category_id: form.category_id || null, cross_post: form.cross_post, auto_publish: form.auto_publish, rewrite: form.rewrite },
      })
      setNotice(`"${r.source.name}" əlavə olundu. RSS lenti tapıldı (${r.feedItems} xəbər). Bot bundan sonra yeni xəbərləri çəkəcək; ilk yoxlamada ən son 2 xəbəri götürəcək.`)
      setForm({ ...form, name: '', site_url: '' })
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setAdding(false)
    }
  }

  async function patch(s: Source, change: Partial<Source>) {
    setSources((list) => list?.map((x) => (x.id === s.id ? { ...x, ...change } : x)) ?? null)
    try {
      await api(`/api/admin/sources/${s.id}`, { method: 'PATCH', json: change })
    } catch (e) {
      setError((e as Error).message)
      load()
    }
  }

  async function remove(s: Source) {
    if (!confirm(`"${s.name}" mənbəsi silinsin? Artıq dərc olunmuş xəbərlər saytda qalır.`)) return
    await api(`/api/admin/sources/${s.id}`, { method: 'DELETE' }).catch((e) => setError(e.message))
    load()
  }

  async function run(id?: number) {
    setRunning(id ?? 'all')
    setError(null)
    setNotice(null)
    try {
      const r = await api<RunReport>('/api/admin/sources/run', { method: 'POST', json: { source_id: id } })
      setNotice(`Yoxlanıldı: ${r.sources} mənbə · dərc olundu ${r.published} · qaralama ${r.drafts} · keçildi ${r.skipped} · xəta ${r.errors}`)
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRunning(null)
    }
  }

  const list = sources?.filter((s) => s.lang === lang) ?? []
  const byId = new Map(sources?.map((s) => [s.id, s]) ?? [])

  return (
    <>
      <div className="adm-head">
        <h1>Mənbələr (xəbər botu)</h1>
        <div className="tabs">
          {(['az', 'ru'] as Lang[]).map((l) => (
            <button key={l} className={lang === l ? 'on' : undefined} onClick={() => setLang(l)}>
              {l === 'az' ? 'AZ saytı üçün' : 'RU saytı üçün'}
            </button>
          ))}
        </div>
        <button className="btn primary" disabled={running !== null} onClick={() => run()}>
          {running === 'all' ? 'Yoxlanılır… (1-4 dəq)' : 'Hamısını indi yoxla'}
        </button>
      </div>

      <p className="hint" style={{ marginTop: -8 }}>
        Bot hər 10 dəqiqədən bir {lang === 'az' ? 'Azərbaycan dilli' : 'rus dilli'} mənbələrdən yeni xəbərləri götürür, öz sözlərimizlə yazır və əvvəlinə{' '}
        <b>{lang === 'az' ? '"Lider.com.az Milli.az-a istinadən bildirir ki, …"' : '"Как сообщает Lider.com.az со ссылкой на …"'}</b> cümləsini əlavə edib{' '}
        {lang === 'az' ? 'lider.com.az' : 'ru.lider.com.az'}-da dərc edir. Bu siyahıya yalnız {lang === 'az' ? 'Azərbaycan dilli' : 'rus dilli'} saytlar əlavə edin.
      </p>

      {error && <div className="notice err">{error}</div>}
      {notice && <div className="notice ok">{notice}</div>}

      <form className="card card-pad" onSubmit={add} style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Yeni mənbə ({lang.toUpperCase()} saytı üçün)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <label className="field">
            <span>Ad (istinad cümləsində yazılır)</span>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={lang === 'az' ? 'Milli.az' : 'Report.az'} />
          </label>
          <label className="field">
            <span>Saytın və ya RSS-in linki</span>
            <input className="input" required type="url" value={form.site_url} onChange={(e) => setForm({ ...form, site_url: e.target.value })} placeholder="https://milli.az" />
          </label>
          <label className="field">
            <span>Kateqoriya (bot seçə bilməsə)</span>
            <select className="select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}>
              <option value={0}>Bot özü seçsin (default: Gündəm)</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c[lang]}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', margin: '4px 0 12px' }}>
          <label className="check"><input type="checkbox" checked={form.rewrite} onChange={(e) => setForm({ ...form, rewrite: e.target.checked })} />Öz sözlərimizlə yaz</label>
          <label className="check"><input type="checkbox" checked={form.cross_post} onChange={(e) => setForm({ ...form, cross_post: e.target.checked })} />{lang === 'az' ? 'RU saytına da tərcümə et' : 'AZ saytına da tərcümə et'}</label>
          <label className="check"><input type="checkbox" checked={form.auto_publish} onChange={(e) => setForm({ ...form, auto_publish: e.target.checked })} />Avtomatik dərc et</label>
        </div>
        <button className="btn primary" disabled={adding}>{adding ? 'RSS axtarılır…' : 'Əlavə et'}</button>
      </form>

      <div className="card" style={{ overflowX: 'auto', marginBottom: 24 }}>
        {sources === null ? (
          <div className="empty">Yüklənir…</div>
        ) : !list.length ? (
          <div className="empty">{lang.toUpperCase()} saytı üçün mənbə yoxdur.</div>
        ) : (
          <table className="posts">
            <thead>
              <tr>
                <th>Mənbə</th>
                <th>Parametrlər</th>
                <th className="hide-sm">Hər dəfə</th>
                <th className="hide-sm">Son yoxlama</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.55 }}>
                  <td>
                    <div className="ptitle">{s.name}</div>
                    <div className="meta"><a href={s.site_url} target="_blank" rel="noopener">{s.site_url}</a></div>
                    <div className="meta">RSS: {s.feed_url}</div>
                    <select className="select" style={{ marginTop: 6, height: 30, maxWidth: 220 }} value={s.category_id ?? 0} onChange={(e) => patch(s, { category_id: Number(e.target.value) || null })}>
                      <option value={0}>Kateqoriya: bot seçir</option>
                      {cats.map((c) => <option key={c.id} value={c.id}>Kateqoriya: {c[lang]}</option>)}
                    </select>
                  </td>
                  <td>
                    {TOGGLES.map((t) => (
                      <label key={t.key} className="check" title={t.hint} style={{ marginBottom: 4, fontSize: 13.5 }}>
                        <input type="checkbox" checked={s[t.key]} onChange={(e) => patch(s, { [t.key]: e.target.checked })} />
                        {t.key === 'cross_post' ? (lang === 'az' ? 'RU saytına da tərcümə et' : 'AZ saytına da tərcümə et') : t.label}
                      </label>
                    ))}
                  </td>
                  <td className="hide-sm">
                    <select className="select" style={{ height: 30, width: 120 }} value={s.max_per_run} onChange={(e) => patch(s, { max_per_run: Number(e.target.value) })}>
                      {[1, 2, 3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} xəbər</option>)}
                    </select>
                  </td>
                  <td className="hide-sm">
                    {s.last_checked_at ? <div className="meta">{formatBaku(s.last_checked_at)}</div> : <span className="badge">hələ yox</span>}
                    {s.last_error && <div className="badge red" title={s.last_error} style={{ whiteSpace: 'normal', marginTop: 4 }}>{s.last_error.slice(0, 120)}</div>}
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn small" disabled={running !== null} onClick={() => run(s.id)}>{running === s.id ? 'Yoxlanılır…' : 'İndi yoxla'}</button>
                      <button className="btn small danger" onClick={() => remove(s)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ fontSize: 17 }}>Son çəkilən xəbərlər</h2>
      <div className="card" style={{ overflowX: 'auto' }}>
        {!log.length ? (
          <div className="empty">Hələ heç nə çəkilməyib.</div>
        ) : (
          <table className="posts">
            <thead>
              <tr><th>Xəbər</th><th className="hide-sm">Mənbə</th><th>Status</th><th className="hide-sm">Vaxt</th></tr>
            </thead>
            <tbody>
              {log.map((r) => {
                const retry = r.status === 'error' && r.error?.startsWith('⟳ ')
                const [cls, label] = retry ? ['warn', 'Təkrar cəhd ediləcək'] : STATUS[r.status] ?? ['', r.status]
                return (
                  <tr key={r.id}>
                    <td>
                      {r.post_id && r.post_lang ? (
                        <Link className="ptitle" href={`/admin/edit/${r.post_lang}/${r.post_id}`}>{r.title}</Link>
                      ) : (
                        <span>{r.title}</span>
                      )}
                      <div className="meta"><a href={r.url} target="_blank" rel="noopener">orijinal ↗</a>{r.error && ` · ${r.error.replace(/^⟳ /, '')}`}</div>
                    </td>
                    <td className="hide-sm">{byId.get(r.source_id)?.name ?? '—'} <span className="meta">{byId.get(r.source_id)?.lang.toUpperCase()}</span></td>
                    <td><span className={`badge ${cls}`}>{label}</span></td>
                    <td className="hide-sm meta">{formatBaku(r.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
