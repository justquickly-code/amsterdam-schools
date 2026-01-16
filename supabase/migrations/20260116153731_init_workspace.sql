-- Workspaces: a family planning space
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My workspace',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Workspace settings (MVP)
  home_postcode text,
  home_house_number text,
  home_lat double precision,
  home_lng double precision,

  -- Advies profile (MVP)
  advies_levels text[] not null default '{}'::text[],
  advies_match_mode text not null default 'either' check (advies_match_mode in ('either','both'))
);

-- Workspace members: who can access a workspace
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Enable RLS
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

-- Policies: workspace membership is the gate

-- Workspaces: members can read
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

-- Workspaces: only owner can update
create policy "workspaces_update_if_owner"
on public.workspaces for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
);

-- Workspaces: authenticated users can insert their own workspace
create policy "workspaces_insert_by_creator"
on public.workspaces for insert
to authenticated
with check (created_by = auth.uid());

-- Workspace members: members can read membership rows for their workspaces
create policy "workspace_members_select_if_member"
on public.workspace_members for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
  )
);

-- Workspace members: only owners can manage members
create policy "workspace_members_manage_if_owner"
on public.workspace_members for all
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
);

-- Helper function: create a default workspace for a new user
create or replace function public.create_default_workspace_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.workspaces (name, created_by)
  values ('My workspace', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

-- Trigger: when a user signs up, create their default workspace
drop trigger if exists on_auth_user_created_create_workspace on auth.users;

create trigger on_auth_user_created_create_workspace
after insert on auth.users
for each row execute procedure public.create_default_workspace_for_new_user();