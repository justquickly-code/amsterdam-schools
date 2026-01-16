-- Make shortlist rank swapping safe by:
-- 1) Recreating the unique (shortlist_id, rank) constraint as DEFERRABLE
-- 2) Adding an RPC function that swaps two occupied ranks in a single transaction

-- 1) Drop the existing auto-named unique constraint on (shortlist_id, rank)
do $$
declare
  c_name text;
begin
  select conname into c_name
  from pg_constraint
  where conrelid = 'public.shortlist_items'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) like '%(shortlist_id, rank)%'
  limit 1;

  if c_name is not null then
    execute format('alter table public.shortlist_items drop constraint %I', c_name);
  end if;
end $$;

-- 2) Recreate it as DEFERRABLE so swaps don’t violate uniqueness mid-statement
alter table public.shortlist_items
  add constraint shortlist_items_unique_rank
  unique (shortlist_id, rank)
  deferrable initially immediate;

-- 3) RPC: swap two occupied ranks safely
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

  -- AuthZ (MVP): only the workspace creator can swap
  if not exists (
    select 1
    from public.shortlists s
    join public.workspaces w on w.id = s.workspace_id
    where s.id = p_shortlist_id
      and w.created_by = auth.uid()
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

  -- Defer uniqueness until end of transaction (swap is safe then)
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