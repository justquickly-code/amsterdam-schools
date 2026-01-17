-- Allow workspace members to read/write commute cache; owners can delete.

drop policy if exists "commute_cache_select_if_workspace_creator" on public.commute_cache;

drop policy if exists "commute_cache_select_if_member" on public.commute_cache;
create policy "commute_cache_select_if_member"
on public.commute_cache for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = commute_cache.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "commute_cache_insert_if_member" on public.commute_cache;
create policy "commute_cache_insert_if_member"
on public.commute_cache for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = commute_cache.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','editor')
  )
);

drop policy if exists "commute_cache_update_if_member" on public.commute_cache;
create policy "commute_cache_update_if_member"
on public.commute_cache for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = commute_cache.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','editor')
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = commute_cache.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner','editor')
  )
);

drop policy if exists "commute_cache_delete_if_owner" on public.commute_cache;
create policy "commute_cache_delete_if_owner"
on public.commute_cache for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = commute_cache.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  )
);
