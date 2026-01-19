-- Track tutorial completion per workspace member

ALTER TABLE public.workspace_members
ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz;

-- Allow members to update their own tutorial_completed_at (guarded by trigger)
drop policy if exists "workspace_members_update_own_tutorial_completed" on public.workspace_members;
create policy "workspace_members_update_own_tutorial_completed"
on public.workspace_members for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Extend update guard to allow tutorial_completed_at
create or replace function public.workspace_members_restrict_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_workspace_owner(NEW.workspace_id) then
    return NEW;
  end if;

  if NEW.workspace_id <> OLD.workspace_id
     or NEW.user_id <> OLD.user_id
     or NEW.role <> OLD.role
     or NEW.created_at <> OLD.created_at
     or coalesce(NEW.member_email, '') <> coalesce(OLD.member_email, '') then
    raise exception 'Only feedback_last_seen_at and tutorial_completed_at can be updated by members';
  end if;

  return NEW;
end;
$$;
