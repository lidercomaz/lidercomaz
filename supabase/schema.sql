-- Lider.com.az schema. Run once in Supabase → SQL Editor.
-- One table set serves both sites; `lang` ('az' | 'ru') separates them.

create extension if not exists pg_trgm;

create table if not exists categories (
  lang        text    not null check (lang in ('az', 'ru')),
  id          int     not null,
  parent_id   int,
  name        text    not null,
  slug        text    not null,
  position    int     not null default 1,
  description text,
  primary key (lang, id),
  unique (lang, slug)
);

-- Per-language id sequences keep old DLE ids (and URLs) and continue after them.
create sequence if not exists posts_az_id_seq;
create sequence if not exists posts_ru_id_seq;

create table if not exists posts (
  lang          text        not null check (lang in ('az', 'ru')),
  id            int         not null,
  slug          text        not null,
  title         text        not null,
  title_extra   text,                    -- red suffix after title (DLE xfield "red")
  is_red        boolean     not null default false,  -- whole title red (DLE xfield "qirmizi")
  excerpt       text,
  body          text        not null default '',
  image         text,
  category_ids  int[]       not null default '{}',
  author        text,
  published_at  timestamptz not null default now(),
  is_published  boolean     not null default true,
  is_pinned     boolean     not null default false,
  show_on_main  boolean     not null default true,
  views         int         not null default 0,
  keywords      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (lang, id)
);

create index if not exists posts_feed_idx     on posts (lang, published_at desc) where is_published;
create index if not exists posts_category_idx on posts using gin (category_ids);
create index if not exists posts_title_trgm   on posts using gin (title gin_trgm_ops);

create or replace function posts_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.id is null then
    new.id := nextval(format('posts_%s_id_seq', new.lang)::regclass);
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists posts_before_write on posts;
create trigger posts_before_write before insert or update on posts
  for each row execute function posts_before_write();

-- Static pages (Haqqımızda, Reklam, Əlaqə ...)
create table if not exists pages (
  lang       text not null check (lang in ('az', 'ru')),
  slug       text not null,
  title      text not null,
  body       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (lang, slug)
);

-- After a bulk import, move sequences past the highest imported id.
create or replace function sync_post_sequences() returns void
language sql security definer set search_path = public as $$
  select setval('posts_az_id_seq', greatest((select max(id) from posts where lang = 'az'), 1));
  select setval('posts_ru_id_seq', greatest((select max(id) from posts where lang = 'ru'), 1));
$$;

create or replace function increment_views(p_lang text, p_id int) returns void
language sql security definer set search_path = public as $$
  update posts set views = views + 1 where lang = p_lang and id = p_id and is_published;
$$;

create or replace function search_posts(p_lang text, p_q text, p_limit int default 20, p_offset int default 0)
returns table (id int, slug text, title text, title_extra text, is_red boolean, image text,
               category_ids int[], published_at timestamptz, views int)
language sql stable set search_path = public as $$
  select id, slug, title, title_extra, is_red, image, category_ids, published_at, views
  from posts
  where lang = p_lang and is_published and published_at <= now()
    and (title ilike '%' || p_q || '%' or excerpt ilike '%' || p_q || '%')
  order by published_at desc
  limit least(p_limit, 50) offset p_offset;
$$;

-- Public read-only access; writes go through the service role (admin panel).
alter table categories enable row level security;
alter table posts      enable row level security;
alter table pages      enable row level security;

drop policy if exists "public read" on categories;
create policy "public read" on categories for select using (true);
drop policy if exists "public read" on posts;
create policy "public read" on posts for select using (is_published and published_at <= now());
drop policy if exists "public read" on pages;
create policy "public read" on pages for select using (true);

revoke execute on function sync_post_sequences() from public, anon, authenticated;
grant execute on function increment_views(text, int) to anon, authenticated;
grant execute on function search_posts(text, text, int, int) to anon, authenticated;
