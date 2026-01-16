-- Per-workspace school visit notes + rating (1–5)
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,

  attended boolean not null default false,

  notes text,
  pros text,
  cons text,

  rating_stars integer check (rating_stars between 1 and 5),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (workspace_id, school_id)
);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_visits_updated_at on public.visits;
create trigger set_visits_updated_at
before update on public.visits
for each row execute procedure public.set_updated_at();

alter table public.visits enable row level security;

-- MVP RLS: user can access visits for workspaces they created
create policy "visits_select_if_workspace_creator"
on public.visits for select
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = visits.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "visits_insert_if_workspace_creator"
on public.visits for insert
to authenticated
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = visits.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "visits_update_if_workspace_creator"
on public.visits for update
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = visits.workspace_id
      and w.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = visits.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "visits_delete_if_workspace_creator"
on public.visits for delete
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = visits.workspace_id
      and w.created_by = auth.uid()
  )
);