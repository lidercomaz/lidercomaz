import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/AdminNav'
import { hasSession } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasSession())) redirect('/admin/login')
  return (
    <>
      <AdminNav />
      <main className="adm-main">{children}</main>
    </>
  )
}
