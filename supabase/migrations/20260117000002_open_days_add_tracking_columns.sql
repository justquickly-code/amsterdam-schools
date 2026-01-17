alter table public.open_days
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists is_active boolean not null default true,
  add column if not exists missing_since timestamptz;

create index if not exists open_days_is_active_idx on public.open_days (is_active);
create index if not exists open_days_missing_since_idx on public.open_days (missing_since);

