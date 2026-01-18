-- Limit workspace updates to owners only

drop policy if exists "workspaces_update_if_member" on public.workspaces;
drop policy if exists "workspaces_update_if_owner" on public.workspaces;

create policy "workspaces_update_if_owner"
on public.workspaces for update
to authenticated
using (public.is_workspace_owner(workspaces.id))
with check (public.is_workspace_owner(workspaces.id));
