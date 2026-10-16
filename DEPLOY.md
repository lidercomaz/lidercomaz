# Quraşdırma və deploy təlimatı

Açarları (key) heç vaxt GitHub-a yazmayın. Lokalda onlar `.env.local` faylında saxlanılır, Vercel-də isə **Environment Variables** bölməsində.

## 1. Supabase: cədvəlləri yaratmaq (bir dəfə)

1. supabase.com → layihəni aç → sol menyuda **SQL Editor** → **New query**.
2. Bu repodakı [`supabase/schema.sql`](supabase/schema.sql) faylının **bütün** məzmununu kopyala və yapışdır.
3. **Run** düyməsinə bas. Nəticədə "Success. No rows returned" yazısı görünməlidir.
4. **Table Editor** bölməsində `categories`, `posts` və `pages` cədvəlləri görünməlidir.

Bundan sonra xəbərlər lokal kompüterdən idxal olunur:

```bash
node --env-file=.env.local scripts/import-supabase.mjs
```

## 2. Şəkillər: Supabase Storage

Şəkillər Supabase-in public `images` bucket-ində WebP formatında saxlanılır. Hər şəkil iki ölçüdədir: 1200 px məqalə üçün, 480 px kartlar üçün. Sayt onları `/img/...` ünvanı ilə göstərir və Vercel CDN-də keşləyir, buna görə Supabase trafiki hər fayl üçün təxminən bir dəfə istifadə olunur.

```bash
# 1) Şəkilləri bucket-ə yükləyir (dayansa, yenidən işə salanda qaldığı yerdən davam edir)
node --env-file=.env.local scripts/migrate-images.mjs upload

# 2) Alınmayanları bir daha yoxlayır
node --env-file=.env.local scripts/migrate-images.mjs upload --retry-errors

# 3) Xəbərlərdəki şəkil linklərini /img/... linkləri ilə əvəz edir
node --env-file=.env.local scripts/migrate-images.mjs apply

# 4) Yenilənmiş xəbərləri Supabase-ə yazır
node --env-file=.env.local scripts/import-supabase.mjs
```

Köhnə şəkil → yeni link uyğunluğu `.data/storage-map.json` faylında saxlanılır.

## 3. Vercel: deploy

Deploy-u yalnız Supabase-ə idxal bitdikdən **sonra** et. Ana səhifə build zamanı bazadan oxunur, baza boş olsa build xəta verəcək.

1. vercel.com → **Add New… → Project** → GitHub-dan `lidercomaz/lidercomaz` reposunu **Import** et.
2. Framework: **Next.js** (avtomatik seçilir), Root Directory: `./`. Build ayarlarına toxunma.
3. **Environment Variables** bölməsinə bunları əlavə et (hər üçü Production, Preview və Development üçün):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → `anon` `public` açarı |

   Admin panel üçün əlavə olaraq (hamısı **Sensitive**, yalnız Production): `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_API_TOKEN` və istəyə görə `GEMINI_API_KEY` (avtomatik tərcümə). Bax: aşağıdakı "İdarəetmə paneli" bölməsi.
4. **Deploy** düyməsinə bas. Bir neçə dəqiqədən sonra sayt `https://<layihə>.vercel.app` ünvanında açılacaq (AZ versiya).
5. **Settings → Functions → Function Region**: Supabase layihənin regionu ilə eyni regionu seç (məsələn Frankfurt, `fra1`).

### RU versiyanı test etmək

**Settings → Domains → Add**. Ünvan `ru-` ilə başlamalıdır, məsələn `ru-lidercomaz.vercel.app`. Sayt bu ünvanda avtomatik rus versiyasını göstərəcək.

### Domenin köçürülməsi (son mərhələ, hər şey yoxlanandan sonra)

1. Vercel → Domains bölməsinə `lider.com.az`, `www.lider.com.az` və `ru.lider.com.az` domenlərini əlavə et.
2. Vercel hansı DNS qeydlərinin lazım olduğunu göstərəcək (A `76.76.21.21`, CNAME `cname.vercel-dns.com`). Onları DNS panelində yaz.
3. ⚠️ `@lider.com.az` e-poçtları cPanel-dədir. MX qeydlərinə toxunma və poçtu köçürmədən hostinqi bağlama.

## Hazırkı vəziyyət

- AZ: https://lider.com.az · RU: https://ru.lider.com.az (test: lidercomaz.vercel.app, ru-lidercomaz.vercel.app)
- DNS: Cloudflare (nameserver-lər online.az-da), qeydlər Vercel-ə yönəlir, proxy sönülüdür (DNS only).
- Vercel funksiyaları London regionunda işləyir (`vercel.json` → `lhr1`), Supabase də oradadır.
- `NEXT_PUBLIC_SITE_URL_AZ` = `https://lider.com.az`, `NEXT_PUBLIC_SITE_URL_RU` = `https://ru.lider.com.az`.
- Poçt: köhnə cPanel poçtu istifadə olunmur; yeni poçt Zoho Mail ilə qurulacaq (MX/SPF/DKIM qeydləri Cloudflare-ə yazılacaq).

## İdarəetmə paneli

- Ünvan: **https://lider.com.az/admin** (`ru.lider.com.az/admin` ora yönləndirilir). Bir panel hər iki saytı idarə edir.
- Yeni xəbər hər iki saytda eyni anda dərc olunur: AZ və RU sütunlarını doldurun, ya da birini doldurub "tərcümə et" düyməsini basın. Boş qalan dil saxlayanda avtomatik tərcümə edilir (`GEMINI_API_KEY` təyin olunubsa).
- Dərc/yeniləmə/silmədən sonra hər iki sayt (desktop + mobil) dərhal yenilənir.
- Yeni şəkillər (panel, redaktor, bot) WebP-yə çevrilib **imgbb**-yə yüklənir (`IMGBB_API_KEY`). Supabase-ə şəkil yazılmır; köhnə arxiv şəkilləri Supabase-də qalır (`/img/…`).
- Bot (Gmail AI, Make, Zapier, n8n …) üçün API: panelin **Bot / API** səhifəsində təsvir olunub — `POST /api/admin/posts`, `Authorization: Bearer <ADMIN_API_TOKEN>`.

