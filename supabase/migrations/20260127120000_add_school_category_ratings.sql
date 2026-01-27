-- Category ratings per school/workspace (shared)
create table if not exists public.school_category_ratings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  category text not null,
  rating smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists school_category_ratings_unique
  on public.school_category_ratings (workspace_id, school_id, category);

alter table public.school_category_ratings enable row level security;

create policy "members_can_read_category_ratings"
  on public.school_category_ratings
  for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = school_category_ratings.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "members_can_write_category_ratings"
  on public.school_category_ratings
  for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = school_category_ratings.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "members_can_update_category_ratings"
  on public.school_category_ratings
  for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = school_category_ratings.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = school_category_ratings.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "members_can_delete_category_ratings"
  on public.school_category_ratings
  for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = school_category_ratings.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
