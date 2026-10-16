'use client'

import { useEffect, useRef, useState } from 'react'
import { uploadImage } from './api'

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** Pasted text → paragraphs (formatting copied from Word or other sites is dropped on purpose). */
function textToHtml(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function youtubeEmbed(url: string) {
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

/**
 * Small WYSIWYG editor (contentEditable + execCommand) with an HTML source mode.
 * Uncontrolled: remount it (change `key`) to load new content from outside.
 */
export function RichEditor({ value, onChange, placeholder }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState(false)
  const [html, setHtml] = useState(value)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (area.current) area.current.innerHTML = value
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial content only; the editor is uncontrolled
  }, [])

  const emit = () => {
    const next = area.current?.innerHTML ?? ''
    const clean = next === '<br>' ? '' : next
    setHtml(clean)
    onChange(clean)
  }

  const exec = (cmd: string, arg?: string) => {
    area.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  const insert = (markup: string) => exec('insertHTML', markup)

  function toggleSource() {
    if (source) {
      setSource(false)
      requestAnimationFrame(() => {
        if (area.current) area.current.innerHTML = html
      })
    } else {
      setHtml(area.current?.innerHTML ?? html)
      setSource(true)
    }
  }

  function link() {
    const url = prompt('Link (https://…)')
    if (!url) return
    if (!/^(https?:\/\/|mailto:|\/)/.test(url)) return alert('Link https:// ilə başlamalıdır')
    exec('createLink', url)
  }

  function video() {
    const url = prompt('YouTube linki')
    if (!url) return
    const src = youtubeEmbed(url)
    if (!src) return alert('YouTube linki tanınmadı')
    insert(`<iframe src="${src}" width="560" height="315" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><p><br></p>`)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      const { full } = await uploadImage(f)
      insert(`<img src="${full}" alt=""><p><br></p>`)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const btn = (cmd: string, title: string, label: React.ReactNode, arg?: string) => (
    <button type="button" title={title} disabled={source} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd, arg)}>{label}</button>
  )

  return (
    <div className="rte">
      <div className="rte-bar">
        {btn('bold', 'Qalın (Ctrl+B)', <b>B</b>)}
        {btn('italic', 'Kursiv (Ctrl+I)', <i>I</i>)}
        {btn('underline', 'Altdan xətt', <u>U</u>)}
        <button type="button" title="Qırmızı mətn" disabled={source} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('foreColor', '#FF0000')} style={{ color: '#d00', fontWeight: 700 }}>A</button>
        <span className="sep" />
        {btn('formatBlock', 'Başlıq', 'H2', '<h2>')}
        {btn('formatBlock', 'Kiçik başlıq', 'H3', '<h3>')}
        {btn('formatBlock', 'Adi abzas', '¶', '<p>')}
        {btn('formatBlock', 'Sitat', '❝', '<blockquote>')}
        {btn('insertUnorderedList', 'Siyahı', '•')}
        {btn('insertOrderedList', 'Nömrəli siyahı', '1.')}
        <span className="sep" />
        <button type="button" title="Link" disabled={source} onMouseDown={(e) => e.preventDefault()} onClick={link}>🔗</button>
        {btn('unlink', 'Linki sil', '⛓̸')}
        <button type="button" title="Şəkil əlavə et" disabled={source || busy} onMouseDown={(e) => e.preventDefault()} onClick={() => file.current?.click()}>{busy ? '…' : '🖼'}</button>
        <button type="button" title="YouTube video" disabled={source} onMouseDown={(e) => e.preventDefault()} onClick={video}>▶</button>
        {btn('removeFormat', 'Formatı təmizlə', '⌫')}
        <span className="sep" />
        <button type="button" className={source ? 'on' : undefined} title="HTML kodu" onClick={toggleSource}>&lt;/&gt;</button>
        <input ref={file} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      {source ? (
        <textarea className="rte-src" value={html} onChange={(e) => { setHtml(e.target.value); onChange(e.target.value) }} spellCheck={false} />
      ) : null}
      <div
        ref={area}
        className="rte-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={source ? { display: 'none' } : undefined}
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          if (text) insert(/\n/.test(text) ? textToHtml(text) : escape(text))
        }}
      />
    </div>
  )
}