### Xəbər botu (Mənbələr)

- Panel → **Mənbələr (bot)**: AZ saytı üçün Azərbaycan dilli, RU saytı üçün rus dilli saytlar əlavə olunur (dil avtomatik yoxlanılır, RSS lenti özü tapılır).
- Bot hər 10 dəqiqədən bir ([.github/workflows/news-bot.yml](.github/workflows/news-bot.yml)) yeni xəbərləri götürür, Gemini ilə öz sözlərimizlə yazır, əvvəlinə istinad cümləsini qoyur: AZ — "Lider.com.az istinadən bildirir ki, …", RU — "Как сообщает Lider.com.az, …". Mənbə saytın (və digər media qurumlarının) adı mətndə yazılmır.
- Hər mənbə üçün: aktiv/deaktiv, "öz sözlərimizlə yaz", "digər sayta da tərcümə et", "avtomatik dərc et" (söndürülsə qaralama), "şəkli götür", hər yoxlamada neçə xəbər.
- GitHub → Settings → Secrets and variables → Actions → `LIDER_API_TOKEN` = Vercel-dəki `ADMIN_API_TOKEN` ilə eyni dəyər.
- Bunun üçün Supabase-də [`supabase/migrations/002_sources.sql`](supabase/migrations/002_sources.sql) işlədilməlidir.

### Supabase limitləri (pulsuz plan) — necə qorunur

- **Baza (500 MB):** bot günlük limitlə işləyir — AZ 35, RU 15 xəbər (`BOT_DAILY_LIMIT_AZ`, `BOT_DAILY_LIMIT_RU`; cəmi heç vaxt 60-dan çox olmur; əl ilə əlavə olunan xəbərlər bloklanmır, amma günlük saya daxildir). Bir xəbər ~6 KB tutur: 50 xəbər/gün ≈ 105 MB/il ⇒ boş yer ~3,5–4 il çatır; 30/gün ≈ 6 il. Baza 450 MB-a çatsa, bot özü dayanır. Botun texniki qeydləri 7 gündən sonra silinir. Paneldə **Mənbələr** səhifəsində yaddaş göstəricisi var; dəqiq ölçü üçün [`supabase/migrations/003_usage.sql`](supabase/migrations/003_usage.sql) işlədin.
- **Fayllar (1 GB):** yeni şəkillər imgbb-yə gedir, Supabase-də yalnız köhnə arxiv qalır (~470 MB).
- **Trafik (5 GB/ay):** Supabase sorğuları Vercel data keşində saxlanılır (kateqoriyalar 1 gün, lentlər 10 dəq, xəbər 1 saat); yeni xəbər/redaktə keşi dərhal yeniləyir. Arxiv şəkilləri `/img/…` ilə CDN-də 1 il keşlənir.
- Bot eyni hadisəni iki dəfə dərc etmir: dərcdən əvvəl Gemini son 36 saatın başlıqları ilə müqayisə edir; hər yoxlamanın sonunda dublikatlar tapılıb sonrakı bot nüsxələri (tərcüməsi ilə) silinir. Paneldən yazılan xəbərlər silinmir.

### Bir dəfəlik: tərcümələri bir-birinə bağlamaq

Supabase → SQL Editor-da [`supabase/migrations/001_admin.sql`](supabase/migrations/001_admin.sql) faylını işlədin. Bundan sonra AZ və RU versiyalar bir-birinə bağlanır: paneldə birlikdə redaktə olunur, saytdakı AZ/RU düyməsi birbaşa xəbərin tərcüməsinə keçir. Migration işləməyibsə də panel işləyir, sadəcə versiyalar bağlanmır.

### Env dəyişənləri

| Ad | Nə üçün |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Bazaya yazmaq (yalnız serverdə) |
| `ADMIN_EMAIL` | Panelə giriş e-poçtu |
| `ADMIN_PASSWORD` | Panelə giriş şifrəsi. E-poçt və ya şifrə dəyişəndə bütün sessiyalar bağlanır |
| `ADMIN_API_TOKEN` | Bot açarı (ən azı 24 simvol) |
| `IMGBB_API_KEY` | Yeni şəkillərin imgbb-yə yüklənməsi (vacib) |
| `GEMINI_API_KEY` | Avtomatik AZ ↔ RU tərcümə, Google Gemini (istəyə görə) |
| `BOT_DAILY_LIMIT_AZ` / `BOT_DAILY_LIMIT_RU` | Botun günlük limiti (default 35 / 15, cəmi maks. 60) |
| `GEMINI_MODEL` | Gemini modeli (default `gemini-flash-latest`) |

Dəyişdirmək: Vercel → Project → Settings → Environment Variables, sonra **Redeploy**.

## Təhlükəsizlik

- `.env.local` və `.data/` git-ə düşmür (`.gitignore`).
- GitHub reposu hazırda **public**-dir. Kod hər kəsə açıqdır, açıq qalmasını istəmirsənsə: GitHub → Settings → Danger Zone → **Change visibility → Private**.
- `service_role` açarı bazaya tam giriş verir. Söhbətdə paylaşıldığı üçün quraşdırma bitəndən sonra onu yeniləmək tövsiyə olunur.
