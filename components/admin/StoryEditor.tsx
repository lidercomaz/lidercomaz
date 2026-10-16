'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Lang } from '@/lib/types'
import { api, fromLocalInput, toLocalInput, uploadImage, type AdminCategory } from './api'
import { RichEditor } from './RichEditor'

const LANGS: Lang[] = ['az', 'ru']
const SITE_LABEL: Record<Lang, string> = { az: 'lider.com.az', ru: 'ru.lider.com.az' }
const other = (l: Lang): Lang => (l === 'az' ? 'ru' : 'az')

interface LangState {
  title: string
  title_extra: string
  is_red: boolean
  body: string
  excerpt: string
}

interface Shared {
  category_id: number
  image: string | null
  imageFull: string | null
  published: string // datetime-local (Baku), '' = now
  is_published: boolean
  show_on_main: boolean
  is_pinned: boolean
}

interface StoryRow {
  id: number
  title: string
  title_extra: string | null
  is_red: boolean
  body: string
  excerpt: string | null
  image: string | null
  image_full?: string | null
  category_ids: number[]
  published_at: string
  is_published: boolean
  show_on_main: boolean
  is_pinned: boolean
}

interface SaveResult {
  posts: Partial<Record<Lang, { id: number; url: string }>>
  warnings: string[]
}

const emptyLang = (): LangState => ({ title: '', title_extra: '', is_red: false, body: '', excerpt: '' })
const filled = (s: LangState) => s.title.trim() !== ''
const hasText = (html: string) => html.replace(/<[^>]*>|&nbsp;/g, '').trim() !== '' || /<(img|iframe)\b/i.test(html)

function fromRow(r: StoryRow): LangState {
  return { title: r.title, title_extra: r.title_extra ?? '', is_red: r.is_red, body: r.body, excerpt: r.excerpt ?? '' }
}

