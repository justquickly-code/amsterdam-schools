-- Workspace language setting (nl default, en optional)
alter table public.workspaces
add column if not exists language text not null default 'nl' check (language in ('nl','en'));
