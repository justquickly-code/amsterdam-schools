-- One shortlist per workspace, hard cap 12 items, ranked 1..12

create table if not exists public.shortlists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.shortlist_items (
  shortlist_id uuid not null references public.shortlists(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  rank integer not null check (rank between 1 and 12),
  created_at timestamptz not null default now(),
  primary key (shortlist_id, school_id),
  unique (shortlist_id, rank)
);

alter table public.shortlists enable row level security;
alter table public.shortlist_items enable row level security;

-- MVP RLS: user can access shortlist for workspaces they created
create policy "shortlists_select_if_workspace_creator"
on public.shortlists for select
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = shortlists.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "shortlists_insert_if_workspace_creator"
on public.shortlists for insert
to authenticated
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = shortlists.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "shortlists_delete_if_workspace_creator"
on public.shortlists for delete
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = shortlists.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "shortlist_items_select_if_workspace_creator"
on public.shortlist_items for select
to authenticated
using (
  exists (
    select 1
    from public.shortlists s
    join public.workspaces w on w.id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and w.created_by = auth.uid()
  )
);

create policy "shortlist_items_insert_if_workspace_creator"
on public.shortlist_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.shortlists s
    join public.workspaces w on w.id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and w.created_by = auth.uid()
  )
);

create policy "shortlist_items_update_if_workspace_creator"
on public.shortlist_items for update
to authenticated
using (
  exists (
    select 1
    from public.shortlists s
    join public.workspaces w on w.id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and w.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shortlists s
    join public.workspaces w on w.id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and w.created_by = auth.uid()
  )
);

create policy "shortlist_items_delete_if_workspace_creator"
on public.shortlist_items for delete
to authenticated
using (
  exists (
    select 1
    from public.shortlists s
    join public.workspaces w on w.id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and w.created_by = auth.uid()
  )
);

-- Helper: enforce hard cap of 12 items per shortlist
create or replace function public.enforce_shortlist_cap()
returns trigger
language plpgsql
as $$
declare
  item_count integer;
begin
  select count(*) into item_count
  from public.shortlist_items
  where shortlist_id = new.shortlist_id;

  if item_count >= 12 then
    raise exception 'Shortlist is full (max 12 items).';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_shortlist_cap_trigger on public.shortlist_items;
create trigger enforce_shortlist_cap_trigger
before insert on public.shortlist_items
for each row
execute procedure public.enforce_shortlist_cap();