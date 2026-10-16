-- Admin panel: links the AZ and RU versions of one story. Run once in Supabase → SQL Editor.
-- Safe to re-run. The site keeps working before this runs (translations just aren't linked).

alter table posts add column if not exists group_id uuid;
create index if not exists posts_group_idx on posts (group_id) where group_id is not null;

-- Admin list/search over all posts (drafts and scheduled included) uses the service role, which bypasses RLS.
create index if not exists posts_admin_idx on posts (lang, published_at desc);
