-- =============================================================================
-- TEAM TRACKER — Migration 002: Distributor rank statuses
-- =============================================================================
-- Run this in Supabase SQL Editor after migration 001.
-- Adds the full distributor rank ladder to the member.status check constraint.
-- =============================================================================

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
    'newbie', 'pro', 'trainer',
    'full_distributor', 'manager', 'senior_manager', 'executive_manager',
    'director', 'emerald_director', 'sapphire_director',
    'ruby_1', 'ruby_2', 'ruby_3', 'ruby_4', 'ruby_5',
    'diamond_1', 'diamond_2', 'diamond_3', 'diamond_4', 'diamond_5'
  ));
