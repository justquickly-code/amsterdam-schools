-- Cache bike commute calculations per workspace + school
create table if not exists public.commute_cache (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,

  mode text not null default 'bike' check (mode in ('bike')),

  duration_minutes integer not null,
  distance_km numeric(6,2) not null,

  provider text not null default 'mapbox',
  computed_at timestamptz not null default now(),

  primary key (workspace_id, school_id, mode)
);

alter table public.commute_cache enable row level security;

-- Read: authenticated users can read commute rows for workspaces they created (MVP)
create policy "commute_cache_select_if_workspace_creator"
on public.commute_cache for select
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = commute_cache.workspace_id
      and w.created_by = auth.uid()
  )
);

-- No client writes; computed by server/admin later