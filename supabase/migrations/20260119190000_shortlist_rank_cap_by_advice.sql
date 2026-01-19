-- Allow unlimited saved shortlist items and advice-based rank cap in app logic

-- Drop hard cap trigger/function
DROP TRIGGER IF EXISTS enforce_shortlist_cap_trigger ON public.shortlist_items;
DROP FUNCTION IF EXISTS public.enforce_shortlist_cap();

-- Allow unranked items (rank nullable) and remove fixed rank check
ALTER TABLE public.shortlist_items
  ALTER COLUMN rank DROP NOT NULL;

ALTER TABLE public.shortlist_items
  DROP CONSTRAINT IF EXISTS shortlist_items_rank_check;

-- Replace unique constraint with partial unique index for ranked items only
ALTER TABLE public.shortlist_items
  DROP CONSTRAINT IF EXISTS shortlist_items_shortlist_id_rank_key;

DROP INDEX IF EXISTS shortlist_items_rank_unique;
CREATE UNIQUE INDEX shortlist_items_rank_unique
  ON public.shortlist_items (shortlist_id, rank)
  WHERE rank IS NOT NULL AND rank > 0;

-- Update swap function to work with advice-based caps and nullable ranks
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
  if p_rank_a < 1 or p_rank_b < 1 then
    raise exception 'Ranks must be positive';
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

  update public.shortlist_items
  set rank = -1
  where shortlist_id = p_shortlist_id and school_id = a_school;

  update public.shortlist_items
  set rank = p_rank_a
  where shortlist_id = p_shortlist_id and school_id = b_school;

  update public.shortlist_items
  set rank = p_rank_b
  where shortlist_id = p_shortlist_id and school_id = a_school;
end;
$$;
