-- Open days imported annually (e.g. from schoolkeuze020.nl/open-dagen)

create table if not exists public.open_days (
  id uuid primary key default gen_random_uuid(),

  source text not null default 'schoolkeuze020',
  source_id text not null, -- stable id from importer (or generated)

  school_name text not null, -- as published on the source
  school_id uuid references public.schools(id) on delete set null, -- optional link (best effort match)

  starts_at timestamptz,
  ends_at timestamptz,

  location_text text,
  info_url text, -- source page or school page (best effort)
  notes text, -- extra text from source if any

  school_year_label text not null, -- e.g. '2025/26'
  last_synced_at timestamptz not null default now(),

  unique (source, source_id)
);

create index if not exists open_days_school_id_idx on public.open_days (school_id);
create index if not exists open_days_starts_at_idx on public.open_days (starts_at);

alter table public.open_days enable row level security;

-- Everyone signed in can read open days (not sensitive)
create policy "open_days_select_authenticated"
on public.open_days for select
to authenticated
using (true);

-- No client writes; created by admin sync