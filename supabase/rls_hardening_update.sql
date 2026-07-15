-- Iconic Nexus RLS hardening update
-- Run once in Supabase SQL Editor after taking a database backup.

begin;

-- -----------------------------------------------------------------------------
-- 1. Profile writes: users may only change explicitly safe profile fields.
-- Sensitive fields (credits, tester_reputation, is_admin, account_status, etc.)
-- remain writable only inside trusted SECURITY DEFINER functions.
-- -----------------------------------------------------------------------------

drop policy if exists "Users update own profile" on public.profiles;

revoke update on public.profiles from anon, authenticated;
grant update (
  username,
  display_name,
  avatar_url,
  bio,
  country,
  role,
  updated_at,
  banner_url,
  headline,
  accent_color,
  website_url,
  github_url,
  social_url,
  onboarding_completed,
  accepted_terms_at
) on public.profiles to authenticated;

create policy "Users update safe own profile fields"
on public.profiles
for update
to authenticated
using (id = auth.uid() and public.is_active_account())
with check (id = auth.uid() and public.is_active_account());

-- -----------------------------------------------------------------------------
-- 2. Notifications: browser clients may only read/update their own rows.
-- New notifications must be created by trusted database functions/service role.
-- -----------------------------------------------------------------------------

drop policy if exists "Authenticated system inserts notifications" on public.notifications;
revoke insert on public.notifications from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Membership state changes: block arbitrary row updates from browser clients.
-- Only the narrow RPC below may start or submit a tester membership.
-- -----------------------------------------------------------------------------

drop policy if exists "Testers update own membership progress" on public.campaign_members;
revoke update on public.campaign_members from anon, authenticated;

create or replace function public.advance_my_testing_membership(
  p_member_id uuid,
  p_action text
)
returns public.member_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_member public.campaign_members%rowtype;
  v_campaign public.testing_campaigns%rowtype;
  v_project public.projects%rowtype;
  v_minutes integer;
begin
  if v_user is null then
    raise exception 'Please log in.';
  end if;
  if not public.is_active_account(v_user) then
    raise exception 'Your account is not active.';
  end if;

  select * into v_member
  from public.campaign_members
  where id = p_member_id and tester_id = v_user
  for update;

  if not found then
    raise exception 'Testing membership not found.';
  end if;

  select * into v_campaign
  from public.testing_campaigns
  where id = v_member.campaign_id;

  select * into v_project
  from public.projects
  where id = v_campaign.project_id;

  if p_action = 'start' then
    if v_member.status = 'joined' then
      update public.campaign_members
      set status = 'in_progress'
      where id = v_member.id;
      return 'in_progress'::public.member_status;
    end if;
    if v_member.status = 'in_progress' then
      return v_member.status;
    end if;
    raise exception 'This test can no longer be started.';
  elsif p_action = 'submit' then
    if v_member.status not in ('joined','in_progress','rejected') then
      raise exception 'This feedback cannot be submitted in its current state.';
    end if;

    select coalesce(sum(minutes_tested),0)::integer into v_minutes
    from public.test_sessions
    where campaign_member_id = v_member.id;

    if v_minutes < v_campaign.minimum_minutes then
      raise exception 'Log at least % testing minutes before submitting.', v_campaign.minimum_minutes;
    end if;

    if not exists (
      select 1 from public.feedback_reports
      where campaign_member_id = v_member.id
    ) then
      raise exception 'Create the feedback report before submitting.';
    end if;

    update public.feedback_reports
    set review_due_at = now() + interval '7 days'
    where campaign_member_id = v_member.id;

    update public.campaign_members
    set status = 'submitted', submitted_at = now(), approved_at = null
    where id = v_member.id;

    insert into public.notifications(profile_id,type,title,message,link_url)
    values (
      v_project.owner_id,
      'feedback_submitted',
      'Feedback ready for review',
      'A tester submitted feedback. It will auto-approve after 7 days if no action is taken.',
      '/dashboard/projects/' || v_project.id || '/campaigns/' || v_campaign.id || '/feedback'
    );

    return 'submitted'::public.member_status;
  end if;

  raise exception 'Invalid membership action.';
end;
$$;

revoke all on function public.advance_my_testing_membership(uuid,text) from public, anon;
grant execute on function public.advance_my_testing_membership(uuid,text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Public campaign visibility and safe public member counts.
-- -----------------------------------------------------------------------------

drop policy if exists "Campaigns public when project is visible" on public.testing_campaigns;
create policy "Campaign visibility follows project and participant access"
on public.testing_campaigns
for select
to public
using (
  exists (
    select 1
    from public.projects p
    where p.id = testing_campaigns.project_id
      and (
        (
          p.is_published = true
          and p.moderation_status = 'visible'
          and testing_campaigns.status = 'active'
          and (testing_campaigns.starts_at is null or testing_campaigns.starts_at <= now())
          and (testing_campaigns.ends_at is null or testing_campaigns.ends_at > now())
        )
        or p.owner_id = auth.uid()
        or exists (
          select 1 from public.campaign_members cm
          where cm.campaign_id = testing_campaigns.id
            and cm.tester_id = auth.uid()
        )
        or exists (
          select 1 from public.profiles pr
          where pr.id = auth.uid() and pr.is_admin = true
        )
      )
  )
);

drop policy if exists "Campaign member counts are public" on public.campaign_members;

create or replace function public.get_campaign_member_count(p_campaign_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.testing_campaigns c
      join public.projects p on p.id = c.project_id
      where c.id = p_campaign_id
        and (
          (p.is_published = true and p.moderation_status = 'visible' and c.status = 'active'
            and (c.starts_at is null or c.starts_at <= now())
            and (c.ends_at is null or c.ends_at > now()))
          or p.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.tester_id = auth.uid())
          or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin = true)
        )
    )
    then (select count(*)::integer from public.campaign_members where campaign_id = p_campaign_id)
    else 0
  end;
$$;

revoke all on function public.get_campaign_member_count(uuid) from public;
grant execute on function public.get_campaign_member_count(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Disputes: direct inserts are blocked; only the validated RPC may create one.
-- -----------------------------------------------------------------------------

drop policy if exists "Testers open own disputes" on public.feedback_disputes;
revoke insert on public.feedback_disputes from anon, authenticated;

-- Existing open_feedback_dispute() performs membership ownership, status, feedback
-- and duplicate-open-dispute checks. Keep it as the only client entry point.

-- -----------------------------------------------------------------------------
-- 6. Feedback attachments: only editable before final submission/approval.
-- -----------------------------------------------------------------------------

drop policy if exists "Testers add own feedback attachments" on public.feedback_attachments;
create policy "Testers add editable own feedback attachments"
on public.feedback_attachments
for insert
to authenticated
with check (
  public.is_active_account()
  and exists (
    select 1
    from public.feedback_reports f
    join public.campaign_members m on m.id = f.campaign_member_id
    where f.id = feedback_report_id
      and m.tester_id = auth.uid()
      and m.status not in ('submitted','approved')
  )
);

-- -----------------------------------------------------------------------------
-- 7. Remove duplicate project-image read policy.
-- -----------------------------------------------------------------------------

drop policy if exists "Project images public" on public.project_images;
-- "Project images are public" remains in place.

commit;
