-- Workspace invites for member sharing

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('owner','editor','viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,

  unique (workspace_id, email)
);

alter table public.workspace_invites enable row level security;

-- Owners can manage invites for their workspace
create policy "workspace_invites_select_if_owner"
on public.workspace_invites for select
to authenticated
using (public.is_workspace_owner(workspace_invites.workspace_id));

create policy "workspace_invites_insert_if_owner"
on public.workspace_invites for insert
to authenticated
with check (public.is_workspace_owner(workspace_invites.workspace_id));

create policy "workspace_invites_update_if_owner"
on public.workspace_invites for update
to authenticated
using (public.is_workspace_owner(workspace_invites.workspace_id))
with check (public.is_workspace_owner(workspace_invites.workspace_id));

create policy "workspace_invites_delete_if_owner"
on public.workspace_invites for delete
to authenticated
using (public.is_workspace_owner(workspace_invites.workspace_id));
