-- Schools (shared reference data)
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),

  -- Stable external identifier if available (API id / slug)
  source text,
  source_id text,

  name text not null,
  address text,
  website_url text,

  -- normalized levels (e.g., ['vmbo-tl','havo','vwo'])
  supported_levels text[] not null default '{}'::text[],

  lat double precision,
  lng double precision,

  last_synced_at timestamptz,
  created_at timestamptz not null default now(),

  unique (source, source_id)
);

alter table public.schools enable row level security;

-- Anyone signed in can read schools (reference data)
create policy "schools_select_authenticated"
on public.schools for select
to authenticated
using (true);

-- No writes from clients (imports run via server later)