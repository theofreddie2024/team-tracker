-- =============================================================================
-- TEAM TRACKER — Migration 004: Weekly member tasks + training attendees
-- =============================================================================

-- Weekly tasks a sponsor needs to do for each downline member
create table public.member_weekly_tasks (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  week text not null, -- Monday date: YYYY-MM-DD
  title text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index member_weekly_tasks_sponsor_week_idx
  on public.member_weekly_tasks(sponsor_id, week);
create index member_weekly_tasks_member_idx
  on public.member_weekly_tasks(member_id);

create trigger member_weekly_tasks_set_updated_at
  before update on public.member_weekly_tasks
  for each row execute function public.set_updated_at();

-- Which team members attended a specific training session
create table public.training_attendees (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (training_id, member_id)
);

create index training_attendees_training_idx
  on public.training_attendees(training_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.member_weekly_tasks enable row level security;
alter table public.training_attendees enable row level security;

-- member_weekly_tasks: sponsor owns their tasks; admin reads all
create policy member_weekly_tasks_owner_all on public.member_weekly_tasks
  for all
  using (sponsor_id = auth.uid())
  with check (sponsor_id = auth.uid());

create policy member_weekly_tasks_admin_read on public.member_weekly_tasks
  for select using (public.is_admin());

-- training_attendees: the training owner manages attendees; admin reads all
create policy training_attendees_owner_all on public.training_attendees
  for all
  using (
    exists (
      select 1 from public.trainings
      where id = training_id and account_owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trainings
      where id = training_id and account_owner_id = auth.uid()
    )
  );

create policy training_attendees_admin_read on public.training_attendees
  for select using (public.is_admin());
