'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { NO_IMAGE } from '@/lib/format'
import type { Lang } from '@/lib/types'
import { api, formatBaku, publicUrl, type AdminCategory } from './api'

interface Row {
  lang: Lang
  id: number
  slug: string
  title: string
  title_extra: string | null
  is_red: boolean
  image: string | null
  category_ids: number[]
  published_at: string
  is_published: boolean
  show_on_main: boolean
  views: number
  translation: number | null
}

interface ListResponse {
  total: number
  page: number
  perPage: number
  rows: Row[]
}

function status(r: Row) {
  if (!r.is_published) return <span className="badge">Qaralama</span>
  if (Date.parse(r.published_at) > Date.now()) return <span className="badge warn">Planlaşdırılıb</span>
  return <span className="badge ok">Dərc olunub</span>
}

export function PostList() {
  const [lang, setLang] = useState<Lang>('az')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(0)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ListResponse | null>(null)
  const [cats, setCats] = useState<AdminCategory[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<AdminCategory[]>('/api/admin/categories').then(setCats).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams({ lang, page: String(page) })
      if (query) sp.set('q', query)
      if (category) sp.set('category', String(category))
      setData(await api<ListResponse>(`/api/admin/posts?${sp}`))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [lang, page, query, category])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches the list whenever the filters change
    load()
  }, [load])

  async function remove(r: Row) {
    if (!confirm(`Bu xəbər silinsin? Bu əməliyyat geri qaytarılmır.\n\n"${r.title}"`)) return
    const other = r.lang === 'az' ? 'RU' : 'AZ'
    const both = r.translation !== null && confirm(`${other} versiyası (#${r.translation}) da silinsin?\n\nOK — hər iki dildə sil\nLəğv et — yalnız ${r.lang.toUpperCase()} versiyasını sil`)
    try {
      await api(`/api/admin/posts/${r.lang}/${r.id}${both ? '?both=1' : ''}`, { method: 'DELETE' })
      load()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1
  const otherLang: Lang = lang === 'az' ? 'ru' : 'az'
  const catName = (id: number) => cats.find((c) => c.id === id)?.[lang] ?? '—'

  return (
    <>
      <div className="adm-head">
        <h1>Xəbərlər</h1>
        <div className="tabs">
          {(['az', 'ru'] as Lang[]).map((l) => (
            <button key={l} className={lang === l ? 'on' : undefined} onClick={() => { setLang(l); setPage(1) }}>
              {l === 'az' ? 'AZ · lider.com.az' : 'RU · ru.lider.com.az'}
            </button>
          ))}
        </div>
        <Link className="btn primary" href="/admin/new">+ Yeni xəbər</Link>
      </div>

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q.trim()) }}>
        <input className="input" type="search" placeholder="Başlıq və ya ID ilə axtar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={category} onChange={(e) => { setCategory(Number(e.target.value)); setPage(1) }}>
          <option value={0}>Bütün kateqoriyalar</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c[lang]}</option>)}
        </select>
        <button className="btn">Axtar</button>
        {data && <span className="hint" style={{ alignSelf: 'center' }}>Cəmi: {data.total.toLocaleString('az')}</span>}
      </form>

      {error && <div className="notice err">{error}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading && !data ? (
          <div className="empty">Yüklənir…</div>
        ) : !data?.rows.length ? (
          <div className="empty">Xəbər tapılmadı.</div>
        ) : (
          <table className="posts" style={{ opacity: loading ? 0.6 : 1 }}>
            <thead>
              <tr>
                <th className="hide-sm" />
                <th>Başlıq</th>
                <th className="hide-sm">Kateqoriya</th>
                <th>Status</th>
                <th className="hide-sm">{otherLang.toUpperCase()} versiya</th>
                <th className="hide-sm">Baxış</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="hide-sm"><img className="thumb" src={r.image ?? NO_IMAGE} alt="" loading="lazy" /></td>
                  <td>
                    <Link className="ptitle" href={`/admin/edit/${r.lang}/${r.id}`}>
                      <span className={r.is_red ? 'red' : undefined}>{r.title}</span>
                      {r.title_extra && <span className="red"> {r.title_extra}</span>}
                    </Link>
                    <div className="meta">#{r.id} · {formatBaku(r.published_at)}{!r.show_on_main && ' · ana səhifədə yox'}</div>
                  </td>
                  <td className="hide-sm">{catName(r.category_ids[0])}</td>
                  <td>{status(r)}</td>
                  <td className="hide-sm">
                    {r.translation ? (
                      <Link className="badge ok" href={`/admin/edit/${otherLang}/${r.translation}`}>#{r.translation} ✓</Link>
                    ) : (
                      <span className="badge">yoxdur</span>
                    )}
                  </td>
                  <td className="hide-sm">{r.views.toLocaleString('az')}</td>
                  <td>
                    <div className="actions">
                      <a className="btn small" href={publicUrl(r.lang, r, cats)} target="_blank" rel="noopener" title="Saytda bax">↗</a>
                      <Link className="btn small" href={`/admin/edit/${r.lang}/${r.id}`}>Redaktə</Link>
                      <button className="btn small danger" onClick={() => remove(r)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && pages > 1 && (
          <div className="pager">
            <button className="btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Əvvəlki</button>
            <span className="hint">Səhifə {page} / {pages}</span>
            <button className="btn small" disabled={page >= pages} onClick={() => setPage(page + 1)}>Növbəti →</button>
          </div>
        )}
      </div>
    </>
  )
}
