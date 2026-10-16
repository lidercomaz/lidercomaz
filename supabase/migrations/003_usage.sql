-- Real database / file sizes for the admin panel's storage gauge. Run once in Supabase → SQL Editor. Safe to re-run.
create or replace function storage_usage() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'db_bytes', pg_database_size(current_database()),
    'posts_bytes', pg_total_relation_size('public.posts'),
    'storage_bytes', (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects)
  );
$$;
revoke execute on function storage_usage() from public, anon, authenticated;
