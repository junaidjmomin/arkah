/* add social_posts table with RLS for NLP ingestion */

-- Social posts normalized from external platforms
create table if not exists public.social_posts (
  id text primary key,
  platform text not null,
  text text not null,
  lang text,
  keywords text[],
  relevance numeric,        -- 0..1
  category text,            -- e.g., flood, storm, wildfire
  severity int,             -- 0..5
  engagement int default 0, -- likes+shares+comments or similar
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create index if not exists social_posts_created_at_idx on public.social_posts(created_at desc);
create index if not exists social_posts_lat_idx on public.social_posts(lat);
create index if not exists social_posts_lng_idx on public.social_posts(lng);

alter table public.social_posts enable row level security;

-- Public read (map layer), no public insert/update
drop policy if exists "social_public_read" on public.social_posts;
create policy "social_public_read" on public.social_posts
for select
to anon, authenticated
using (true);

-- No public insert/update/delete policies; service role bypasses RLS