export function StoryEditor({ edit }: { edit?: { lang: Lang; id: number } }) {
  const router = useRouter()
  const [cats, setCats] = useState<AdminCategory[]>([])
  const [canTranslate, setCanTranslate] = useState(false)
  const [loading, setLoading] = useState(Boolean(edit))
  const [shared, setShared] = useState<Shared>({ category_id: 1, image: null, imageFull: null, published: '', is_published: true, show_on_main: true, is_pinned: false })
  const [langs, setLangs] = useState<Record<Lang, LangState>>({ az: emptyLang(), ru: emptyLang() })
  const [ids, setIds] = useState<Record<Lang, number | null>>({ az: null, ru: null })
  const [editorKey, setEditorKey] = useState<Record<Lang, number>>({ az: 0, ru: 0 })
  const [autoTranslate, setAutoTranslate] = useState(!edit)
  const [translating, setTranslating] = useState<Lang | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SaveResult | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    api<AdminCategory[]>('/api/admin/categories').then(setCats).catch((e) => setError(e.message))
    api<{ available: boolean }>('/api/admin/translate').then((r) => setCanTranslate(r.available)).catch(() => {})
    if (!edit) return
    api<Record<Lang, StoryRow | null>>(`/api/admin/posts/${edit.lang}/${edit.id}`)
      .then((story) => {
        const main = story[edit.lang]!
        setShared({
          category_id: main.category_ids[0] ?? 1,
          image: main.image,
          imageFull: main.image_full ?? null,
          published: toLocalInput(main.published_at),
          is_published: main.is_published,
          show_on_main: main.show_on_main,
          is_pinned: main.is_pinned,
        })
        setLangs({ az: story.az ? fromRow(story.az) : emptyLang(), ru: story.ru ? fromRow(story.ru) : emptyLang() })
        setIds({ az: story.az?.id ?? null, ru: story.ru?.id ?? null })
        setEditorKey((k) => ({ az: k.az + 1, ru: k.ru + 1 }))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [edit])

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const setLang = (l: Lang, patch: Partial<LangState>) => {
    setLangs((s) => ({ ...s, [l]: { ...s[l], ...patch } }))
    setDirty(true)
  }
  const setSh = (patch: Partial<Shared>) => {
    setShared((s) => ({ ...s, ...patch }))
    setDirty(true)
  }

  async function translate(from: Lang) {
    const to = other(from)
    const src = langs[from]
    if (!filled(src)) return setError(`Əvvəlcə ${from.toUpperCase()} başlığını yazın`)
    if (filled(langs[to]) && !confirm(`${to.toUpperCase()} sütunundakı mətn tərcümə ilə əvəz olunsun?`)) return
    setTranslating(from)
    setError(null)
    try {
      const t = await api<{ title: string; title_extra: string | null; body: string }>('/api/admin/translate', {
        method: 'POST',
        json: { from, title: src.title, title_extra: src.title_extra || null, body: src.body },
      })
      setLang(to, { title: t.title, title_extra: t.title_extra ?? '', body: t.body, is_red: src.is_red, excerpt: '' })
      setEditorKey((k) => ({ ...k, [to]: k[to] + 1 }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTranslating(null)
    }
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    setResult(null)
    const ready = LANGS.filter((l) => filled(langs[l]))
    if (!ready.length) return setError('Ən azı bir dildə başlıq yazın')
    for (const l of ready) if (!hasText(langs[l].body)) return setError(`${l.toUpperCase()} mətni boşdur`)
    if (edit && !filled(langs[edit.lang])) return setError(`${edit.lang.toUpperCase()} başlığı boş ola bilməz`)

    const payload = {
      ...Object.fromEntries(
        LANGS.map((l) => [
          l,
          filled(langs[l])
            ? { title: langs[l].title, title_extra: langs[l].title_extra || null, is_red: langs[l].is_red, body: langs[l].body, excerpt: langs[l].excerpt || null }
            : null,
        ]),
      ),
      translate: autoTranslate && canTranslate,
      category_id: shared.category_id,
      image: shared.image,
      image_full: shared.imageFull,
      published_at: shared.published ? fromLocalInput(shared.published) : edit ? undefined : new Date().toISOString(),
      is_published: shared.is_published,
      show_on_main: shared.show_on_main,
      is_pinned: shared.is_pinned,
    }

    setSaving(true)
    try {
      const res = edit
        ? await api<SaveResult>(`/api/admin/posts/${edit.lang}/${edit.id}`, { method: 'PATCH', json: payload })
        : await api<SaveResult>('/api/admin/posts', { method: 'POST', json: payload })
      setDirty(false)
      setResult(res)
      if (!edit) {
        const first = LANGS.find((l) => res.posts[l])
        if (first) router.replace(`/admin/edit/${first}/${res.posts[first]!.id}?saved=1`)
      } else {
        setIds({ az: res.posts.az?.id ?? ids.az, ru: res.posts.ru?.id ?? ids.ru })
        // A translation created on the server shows up after reloading the story.
        if (LANGS.some((l) => res.posts[l] && !filled(langs[l]))) router.refresh()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // Ctrl/Cmd+S saves.
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const [justCreated, setJustCreated] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the ?saved flag left by the create redirect
    setJustCreated(new URLSearchParams(window.location.search).has('saved'))
  }, [])

  if (loading) return <div className="empty">Yüklənir…</div>

  const missing = LANGS.filter((l) => !filled(langs[l]))

  return (
    <form onSubmit={save}>
      <div className="adm-head">
        <h1>{edit ? `Redaktə · ${edit.lang.toUpperCase()} #${edit.id}` : 'Yeni xəbər'}</h1>
        <Link className="btn" href="/admin">← Siyahı</Link>
      </div>

      {error && <div className="notice err">{error}</div>}
      {justCreated && !result && !error && <div className="notice ok">Xəbər yaradıldı və saytlarda dərc olundu.</div>}
      {result && (
        <div className="notice ok">
          Yadda saxlanıldı.{' '}
          {LANGS.filter((l) => result.posts[l]).map((l) => (
            <span key={l}>
              <a href={result.posts[l]!.url} target="_blank" rel="noopener">{l.toUpperCase()} saytda bax ↗</a>{' '}
            </span>
          ))}
        </div>
      )}
      {result?.warnings.map((w) => <div key={w} className="notice warn">{w}</div>)}

      <div className="editor-grid">
        <div className="langs">
          {LANGS.map((l) => (
            <section key={l} className="card card-pad lang-col">
              <h2>
                <span className="flag">{l.toUpperCase()}</span>
                <span className="grow">
                  {SITE_LABEL[l]}
                  {ids[l] && <span className="meta"> · #{ids[l]}</span>}
                </span>
                {canTranslate && (
                  <button type="button" className="btn small" disabled={translating !== null || !filled(langs[l])} onClick={() => translate(l)}>
                    {translating === l ? 'Tərcümə olunur…' : `${other(l).toUpperCase()}-yə tərcümə et →`}
                  </button>
                )}
              </h2>
              <label className="field">
                <span>Başlıq</span>
                <input className="input title-input" value={langs[l].title} onChange={(e) => setLang(l, { title: e.target.value })} placeholder={l === 'az' ? 'Xəbərin başlığı' : 'Заголовок новости'} maxLength={300} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <label className="field">
                  <span>Qırmızı əlavə (başlıqdan sonra)</span>
                  <input className="input" value={langs[l].title_extra} onChange={(e) => setLang(l, { title_extra: e.target.value })} placeholder={l === 'az' ? 'məs. FOTO, VİDEO, Sensasiya' : 'напр. ФОТО, ВИДЕО'} maxLength={200} />
                </label>
                <label className="check" style={{ marginBottom: 22 }}>
                  <input type="checkbox" checked={langs[l].is_red} onChange={(e) => setLang(l, { is_red: e.target.checked })} />
                  Başlıq qırmızı
                </label>
              </div>
              <div className="field">
                <span>Mətn</span>
                <RichEditor key={`${l}-${editorKey[l]}`} value={langs[l].body} onChange={(body) => setLang(l, { body })} placeholder={l === 'az' ? 'Xəbərin mətni…' : 'Текст новости…'} />
              </div>
              <label className="field">
                <span>Qısa məzmun (boş qalsa mətndən avtomatik yaradılır)</span>
                <textarea className="input" rows={2} value={langs[l].excerpt} onChange={(e) => setLang(l, { excerpt: e.target.value })} maxLength={1000} />
              </label>
            </section>
          ))}
        </div>

        <aside className="side">
          <div className="card card-pad save-bar">
            <button className="btn primary" disabled={saving || translating !== null}>
              {saving ? (autoTranslate && missing.length && canTranslate ? 'Tərcümə və dərc…' : 'Yadda saxlanılır…') : edit ? 'Yadda saxla' : 'Dərc et'}
            </button>
            {canTranslate ? (
              <label className="check" style={{ margin: 0 }}>
                <input type="checkbox" checked={autoTranslate} onChange={(e) => setAutoTranslate(e.target.checked)} />
                Boş qalan dili avtomatik tərcümə et
              </label>
            ) : (
              <span className="hint">Avtomatik tərcümə qoşulmayıb. Boş qalan dil yalnız bir saytda dərc olunur.</span>
            )}
            {missing.length === 1 && (
              <span className="hint">
                {missing[0].toUpperCase()} sütunu boşdur — {autoTranslate && canTranslate ? 'saxlayanda avtomatik tərcümə ediləcək.' : `xəbər ${SITE_LABEL[missing[0]]}-da görünməyəcək.`}
              </span>
            )}
            <span className="hint">Ctrl/⌘ + S — yadda saxla</span>
          </div>

          <div className="card card-pad">
            <h3>Şəkil</h3>
            <ImageField value={shared.image} full={shared.imageFull} onChange={(image, imageFull) => setSh({ image, imageFull })} />
          </div>

          <div className="card card-pad">
            <h3>Parametrlər</h3>
            <label className="field">
              <span>Kateqoriya</span>
              <select className="select" value={shared.category_id} onChange={(e) => setSh({ category_id: Number(e.target.value) })}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.az} / {c.ru}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Dərc tarixi (Bakı vaxtı)</span>
              <input className="input" type="datetime-local" value={shared.published} onChange={(e) => setSh({ published: e.target.value })} />
              <span className="hint">{shared.published ? 'Gələcək tarix seçilsə, xəbər həmin vaxt görünəcək.' : 'Boş — indi dərc olunur.'}</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={shared.is_published} onChange={(e) => setSh({ is_published: e.target.checked })} />
              Dərc olunsun (söndürülsə — qaralama)
            </label>
            <label className="check">
              <input type="checkbox" checked={shared.show_on_main} onChange={(e) => setSh({ show_on_main: e.target.checked })} />
              Ana səhifədə göstər
            </label>
            <label className="check">
              <input type="checkbox" checked={shared.is_pinned} onChange={(e) => setSh({ is_pinned: e.target.checked })} />
              Bərkidilmiş
            </label>
          </div>
        </aside>
      </div>
    </form>
  )
}

function ImageField({ value, full, onChange }: { value: string | null; full: string | null; onChange: (image: string | null, full: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function upload(f: File | undefined) {
    if (!f) return
    if (!f.type.startsWith('image/')) return setErr('Yalnız şəkil faylı')
    setBusy(true)
    setErr(null)
    try {
      const r = await uploadImage(f)
      onChange(r.image, r.full)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function fromUrl() {
    const url = prompt('Şəklin linki (https://…)')
    if (!url) return
    setBusy(true)
    setErr(null)
    try {
      const r = await api<{ image: string; full: string }>('/api/admin/upload', { method: 'POST', json: { url } })
      onChange(r.image, r.full)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {err && <div className="notice err">{err}</div>}
      {value ? (
        <div className="img-preview">
          <img src={full ?? value.replace(/-s\.webp$/, '.webp')} alt="" />
          <button type="button" className="btn small" onClick={() => onChange(null, null)}>Sil</button>
        </div>
      ) : (
        <div
          className={`img-drop${over ? ' over' : ''}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]) }}
        >
          {busy ? 'Yüklənir…' : 'Şəkli bura atın və ya klikləyin'}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" className="btn small" disabled={busy} onClick={() => input.current?.click()}>{value ? 'Dəyiş' : 'Fayl seç'}</button>
        <button type="button" className="btn small" disabled={busy} onClick={fromUrl}>Linkdən</button>
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>Şəkil xəbərin əvvəlində və kartlarda göstərilir. WebP-yə çevrilib imgbb-yə yüklənir.</p>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
    </>
  )
}
