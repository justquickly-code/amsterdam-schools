alter table public.open_days
  add column if not exists event_type text not null default 'open_day';

create index if not exists open_days_event_type_idx
  on public.open_days (event_type);