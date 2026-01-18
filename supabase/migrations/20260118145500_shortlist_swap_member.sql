-- Allow workspace members to swap shortlist ranks
create or replace function public.swap_shortlist_ranks(
  p_shortlist_id uuid,
  p_rank_a int,
  p_rank_b int
)
returns void
language plpgsql
as $$
declare
  a_school uuid;
  b_school uuid;
begin
  if p_rank_a < 1 or p_rank_a > 12 or p_rank_b < 1 or p_rank_b > 12 then
    raise exception 'Ranks must be between 1 and 12';
  end if;

  if not exists (
    select 1
    from public.shortlists s
    join public.workspace_members wm on wm.workspace_id = s.workspace_id
    where s.id = p_shortlist_id
      and wm.user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  select school_id into a_school
  from public.shortlist_items
  where shortlist_id = p_shortlist_id and rank = p_rank_a;

  select school_id into b_school
  from public.shortlist_items
  where shortlist_id = p_shortlist_id and rank = p_rank_b;

  if a_school is null or b_school is null then
    raise exception 'Both ranks must be occupied to swap';
  end if;

  set constraints shortlist_items_unique_rank deferred;

  update public.shortlist_items
  set rank = case
    when school_id = a_school then p_rank_b
    when school_id = b_school then p_rank_a
    else rank
  end
  where shortlist_id = p_shortlist_id
    and school_id in (a_school, b_school);
end;
$$;
