-- DUO school identifiers + long-form metrics for parent-focused "School facts"
-- Phase 7.1 (Parent data enrichment)

alter table public.schools
  add column if not exists duo_school_id text,
  add column if not exists brin text,
  add column if not exists vestiging_nr text,
  add column if not exists denominatie text,
  add column if not exists phone text,
  add column if not exists postcode text,
  add column if not exists street text,
  add column if not exists house_nr text,
  add column if not exists house_nr_suffix text;

create table if not exists public.school_metrics (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  duo_school_id text,
  metric_group text not null,
  metric_name text not null,
  period text,
  value_numeric double precision,
  value_text text,
  unit text,
  notes text,
  source text,
  public_use_ok text,
  created_at timestamptz not null default now()
);

create index if not exists school_metrics_school_id_idx on public.school_metrics (school_id);
create index if not exists school_metrics_duo_id_idx on public.school_metrics (duo_school_id);
create index if not exists school_metrics_name_idx on public.school_metrics (metric_name);

alter table public.school_metrics enable row level security;

-- Read-only reference data (public read is OK for parent-facing metrics)
create policy "school_metrics_select_public"
on public.school_metrics
for select
to public
using (true);

-- No client writes (imports via server/admin tooling)
