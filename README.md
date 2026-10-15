# Lider.com.az

Next.js 16 rebuild of lider.com.az (AZ) and ru.lider.com.az (RU), migrated from DataLife Engine 14.

- `proxy.ts` picks the language from the host (`ru.` → RU) and rewrites to `app/[lang]/...`.
- Old DLE URLs keep working: `/{category}/{id}-{slug}.html`, `/{category}/page/{n}/`, `/index.php?do=search&story=`.
- Design: original DLE templates — desktop `theme` in `public/theme/`, phones get the `smartphone` template (`app/m/...`, `public/theme-m/`) on the same URLs (proxy.ts checks the User-Agent).
- Data: Supabase (`supabase/schema.sql`). Without Supabase env vars, dev reads `.data/{az,ru}/*.json`.

## Local

```bash
npm install
npm run dev
```

AZ: http://localhost:3000 · RU: http://ru.localhost:3000

## Migration

1. `python3 -I scripts/migrate/dump_to_json.py <dump.sql.gz> ../data/<lang> dle_post,dle_post_extras,dle_category,dle_static,dle_tags,dle_images`
2. `python3 -I scripts/migrate/clean_posts.py ../data <lang> .data`
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. `cp .env.example .env.local`, fill in the keys, then `node --env-file=.env.local scripts/import-supabase.mjs`
