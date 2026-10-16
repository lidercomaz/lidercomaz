'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from './api'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api('/api/admin/login', { method: 'POST', json: { email, password } })
      router.replace('/admin')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form onSubmit={submit}>
        <img src="/theme/images/logo.png" alt="Lider.com.az" />
        <p>İdarəetmə paneli</p>
        {error && <div className="notice err">{error}</div>}
        <label className="field">
          <span>E-poçt</span>
          <input className="input" type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Şifrə</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn primary" disabled={busy || !email || !password}>{busy ? 'Yoxlanılır…' : 'Daxil ol'}</button>
      </form>
    </div>
  )
}
