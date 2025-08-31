-- Initial schema for crowd reporting platform

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto; -- ensure the correct extension for gen_random_uuid()

-- Profiles linked to auth.users (optional for later auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Reports table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  category text not null,
  severity text not null,
  notes text,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  consent boolean not null default false,
  status text not null default 'pending',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reports_created_at_idx on public.reports(created_at desc);
create index if not exists reports_lat_idx on public.reports(lat);
create index if not exists reports_lng_idx on public.reports(lng);
alter table public.reports enable row level security;

-- Report media table
create table if not exists public.report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  size bigint,
  created_at timestamptz not null default now()
);
create index if not exists report_media_report_id_idx on public.report_media(report_id);
alter table public.report_media enable row level security;

-- RLS policies
-- Profiles: users can see/update their own; public cannot read others
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Reports: anyone can insert consented reports; anyone can read consented reports
drop policy if exists "reports_public_read_consent" on public.reports;
create policy "reports_public_read_consent" on public.reports
for select
to anon, authenticated
using (consent = true);

drop policy if exists "reports_public_insert_consent" on public.reports;
create policy "reports_public_insert_consent" on public.reports
for insert
to anon, authenticated
with check (consent = true);

-- No public update/delete by default
-- (Admins can use service role which bypasses RLS)

-- Report media: visible only if parent report is consented
drop policy if exists "media_read_if_parent_consented" on public.report_media;
create policy "media_read_if_parent_consented" on public.report_media
for select
to anon, authenticated
using (exists (select 1 from public.reports r where r.id = report_media.report_id and r.consent = true));

-- Insert restricted to service role; no public insert policy

-- Storage: public bucket for report media (public read); writes by service role only
insert into storage.buckets (id, name, public)
values ('report-media', 'report-media', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists "Public read report-media" on storage.objects;
create policy "Public read report-media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'report-media');

-- Do NOT add a public insert policy; only service role will upload
