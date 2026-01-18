-- Workspace member sharing: owner-managed membership + member access RLS

-- Add optional email label for display
alter table public.workspace_members
add column if not exists member_email text;

-- Helper: check owner without RLS recursion
create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.created_by = auth.uid()
  );
$$;

-- Backfill member_email where missing (best-effort)
update public.workspace_members wm
set member_email = au.email
from auth.users au
where wm.user_id = au.id
  and wm.member_email is null;

-- Fill member_email on insert if missing
create or replace function public.set_workspace_member_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.member_email is null then
    select au.email into new.member_email
    from auth.users au
    where au.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_workspace_member_email_trigger on public.workspace_members;
create trigger set_workspace_member_email_trigger
before insert on public.workspace_members
for each row execute procedure public.set_workspace_member_email();

-- Workspaces policies: allow members to read, owners to update
drop policy if exists "workspaces_select_if_creator" on public.workspaces;
drop policy if exists "workspaces_update_if_creator" on public.workspaces;

create policy "workspaces_select_if_member"
on public.workspaces for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
  )
);

create policy "workspaces_update_if_member"
on public.workspaces for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
  )
);

-- Workspace members: owner can manage, members can read own rows
drop policy if exists "workspace_members_select_own_rows" on public.workspace_members;
drop policy if exists "workspace_members_insert_own_rows" on public.workspace_members;

create policy "workspace_members_select_if_member"
on public.workspace_members for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_workspace_owner(workspace_members.workspace_id)
);

create policy "workspace_members_insert_if_owner"
on public.workspace_members for insert
to authenticated
with check (public.is_workspace_owner(workspace_members.workspace_id));

create policy "workspace_members_update_if_owner"
on public.workspace_members for update
to authenticated
using (public.is_workspace_owner(workspace_members.workspace_id))
with check (public.is_workspace_owner(workspace_members.workspace_id));

create policy "workspace_members_delete_if_owner"
on public.workspace_members for delete
to authenticated
using (public.is_workspace_owner(workspace_members.workspace_id));

-- Visits: allow workspace members
drop policy if exists "visits_select_if_workspace_creator" on public.visits;
drop policy if exists "visits_insert_if_workspace_creator" on public.visits;
drop policy if exists "visits_update_if_workspace_creator" on public.visits;
drop policy if exists "visits_delete_if_workspace_creator" on public.visits;

create policy "visits_select_if_member"
on public.visits for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = visits.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "visits_insert_if_member"
on public.visits for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = visits.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "visits_update_if_member"
on public.visits for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = visits.workspace_id
      and wm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = visits.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "visits_delete_if_member"
on public.visits for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = visits.workspace_id
      and wm.user_id = auth.uid()
  )
);

-- Shortlists: allow workspace members
drop policy if exists "shortlists_select_if_workspace_creator" on public.shortlists;
drop policy if exists "shortlists_insert_if_workspace_creator" on public.shortlists;
drop policy if exists "shortlists_delete_if_workspace_creator" on public.shortlists;

create policy "shortlists_select_if_member"
on public.shortlists for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = shortlists.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "shortlists_insert_if_member"
on public.shortlists for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = shortlists.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "shortlists_delete_if_member"
on public.shortlists for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = shortlists.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "shortlist_items_select_if_workspace_creator" on public.shortlist_items;
drop policy if exists "shortlist_items_insert_if_workspace_creator" on public.shortlist_items;
drop policy if exists "shortlist_items_update_if_workspace_creator" on public.shortlist_items;
drop policy if exists "shortlist_items_delete_if_workspace_creator" on public.shortlist_items;

create policy "shortlist_items_select_if_member"
on public.shortlist_items for select
to authenticated
using (
  exists (
    select 1 from public.shortlists s
    join public.workspace_members wm on wm.workspace_id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and wm.user_id = auth.uid()
  )
);

create policy "shortlist_items_insert_if_member"
on public.shortlist_items for insert
to authenticated
with check (
  exists (
    select 1 from public.shortlists s
    join public.workspace_members wm on wm.workspace_id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and wm.user_id = auth.uid()
  )
);

create policy "shortlist_items_update_if_member"
on public.shortlist_items for update
to authenticated
using (
  exists (
    select 1 from public.shortlists s
    join public.workspace_members wm on wm.workspace_id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and wm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shortlists s
    join public.workspace_members wm on wm.workspace_id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and wm.user_id = auth.uid()
  )
);

create policy "shortlist_items_delete_if_member"
on public.shortlist_items for delete
to authenticated
using (
  exists (
    select 1 from public.shortlists s
    join public.workspace_members wm on wm.workspace_id = s.workspace_id
    where s.id = shortlist_items.shortlist_id
      and wm.user_id = auth.uid()
  )
);

-- Planned open days: allow workspace members
drop policy if exists "planned_open_days_select_if_workspace_creator" on public.planned_open_days;
drop policy if exists "planned_open_days_insert_if_workspace_creator" on public.planned_open_days;
drop policy if exists "planned_open_days_update_if_workspace_creator" on public.planned_open_days;
drop policy if exists "planned_open_days_delete_if_workspace_creator" on public.planned_open_days;

create policy "planned_open_days_select_if_member"
on public.planned_open_days for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = planned_open_days.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "planned_open_days_insert_if_member"
on public.planned_open_days for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = planned_open_days.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "planned_open_days_update_if_member"
on public.planned_open_days for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = planned_open_days.workspace_id
      and wm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = planned_open_days.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "planned_open_days_delete_if_member"
on public.planned_open_days for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = planned_open_days.workspace_id
      and wm.user_id = auth.uid()
  )
);
