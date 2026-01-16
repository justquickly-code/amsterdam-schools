-- Fix RLS recursion by simplifying policies (MVP)
-- Approach:
-- - Access to a workspace is based on workspaces.created_by = auth.uid()
-- - workspace_members is kept but policies avoid self-referencing recursion
-- - We can reintroduce full membership-based sharing later with carefully designed policies.

-- Drop existing policies that can cause recursion
drop policy if exists "workspaces_select_if_member" on public.workspaces;
drop policy if exists "workspaces_update_if_owner" on public.workspaces;
drop policy if exists "workspaces_insert_by_creator" on public.workspaces;

drop policy if exists "workspace_members_select_if_member" on public.workspace_members;
drop policy if exists "workspace_members_manage_if_owner" on public.workspace_members;

-- Workspaces: user can read only workspaces they created (MVP)
create policy "workspaces_select_if_creator"
on public.workspaces for select
to authenticated
using (created_by = auth.uid());

-- Workspaces: user can update only workspaces they created (MVP)
create policy "workspaces_update_if_creator"
on public.workspaces for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- Workspaces: user can insert only their own workspace
create policy "workspaces_insert_by_creator"
on public.workspaces for insert
to authenticated
with check (created_by = auth.uid());

-- workspace_members: user can read only their own membership rows (MVP)
create policy "workspace_members_select_own_rows"
on public.workspace_members for select
to authenticated
using (user_id = auth.uid());

-- workspace_members: user can insert only their own rows (used by trigger)
create policy "workspace_members_insert_own_rows"
on public.workspace_members for insert
to authenticated
with check (user_id = auth.uid());

-- workspace_members: prevent updates/deletes in MVP to keep it simple
-- (sharing/invites will be implemented later with safe policies)