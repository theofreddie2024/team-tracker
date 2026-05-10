-- =============================================================================
-- TEAM TRACKER — Migration 005: Promote member to sponsor
-- =============================================================================
-- Lets a sponsor invite one of their downline members to become a sponsor.
-- The invitation carries the originating member's id, so when the invitee
-- signs up the new profile is linked back via promoted_from_member_id.
-- =============================================================================

-- Track which member a promotion invitation is for (null for ordinary admin invites)
alter table public.invitations
  add column if not exists promotes_member_id uuid
    references public.members(id) on delete set null;

create index if not exists invitations_promotes_member_idx
  on public.invitations(promotes_member_id);

-- Update signup trigger to propagate promoted_from_member_id
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
  v_invited_by uuid;
  v_promoted_from uuid;
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
    v_promoted_from := v_invitation.promotes_member_id;
    update public.invitations set accepted_at = now() where id = v_invitation.id;
  end if;

  insert into public.profiles (id, email, name, role, invited_by_user_id, promoted_from_member_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'sponsor',
    v_invited_by,
    v_promoted_from
  );

  return new;
end $$;

-- =============================================================================
-- RLS: let sponsors manage their own promotion invitations only
-- =============================================================================

-- Sponsor can create a promotion invite for one of their own active members.
create policy invitations_sponsor_promotion_insert on public.invitations
  for insert
  with check (
    invited_by_user_id = auth.uid()
    and promotes_member_id is not null
    and exists (
      select 1 from public.members
      where id = promotes_member_id and account_owner_id = auth.uid()
    )
  );

-- Sponsor can see their own promotion invites.
create policy invitations_sponsor_promotion_select on public.invitations
  for select using (
    invited_by_user_id = auth.uid()
    and promotes_member_id is not null
  );

-- Sponsor can revoke their own promotion invites.
create policy invitations_sponsor_promotion_delete on public.invitations
  for delete using (
    invited_by_user_id = auth.uid()
    and promotes_member_id is not null
  );
