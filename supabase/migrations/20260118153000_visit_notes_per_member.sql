-- Per-member visit notes

create table if not exists public.visit_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (workspace_id, school_id, user_id)
);

alter table public.visit_notes enable row level security;

-- Auto-update updated_at
drop trigger if exists set_visit_notes_updated_at on public.visit_notes;
create trigger set_visit_notes_updated_at
before update on public.visit_notes
for each row execute procedure public.set_updated_at();

-- Helper: check membership without RLS recursion
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create policy "visit_notes_select_if_member"
on public.visit_notes for select
to authenticated
using (public.is_workspace_member(visit_notes.workspace_id));

create policy "visit_notes_insert_if_member"
on public.visit_notes for insert
to authenticated
with check (public.is_workspace_member(visit_notes.workspace_id));

create policy "visit_notes_update_if_member"
on public.visit_notes for update
to authenticated
using (public.is_workspace_member(visit_notes.workspace_id))
with check (public.is_workspace_member(visit_notes.workspace_id));

create policy "visit_notes_delete_if_member"
on public.visit_notes for delete
to authenticated
using (public.is_workspace_member(visit_notes.workspace_id));

-- Allow members to read all workspace members (for showing email labels)
drop policy if exists "workspace_members_select_if_member" on public.workspace_members;
create policy "workspace_members_select_if_member"
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_members.workspace_id));

-- Backfill: move existing visit notes into per-member notes (owner)
insert into public.visit_notes (workspace_id, school_id, user_id, notes)
select
  v.workspace_id,
  v.school_id,
  w.created_by,
  trim(
    concat_ws(
      E'\n\n',
      nullif(v.notes, ''),
      case when v.pros is not null and btrim(v.pros) <> '' then 'Pros: ' || v.pros else null end,
      case when v.cons is not null and btrim(v.cons) <> '' then 'Cons: ' || v.cons else null end
    )
  )
from public.visits v
join public.workspaces w on w.id = v.workspace_id
where (v.notes is not null and btrim(v.notes) <> '')
   or (v.pros is not null and btrim(v.pros) <> '')
   or (v.cons is not null and btrim(v.cons) <> '')
on conflict do nothing;
