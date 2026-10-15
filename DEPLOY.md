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

## 2. Şəkillər: imgbb-yə köçürmə

```bash
# 1) Bütün şəkilləri WebP formatına çevirib imgbb-yə yükləyir (dayansa, yenidən işə salanda qaldığı yerdən davam edir)
node --env-file=.env.local scripts/migrate-images.mjs upload

# 2) Alınmayanları bir daha yoxlayır
node --env-file=.env.local scripts/migrate-images.mjs upload --retry-errors

# 3) Xəbərlərdəki şəkil linklərini imgbb linkləri ilə əvəz edir
node --env-file=.env.local scripts/migrate-images.mjs apply

# 4) Yenilənmiş xəbərləri Supabase-ə yazır
node --env-file=.env.local scripts/import-supabase.mjs
```

Köhnə şəkil → yeni link uyğunluğu `.data/image-map.json` faylında saxlanılır. Bu faylı ehtiyat üçün saxla.

## 3. Vercel: deploy

Deploy-u yalnız Supabase-ə idxal bitdikdən **sonra** et. Ana səhifə build zamanı bazadan oxunur, baza boş olsa build xəta verəcək.

1. vercel.com → **Add New… → Project** → GitHub-dan `lidercomaz/lidercomaz` reposunu **Import** et.
2. Framework: **Next.js** (avtomatik seçilir), Root Directory: `./`. Build ayarlarına toxunma.
3. **Environment Variables** bölməsinə bunları əlavə et (hər üçü Production, Preview və Development üçün):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → `anon` `public` açarı |
   | `IMGBB_API_KEY` | imgbb API açarı (**Sensitive** işarələ) |

   `SUPABASE_SERVICE_ROLE_KEY` hələlik Vercel-ə **əlavə etmə**. Bu açar yalnız admin panel qurulanda lazım olacaq və hər zaman **Sensitive** olmalıdır.
4. **Deploy** düyməsinə bas. Bir neçə dəqiqədən sonra sayt `https://<layihə>.vercel.app` ünvanında açılacaq (AZ versiya).
5. **Settings → Functions → Function Region**: Supabase layihənin regionu ilə eyni regionu seç (məsələn Frankfurt, `fra1`).

### RU versiyanı test etmək

**Settings → Domains → Add**. Ünvan `ru-` ilə başlamalıdır, məsələn `ru-lidercomaz.vercel.app`. Sayt bu ünvanda avtomatik rus versiyasını göstərəcək.

### Domenin köçürülməsi (son mərhələ, hər şey yoxlanandan sonra)

1. Vercel → Domains bölməsinə `lider.com.az`, `www.lider.com.az` və `ru.lider.com.az` domenlərini əlavə et.
2. Vercel hansı DNS qeydlərinin lazım olduğunu göstərəcək (A `76.76.21.21`, CNAME `cname.vercel-dns.com`). Onları DNS panelində yaz.
3. ⚠️ `@lider.com.az` e-poçtları cPanel-dədir. MX qeydlərinə toxunma və poçtu köçürmədən hostinqi bağlama.

## Hazırkı vəziyyət

- AZ: https://lidercomaz.vercel.app · RU: https://ru-lidercomaz.vercel.app
- Vercel funksiyaları London regionunda işləyir (`vercel.json` → `lhr1`), Supabase də oradadır.
- `NEXT_PUBLIC_SITE_URL_AZ` / `NEXT_PUBLIC_SITE_URL_RU` hazırda `.vercel.app` ünvanlarına baxır. Domen köçürüləndə onları `https://lider.com.az` və `https://ru.lider.com.az` ilə əvəz edib redeploy et.
- imgbb pulsuz API təxminən 1000 yükləmədən sonra limit qoyur. `migrate-images.mjs` limitə düşəndə gözləyir və özü davam edir.

## Təhlükəsizlik

- `.env.local` və `.data/` git-ə düşmür (`.gitignore`).
- GitHub reposu hazırda **public**-dir. Kod hər kəsə açıqdır, açıq qalmasını istəmirsənsə: GitHub → Settings → Danger Zone → **Change visibility → Private**.
- `service_role` açarı bazaya tam giriş verir. Söhbətdə paylaşıldığı üçün quraşdırma bitəndən sonra onu yeniləmək tövsiyə olunur.
