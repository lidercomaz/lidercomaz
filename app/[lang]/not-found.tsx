import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="static-page" style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h1>404</h1>
      <p><Link href="/">lider.com.az</Link></p>
    </div>
  )
}
