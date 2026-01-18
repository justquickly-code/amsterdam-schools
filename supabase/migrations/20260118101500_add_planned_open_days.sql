-- Workspace-specific planned open days
create table if not exists public.planned_open_days (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  open_day_id uuid not null references public.open_days(id) on delete cascade,
  planned_at timestamptz not null default now(),
  attended_at timestamptz,
  created_at timestamptz not null default now(),

  unique (workspace_id, open_day_id)
);

alter table public.planned_open_days enable row level security;

-- MVP RLS: user can access planned open days for workspaces they created
create policy "planned_open_days_select_if_workspace_creator"
on public.planned_open_days for select
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = planned_open_days.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "planned_open_days_insert_if_workspace_creator"
on public.planned_open_days for insert
to authenticated
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = planned_open_days.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "planned_open_days_update_if_workspace_creator"
on public.planned_open_days for update
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = planned_open_days.workspace_id
      and w.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = planned_open_days.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "planned_open_days_delete_if_workspace_creator"
on public.planned_open_days for delete
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = planned_open_days.workspace_id
      and w.created_by = auth.uid()
  )
);
