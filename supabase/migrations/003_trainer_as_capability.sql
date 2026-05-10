-- =============================================================================
-- TEAM TRACKER — Migration 003: Trainer is a capability, not a rank
-- =============================================================================
-- Run this in Supabase SQL Editor after migration 002.
-- A member can be a "Trainer" at any rank, so it becomes a boolean flag rather
-- than a value of `status`.
-- =============================================================================

alter table public.members
  add column if not exists is_trainer boolean not null default false;

-- Promote any existing trainers: keep them as Pros, mark is_trainer = true
update public.members
  set is_trainer = true, status = 'pro'
  where status = 'trainer';

-- Replace the status check constraint to drop 'trainer'
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.members'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%newbie%'
  loop
    execute format('alter table public.members drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.members
  add constraint members_status_check check (status in (
    'newbie', 'pro',
    'full_distributor', 'manager', 'senior_manager', 'executive_manager',
    'director', 'emerald_director', 'sapphire_director',
    'ruby_1', 'ruby_2', 'ruby_3', 'ruby_4', 'ruby_5',
    'diamond_1', 'diamond_2', 'diamond_3', 'diamond_4', 'diamond_5'
  ));
