// Serves images from the public Supabase Storage bucket "images" under our own domain.
// Responses are immutable and cached by the Vercel CDN, so Supabase egress is paid once per file.
const SAFE_PATH = /^[a-zA-Z0-9/_.-]+\.(webp|gif)$/

export async function GET(_: Request, { params }: RouteContext<'/img/[...path]'>) {
  const key = (await params).path.join('/')
  if (!SAFE_PATH.test(key) || key.includes('..')) return new Response(null, { status: 404 })

  const upstream = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${key}`,
    { cache: 'no-store' },
  )
  if (!upstream.ok) {
    return new Response(null, { status: upstream.status === 400 ? 404 : upstream.status, headers: { 'Cache-Control': 'public, s-maxage=60' } })
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/webp',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  })
}
