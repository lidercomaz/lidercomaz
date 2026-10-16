-- News bot: source sites per language and the items already taken from them. Run once in Supabase → SQL Editor
-- (after 001_admin.sql). Safe to re-run.

create table if not exists sources (
  id              bigint generated always as identity primary key,
  lang            text        not null check (lang in ('az', 'ru')),  -- site the news goes to (and the language of the source)
  name            text        not null,                               -- shown in the attribution: "Milli.az"
  site_url        text        not null,
  feed_url        text        not null,                               -- RSS/Atom feed found for the site
  category_id     int,                                                -- used when the bot cannot pick a category
  is_active       boolean     not null default true,
  rewrite         boolean     not null default true,                  -- rewrite in our own words (false: keep the text, only add attribution)
  cross_post      boolean     not null default false,                 -- also translate and publish on the other-language site
  auto_publish    boolean     not null default true,                  -- false: saved as a draft for review in the panel
  with_image      boolean     not null default true,
  max_per_run     int         not null default 3 check (max_per_run between 1 and 20),
  last_checked_at timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  unique (lang, feed_url)
);

create table if not exists source_items (
  id         bigint generated always as identity primary key,
  source_id  bigint      not null references sources (id) on delete cascade,
  url        text        not null,
  title      text,
  status     text        not null check (status in ('seen', 'processing', 'published', 'draft', 'skipped', 'error')),
  post_lang  text,
  post_id    int,
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, url)
);

create index if not exists source_items_recent_idx on source_items (created_at desc) where status <> 'seen';

-- Only the server (service role) reads and writes these tables.
alter table sources      enable row level security;
alter table source_items enable row level security;
