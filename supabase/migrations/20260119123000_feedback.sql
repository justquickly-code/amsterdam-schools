-- Feedback (user-submitted) with admin response

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','idea','question','other')),
  title text,
  body text not null,
  status text not null default 'open' check (status in ('open','in_review','resolved')),
  admin_response text,
  admin_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_workspace_id_idx on public.feedback (workspace_id);
create index if not exists feedback_user_id_idx on public.feedback (user_id);

alter table public.feedback enable row level security;

-- Auto-update updated_at
drop trigger if exists set_feedback_updated_at on public.feedback;
create trigger set_feedback_updated_at
before update on public.feedback
for each row execute procedure public.set_updated_at();

-- Users can read and submit their own feedback
drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own"
on public.feedback for select
to authenticated
using (auth.uid() = feedback.user_id);

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own"
on public.feedback for insert
to authenticated
with check (auth.uid() = feedback.user_id);
