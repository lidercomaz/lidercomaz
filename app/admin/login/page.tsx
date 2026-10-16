import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/admin/LoginForm'
import { hasSession } from '@/lib/admin/auth'

export const metadata = { title: 'Giriş' }

export default async function LoginPage() {
  if (await hasSession()) redirect('/admin')
  return <LoginForm />
}
