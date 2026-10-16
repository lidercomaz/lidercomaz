'use client'

import { useState } from 'react'
import { SITE } from '@/lib/site'
import type { Lang } from '@/lib/types'

export function ContactForm({ lang }: { lang: Lang }) {
  const t = SITE[lang].contact
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [renderedAt] = useState(() => Date.now())

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setState('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(fd), t: renderedAt }),
      })
      if (!res.ok) throw new Error(String(res.status))
      form.reset()
      setState('sent')
    } catch {
      setState('failed')
    }
  }

  if (state === 'sent') return <div className="contact-notice ok" role="status">{t.sent}</div>

  return (
    <form className="contact-form" onSubmit={submit}>
      {state === 'failed' && <div className="contact-notice err" role="alert">{t.failed}</div>}
      <div className="contact-row">
        <label>
          <span>{t.name}</span>
          <input name="name" required minLength={2} maxLength={100} autoComplete="name" />
        </label>
        <label>
          <span>{t.email}</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" />
        </label>
      </div>
      <div className="contact-row">
        <label>
          <span>{t.phone}</span>
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
        </label>
        <label>
          <span>{t.subject}</span>
          <input name="subject" maxLength={200} />
        </label>
      </div>
      <label>
        <span>{t.message}</span>
        <textarea name="message" required minLength={10} maxLength={5000} rows={6} />
      </label>
      {/* honeypot: hidden from people, filled in by bots */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="contact-hp" />
      <button type="submit" disabled={state === 'sending'}>{state === 'sending' ? t.sending : t.send}</button>
    </form>
  )
}
