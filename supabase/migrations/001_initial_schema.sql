-- =============================================================================
-- TEAM TRACKER — INITIAL SCHEMA (Phase 1)
-- =============================================================================
-- Run this in the Supabase SQL Editor for your project.
-- After running, sign up the first admin via the app, then run:
--   update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';
-- =============================================================================

-- Profiles extend auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'sponsor' check (role in ('admin', 'sponsor')),
  invited_by_user_id uuid references public.profiles(id),
  promoted_from_member_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index profiles_role_idx on public.profiles(role);

-- Invitations for new sponsors
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by_user_id uuid not null references public.profiles(id),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_email_idx on public.invitations(email);
create index invitations_token_idx on public.invitations(token);

-- Members (downline people, no logins)
create table public.members (
  id uuid primary key default gen_random_uuid(),
  account_owner_id uuid not null references public.profiles(id) on delete restrict,
  recruited_by_user_id uuid references public.profiles(id),
  recruited_by_member_id uuid references public.members(id),
  name text not null,
  status text not null default 'newbie' check (status in ('newbie', 'pro', 'trainer')),
  income_bracket text not null default 'none'
    check (income_bracket in ('none', '250_500', '500_1000', '1000_plus', 'occasional')),
  is_consistent boolean not null default false,
  attends_office_consistently boolean not null default false,
  is_active boolean not null default true,
  joined_at date not null default current_date,
  first_earnings_at date,
  quit_at date,
  quit_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_one_recruiter check (
    (recruited_by_user_id is not null and recruited_by_member_id is null)
    or (recruited_by_user_id is null and recruited_by_member_id is not null)
  )
);

create index members_owner_idx on public.members(account_owner_id);
create index members_recruited_by_user_idx on public.members(recruited_by_user_id);
create index members_recruited_by_member_idx on public.members(recruited_by_member_id);

-- Trainings (events)
create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  account_owner_id uuid not null references public.profiles(id) on delete restrict,
  type text not null check (type in ('guest', 'pro', 'distributor')),
  title text not null,
  date date not null,
  attendee_count integer not null default 0 check (attendee_count >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index trainings_owner_date_idx on public.trainings(account_owner_id, date desc);

-- Monthly assessments (sponsor self-report)
create table public.monthly_assessments (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  prospects_count integer default 0,
  prospects_stayed integer default 0,
  pro_trainings_attended integer default 0,
  pro_trainings_missed integer default 0,
  distributor_trainings_attended integer default 0,
  distributor_trainings_missed integer default 0,
  gigs_researched integer default 0,
  improvement_area text,
  next_plan_of_action text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sponsor_id, month)
);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger members_set_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

create trigger monthly_assessments_set_updated_at
  before update on public.monthly_assessments
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup; link invitation if one exists
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
  v_invited_by uuid;
begin
  select * into v_invitation
  from public.invitations
  where email = new.email
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    v_invited_by := v_invitation.invited_by_user_id;
    update public.invitations set accepted_at = now() where id = v_invitation.id;
  end if;

  insert into public.profiles (id, email, name, role, invited_by_user_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'sponsor',
    v_invited_by
  );

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.members enable row level security;
alter table public.trainings enable row level security;
alter table public.monthly_assessments enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: users see their own; admin sees all; admin manages all
create policy profiles_select_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- invitations: admin only
create policy invitations_admin_all on public.invitations
  for all using (public.is_admin()) with check (public.is_admin());

-- Allow anonymous read of invitations by token (for the accept-invite page)
create policy invitations_public_token_select on public.invitations
  for select using (true);

-- members: owner full access; admin full access
create policy members_owner_all on public.members
  for all using (account_owner_id = auth.uid())
  with check (account_owner_id = auth.uid());

create policy members_admin_all on public.members
  for all using (public.is_admin()) with check (public.is_admin());

-- trainings: owner; admin
create policy trainings_owner_all on public.trainings
  for all using (account_owner_id = auth.uid())
  with check (account_owner_id = auth.uid());

create policy trainings_admin_all on public.trainings
  for all using (public.is_admin()) with check (public.is_admin());

-- monthly_assessments: owner; admin
create policy assessments_owner_all on public.monthly_assessments
  for all using (sponsor_id = auth.uid())
  with check (sponsor_id = auth.uid());

create policy assessments_admin_all on public.monthly_assessments
  for all using (public.is_admin()) with check (public.is_admin());
