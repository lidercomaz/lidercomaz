import { canTranslate } from '@/lib/admin/translate'
import { SITE_URL } from '@/lib/site'

export const metadata = { title: 'Bot / API' }

const EXAMPLE = `{
  "az": {
    "title": "Bakıda güclü külək əsəcək",
    "title_extra": "XƏBƏRDARLIQ",
    "body": "Birinci abzas...\\n\\nİkinci abzas..."
  },
  "category": "gundem",
  "image_url": "https://example.com/photo.jpg"
}`

const RESPONSE = `{
  "posts": {
    "az": { "id": 5878, "url": "https://lider.com.az/gundem/5878-bakida-guclu-kulek-esecek.html" },
    "ru": { "id": 482,  "url": "https://ru.lider.com.az/gundem/482-v-baku-ozhidaetsya-silnyy-veter.html" }
  },
  "warnings": []
}`

export default function BotDocs() {
  const base = SITE_URL.az
  const tokenSet = Boolean(process.env.ADMIN_API_TOKEN && process.env.ADMIN_API_TOKEN.length >= 24)
  const translate = canTranslate()

  return (
    <div className="card card-pad doc" style={{ maxWidth: 920 }}>
      <h1 style={{ marginTop: 0 }}>Bot ilə xəbər əlavə etmək</h1>
      <p>
        Bot (məsələn, Gmail AI / Apps Script, Make, Zapier, n8n) xəbəri bir HTTP sorğusu ilə göndərir. Xəbər eyni anda{' '}
        <b>lider.com.az</b> və <b>ru.lider.com.az</b>-da dərc olunur; bot yalnız bir dildə göndərsə, digər dil avtomatik tərcümə edilir.
      </p>
      <p>
        Vəziyyət: API açarı {tokenSet ? <span className="badge ok">təyin edilib</span> : <span className="badge red">təyin edilməyib</span>} · Avtomatik tərcümə{' '}
        {translate ? <span className="badge ok">aktivdir</span> : <span className="badge red">qoşulmayıb (GEMINI_API_KEY)</span>}
      </p>

      <h2>Sorğu</h2>
      <pre>{`POST ${base}/api/admin/posts
Authorization: Bearer <ADMIN_API_TOKEN>
Content-Type: application/json

${EXAMPLE}`}</pre>
      <p>
        Açar (<code>ADMIN_API_TOKEN</code>) Vercel → Project → Settings → Environment Variables bölməsində saxlanılır. Onu heç vaxt açıq yerdə
        paylaşmayın; açar dəyişdiriləndə botda da yeniləyin.
      </p>

      <h2>Sahələr</h2>
      <table>
        <tbody>
          <tr><th>az / ru</th><td><code>title</code> (vacib), <code>body</code> — mətn və ya HTML (boş sətirlə ayrılan abzaslar avtomatik formatlanır), <code>title_extra</code> — başlıqdan sonra qırmızı əlavə, <code>is_red</code>, <code>excerpt</code>. Ən azı bir dil lazımdır.</td></tr>
          <tr><th>translate</th><td>Default <code>true</code>: göndərilməyən dil avtomatik tərcümə olunur. <code>false</code> — yalnız göndərilən dil(lər) dərc olunur.</td></tr>
          <tr><th>category</th><td>Slug (<code>gundem, siyaset, iqtisadiyyat, medeniyyet, sosial, hadise, region, musahibe, dunya, idman, aktual, arasdirma, video, maraqli</code>) və ya ID. Default: Gündəm.</td></tr>
          <tr><th>image_url</th><td>Şəklin public linki — server yükləyib WebP-yə çevirir.</td></tr>
          <tr><th>published_at</th><td>ISO tarix, məs. <code>2026-10-16T15:00:00+04:00</code>. Gələcək tarix — planlaşdırılmış xəbər. Default: indi.</td></tr>
          <tr><th>is_published</th><td><code>false</code> — qaralama kimi saxlanılır (paneldən yoxlayıb dərc etmək üçün).</td></tr>
          <tr><th>show_on_main</th><td>Ana səhifədə göstərilsin (default <code>true</code>).</td></tr>
        </tbody>
      </table>

      <h2>Cavab (201)</h2>
      <pre>{RESPONSE}</pre>
      <p>Xəta olduqda: <code>400</code> — sahələr yanlışdır, <code>401</code> — açar yanlışdır, <code>502</code> — tərcümə alınmadı. Cavabda <code>{'{ "error": "…" }'}</code> olur.</p>

      <h2>curl ilə test</h2>
      <pre>{`curl -X POST ${base}/api/admin/posts \\
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"az":{"title":"Test xəbər","body":"Mətn"},"is_published":false}'`}</pre>

      <h2>Digər əməliyyatlar</h2>
      <table>
        <tbody>
          <tr><td><code>GET /api/admin/posts?lang=az&amp;q=…&amp;page=1</code></td><td>Siyahı</td></tr>
          <tr><td><code>GET /api/admin/posts/az/5878</code></td><td>Xəbər (AZ + əlaqəli RU)</td></tr>
          <tr><td><code>PATCH /api/admin/posts/az/5878</code></td><td>Yeniləmə (POST ilə eyni sahələr; yalnız göndərilənlər dəyişir)</td></tr>
          <tr><td><code>DELETE /api/admin/posts/az/5878?both=1</code></td><td>Silmə (<code>both=1</code> — tərcüməsi ilə birlikdə)</td></tr>
          <tr><td><code>POST /api/admin/upload</code></td><td>Şəkil (multipart <code>file</code> və ya JSON <code>{'{"url": "…"}'}</code>)</td></tr>
        </tbody>
      </table>
    </div>
  )
}
