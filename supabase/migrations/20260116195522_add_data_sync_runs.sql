-- Track annual/manual data imports (e.g., "2025/26")
create table if not exists public.data_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- e.g. 'schoolwijzer_schools', 'schoolkeuze020_opendays'
  school_year_label text not null, -- e.g. '2025/26'
  synced_at timestamptz not null default now(),
  status text not null default 'success' check (status in ('success','failed')),
  notes text
);

alter table public.data_sync_runs enable row level security;

-- Authenticated users can read sync runs (safe metadata)
create policy "data_sync_runs_select_authenticated"
on public.data_sync_runs for select
to authenticated
using (true);

-- No client writes; sync runs should be created by server/admin actions later