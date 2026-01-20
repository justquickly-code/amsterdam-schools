begin;

alter table public.open_days
  add column if not exists last_seen_at timestamptz,
  add column if not exists is_active boolean not null default true,
  add column if not exists missing_since timestamptz;

do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.open_days'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) = 'UNIQUE (source, source_id)';

  if cname is not null then
    execute format('alter table public.open_days drop constraint %I', cname);
  end if;
end$$;

alter table public.open_days add column if not exists source_id_new text;

update public.open_days
set source_id_new = regexp_replace(source_id, '\|[^|]*$', '')
where source = 'schoolkeuze020'
  and source_id is not null
  and source_id like '%|%';

delete from public.open_days od
using (
  select distinct on (source, source_id_new) id
  from public.open_days
  where source = 'schoolkeuze020'
    and source_id_new is not null
  order by source, source_id_new, last_synced_at desc nulls last, id
) keep
where od.source = 'schoolkeuze020'
  and od.source_id_new is not null
  and od.source_id_new = regexp_replace(od.source_id, '\|[^|]*$', '')
  and od.id <> keep.id;

update public.open_days
set source_id = source_id_new
where source = 'schoolkeuze020'
  and source_id_new is not null;

alter table public.open_days drop column if exists source_id_new;

alter table public.open_days
  add constraint open_days_source_source_id_key unique (source, source_id);

create index if not exists open_days_year_active_starts_idx
  on public.open_days (school_year_label, is_active, starts_at);

create index if not exists open_days_missing_since_idx
  on public.open_days (missing_since)
  where is_active = false;

commit;


