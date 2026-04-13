-- Tailor try-on MVP schema.
-- Run this in Supabase SQL Editor once for the project.

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  share_code text not null unique default substring(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  name text not null default '未命名客户',
  phone text default '',
  photo_url text default '',
  photo_set jsonb not null default '{}'::jsonb,
  measurements jsonb not null default '{}'::jsonb,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outfit_plans (
  id text primary key,
  title text not null,
  material text default '',
  fit text default '',
  shirt_color text not null default '#697f4d',
  shorts_color text not null default '#7f837b',
  image_url text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.try_on_results (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id text not null references public.outfit_plans(id) on delete cascade,
  image_url text not null,
  source text not null default 'manual_upload',
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, plan_id)
);

create table if not exists public.client_feedback (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id text not null references public.outfit_plans(id) on delete cascade,
  decision text not null check (decision in ('approved', 'revise')),
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, plan_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.clients
add column if not exists photo_set jsonb not null default '{}'::jsonb;

drop trigger if exists outfit_plans_set_updated_at on public.outfit_plans;
create trigger outfit_plans_set_updated_at
before update on public.outfit_plans
for each row execute function public.set_updated_at();

drop trigger if exists try_on_results_set_updated_at on public.try_on_results;
create trigger try_on_results_set_updated_at
before update on public.try_on_results
for each row execute function public.set_updated_at();

drop trigger if exists client_feedback_set_updated_at on public.client_feedback;
create trigger client_feedback_set_updated_at
before update on public.client_feedback
for each row execute function public.set_updated_at();

insert into public.outfit_plans (id, title, material, fit, shirt_color, shorts_color, image_url, sort_order)
values
  (
    'moss-henley',
    '苔绿色亨利衫 + 烟灰短裤',
    '竹节棉混纺，微弹短裤',
    '微宽松，肩线自然，裤长膝上',
    '#697f4d',
    '#7f837b',
    'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=80',
    10
  ),
  (
    'brick-henley',
    '砖红亨利衫 + 深青短裤',
    '洗旧棉，斜纹短裤',
    '胸腰保留活动量，袖口略收',
    '#b95742',
    '#315f6e',
    'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=900&q=80',
    20
  ),
  (
    'oat-henley',
    '燕麦白亨利衫 + 灰绿短裤',
    '轻亚麻感棉，水洗短裤',
    '清爽直身，适合夏季日常',
    '#e7dfd0',
    '#627665',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    30
  )
on conflict (id) do update
set
  title = excluded.title,
  material = excluded.material,
  fit = excluded.fit,
  shirt_color = excluded.shirt_color,
  shorts_color = excluded.shorts_color,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;

insert into storage.buckets (id, name, public)
values ('tailor-assets', 'tailor-assets', true)
on conflict (id) do update set public = true;

alter table public.clients enable row level security;
alter table public.outfit_plans enable row level security;
alter table public.try_on_results enable row level security;
alter table public.client_feedback enable row level security;

drop policy if exists "mvp public read clients" on public.clients;
create policy "mvp public read clients" on public.clients
for select using (true);

drop policy if exists "mvp public write clients" on public.clients;
create policy "mvp public write clients" on public.clients
for all using (true) with check (true);

drop policy if exists "mvp public read outfit plans" on public.outfit_plans;
create policy "mvp public read outfit plans" on public.outfit_plans
for select using (true);

drop policy if exists "mvp public write outfit plans" on public.outfit_plans;
create policy "mvp public write outfit plans" on public.outfit_plans
for all using (true) with check (true);

drop policy if exists "mvp public read try on results" on public.try_on_results;
create policy "mvp public read try on results" on public.try_on_results
for select using (true);

drop policy if exists "mvp public write try on results" on public.try_on_results;
create policy "mvp public write try on results" on public.try_on_results
for all using (true) with check (true);

drop policy if exists "mvp public read feedback" on public.client_feedback;
create policy "mvp public read feedback" on public.client_feedback
for select using (true);

drop policy if exists "mvp public write feedback" on public.client_feedback;
create policy "mvp public write feedback" on public.client_feedback
for all using (true) with check (true);

drop policy if exists "mvp public read storage" on storage.objects;
create policy "mvp public read storage" on storage.objects
for select using (bucket_id = 'tailor-assets');

drop policy if exists "mvp public upload storage" on storage.objects;
create policy "mvp public upload storage" on storage.objects
for insert with check (bucket_id = 'tailor-assets');

drop policy if exists "mvp public update storage" on storage.objects;
create policy "mvp public update storage" on storage.objects
for update using (bucket_id = 'tailor-assets') with check (bucket_id = 'tailor-assets');

drop policy if exists "mvp public delete storage" on storage.objects;
create policy "mvp public delete storage" on storage.objects
for delete using (bucket_id = 'tailor-assets');
