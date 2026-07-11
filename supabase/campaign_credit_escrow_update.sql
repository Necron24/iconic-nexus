-- Iconic Nexus campaign credit escrow and economy integrity update
-- Existing campaigns are grandfathered with a funded reserve so current test data keeps working.

alter table public.testing_campaigns
  add column if not exists reserved_credits integer not null default 0 check (reserved_credits >= 0),
  add column if not exists spent_credits integer not null default 0 check (spent_credits >= 0),
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz;

-- Grandfather campaigns created before this escrow update.
update public.testing_campaigns c
set
  spent_credits = approved.approved_count * c.reward_credits,
  reserved_credits = greatest(0, (c.tester_goal - approved.approved_count) * c.reward_credits)
from (
  select tc.id, count(cm.id) filter (where cm.status = 'approved')::integer as approved_count
  from public.testing_campaigns tc
  left join public.campaign_members cm on cm.campaign_id = tc.id
  group by tc.id
) approved
where c.id = approved.id
  and c.reserved_credits = 0
  and c.spent_credits = 0;

create or replace function public.create_funded_testing_campaign(
  p_project_id uuid,
  p_title text,
  p_instructions text,
  p_minimum_minutes integer,
  p_tester_goal integer,
  p_reward_credits integer,
  p_duration_days integer,
  p_start_now boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_balance integer;
  v_budget integer;
  v_campaign_id uuid := gen_random_uuid();
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  if v_user_id is null then raise exception 'Please log in.'; end if;

  select owner_id into v_owner_id from public.projects where id = p_project_id;
  if v_owner_id is null or v_owner_id <> v_user_id then raise exception 'You do not own this project.'; end if;

  if nullif(trim(p_title), '') is null or nullif(trim(p_instructions), '') is null then
    raise exception 'Campaign title and instructions are required.';
  end if;
  if p_tester_goal < 1 or p_tester_goal > 500 then raise exception 'Tester goal is invalid.'; end if;
  if p_reward_credits < 25 or p_reward_credits > 1000 then raise exception 'Reward amount is invalid.'; end if;
  if p_duration_days < 1 or p_duration_days > 90 then raise exception 'Campaign duration is invalid.'; end if;
  if p_minimum_minutes < 1 or p_minimum_minutes > 600 then raise exception 'Minimum testing time is invalid.'; end if;

  v_budget := p_tester_goal * p_reward_credits;
  select credits into v_balance from public.profiles where id = v_user_id for update;
  if coalesce(v_balance, 0) < v_budget then
    raise exception 'You need % Nexus Credits to fund this campaign, but only have %.', v_budget, coalesce(v_balance, 0);
  end if;

  if p_start_now then
    v_starts_at := now();
    v_ends_at := now() + make_interval(days => p_duration_days);
  end if;

  insert into public.testing_campaigns(
    id, project_id, title, instructions, minimum_minutes, tester_goal,
    reward_credits, duration_days, starts_at, ends_at, status, reserved_credits, spent_credits
  ) values (
    v_campaign_id, p_project_id, trim(p_title), trim(p_instructions), p_minimum_minutes,
    p_tester_goal, p_reward_credits, p_duration_days, v_starts_at, v_ends_at,
    case when p_start_now then 'active'::public.campaign_status else 'draft'::public.campaign_status end,
    v_budget, 0
  );

  update public.profiles set credits = credits - v_budget, updated_at = now() where id = v_user_id;
  insert into public.credit_transactions(profile_id, amount, transaction_type, reference_id, note)
  values (v_user_id, -v_budget, 'campaign_cost', v_campaign_id, 'Campaign budget reserved: ' || trim(p_title));

  return v_campaign_id;
end;
$$;
grant execute on function public.create_funded_testing_campaign(uuid,text,text,integer,integer,integer,integer,boolean) to authenticated;

create or replace function public.update_funded_testing_campaign(
  p_campaign_id uuid,
  p_title text,
  p_instructions text,
  p_minimum_minutes integer,
  p_tester_goal integer,
  p_reward_credits integer,
  p_duration_days integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.testing_campaigns%rowtype;
  v_owner_id uuid;
  v_balance integer;
  v_desired_total integer;
  v_desired_remaining integer;
  v_delta integer;
  v_joined_count integer;
  v_ends_at timestamptz;
begin
  if v_user_id is null then raise exception 'Please log in.'; end if;

  select * into v_campaign from public.testing_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found.'; end if;

  select owner_id into v_owner_id from public.projects where id = v_campaign.project_id;
  if v_owner_id <> v_user_id then raise exception 'You do not own this campaign.'; end if;
  if v_campaign.status in ('completed', 'cancelled') then raise exception 'Closed campaigns cannot be edited.'; end if;

  select count(*)::integer into v_joined_count from public.campaign_members where campaign_id = p_campaign_id;
  if p_tester_goal < v_joined_count then raise exception 'Tester goal cannot be lower than the number of joined testers (%).', v_joined_count; end if;

  v_desired_total := p_tester_goal * p_reward_credits;
  if v_desired_total < v_campaign.spent_credits then raise exception 'The new campaign budget cannot be lower than credits already paid.'; end if;
  v_desired_remaining := v_desired_total - v_campaign.spent_credits;
  v_delta := v_desired_remaining - v_campaign.reserved_credits;

  select credits into v_balance from public.profiles where id = v_user_id for update;
  if v_delta > 0 and coalesce(v_balance, 0) < v_delta then
    raise exception 'You need % additional Nexus Credits, but only have %.', v_delta, coalesce(v_balance, 0);
  end if;

  if v_delta > 0 then
    update public.profiles set credits = credits - v_delta, updated_at = now() where id = v_user_id;
    insert into public.credit_transactions(profile_id, amount, transaction_type, reference_id, note)
    values (v_user_id, -v_delta, 'campaign_cost', p_campaign_id, 'Additional campaign budget reserved: ' || trim(p_title));
  elsif v_delta < 0 then
    update public.profiles set credits = credits + abs(v_delta), updated_at = now() where id = v_user_id;
    insert into public.credit_transactions(profile_id, amount, transaction_type, reference_id, note)
    values (v_user_id, abs(v_delta), 'refund', p_campaign_id, 'Campaign budget adjustment refund: ' || trim(p_title));
  end if;

  if v_campaign.starts_at is not null then
    v_ends_at := v_campaign.starts_at + make_interval(days => p_duration_days);
  end if;

  update public.testing_campaigns
  set title = trim(p_title), instructions = trim(p_instructions), minimum_minutes = p_minimum_minutes,
      tester_goal = p_tester_goal, reward_credits = p_reward_credits, duration_days = p_duration_days,
      ends_at = v_ends_at, reserved_credits = v_desired_remaining
  where id = p_campaign_id;

  return 'updated';
end;
$$;
grant execute on function public.update_funded_testing_campaign(uuid,text,text,integer,integer,integer,integer) to authenticated;

create or replace function public.change_funded_campaign_status(p_campaign_id uuid, p_next_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.testing_campaigns%rowtype;
  v_owner_id uuid;
  v_refund integer := 0;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_status public.campaign_status;
begin
  if v_user_id is null then raise exception 'Please log in.'; end if;
  if p_next_status not in ('active', 'paused', 'completed', 'cancelled') then raise exception 'Invalid campaign status.'; end if;

  select * into v_campaign from public.testing_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found.'; end if;
  select owner_id into v_owner_id from public.projects where id = v_campaign.project_id;
  if v_owner_id <> v_user_id then raise exception 'You do not own this campaign.'; end if;

  v_status := p_next_status::public.campaign_status;
  v_starts_at := v_campaign.starts_at;
  v_ends_at := v_campaign.ends_at;

  if v_status = 'active' then
    if v_campaign.status in ('completed', 'cancelled') then raise exception 'Closed campaigns cannot be reopened.'; end if;
    v_starts_at := coalesce(v_starts_at, now());
    v_ends_at := now() + make_interval(days => v_campaign.duration_days);
  elsif v_status in ('completed', 'cancelled') then
    v_refund := v_campaign.reserved_credits;
    if v_refund > 0 then
      update public.profiles set credits = credits + v_refund, updated_at = now() where id = v_user_id;
      insert into public.credit_transactions(profile_id, amount, transaction_type, reference_id, note)
      values (v_user_id, v_refund, 'refund', p_campaign_id, 'Unused campaign budget returned: ' || v_campaign.title);
    end if;
  end if;

  update public.testing_campaigns
  set status = v_status,
      starts_at = v_starts_at,
      ends_at = case when v_status = 'active' then v_ends_at else ends_at end,
      reserved_credits = case when v_status in ('completed', 'cancelled') then 0 else reserved_credits end,
      completed_at = case when v_status = 'completed' then now() else completed_at end,
      cancelled_at = case when v_status = 'cancelled' then now() else cancelled_at end
  where id = p_campaign_id;

  insert into public.notifications(profile_id, type, title, message, link_url)
  select tester_id, 'campaign_status', 'Campaign ' || p_next_status,
         'A campaign you joined is now ' || p_next_status || '.', '/campaigns/' || p_campaign_id
  from public.campaign_members where campaign_id = p_campaign_id;

  return p_next_status;
end;
$$;
grant execute on function public.change_funded_campaign_status(uuid,text) to authenticated;

create or replace function public.join_testing_campaign(p_campaign_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.testing_campaigns%rowtype;
  v_owner_id uuid;
  v_member_count integer;
  v_project_name text;
begin
  if v_user_id is null then raise exception 'Please log in to join this campaign.'; end if;

  select * into v_campaign from public.testing_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found.'; end if;
  select owner_id, name into v_owner_id, v_project_name from public.projects where id = v_campaign.project_id;

  if v_owner_id = v_user_id then raise exception 'You cannot join a campaign for your own project.'; end if;
  if v_campaign.status <> 'active' then raise exception 'This campaign is not active.'; end if;
  if v_campaign.ends_at is not null and v_campaign.ends_at <= now() then raise exception 'This campaign has ended.'; end if;
  if v_campaign.reserved_credits < v_campaign.reward_credits then raise exception 'This campaign no longer has enough reserved reward credits.'; end if;
  if exists(select 1 from public.campaign_members where campaign_id = p_campaign_id and tester_id = v_user_id) then return 'already_joined'; end if;

  select count(*)::integer into v_member_count from public.campaign_members where campaign_id = p_campaign_id;
  if v_member_count >= v_campaign.tester_goal then raise exception 'This campaign has reached its tester goal.'; end if;

  insert into public.campaign_members(campaign_id, tester_id, status) values(p_campaign_id, v_user_id, 'joined');
  insert into public.notifications(profile_id, type, title, message, link_url)
  values (
    v_owner_id,
    'campaign_join',
    'New tester joined',
    coalesce((select display_name from public.profiles where id = v_user_id), (select username from public.profiles where id = v_user_id), 'A tester') || ' joined ' || v_campaign.title,
    '/dashboard/projects/' || v_campaign.project_id || '/campaigns/' || v_campaign.id || '/manage'
  );

  return 'joined';
end;
$$;
grant execute on function public.join_testing_campaign(uuid) to authenticated;

create or replace function public.review_testing_feedback(p_member_id uuid, p_approve boolean, p_review_note text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_member public.campaign_members%rowtype;
  v_campaign public.testing_campaigns%rowtype;
  v_project public.projects%rowtype;
  v_approved_count integer;
begin
  if v_owner is null then raise exception 'Please log in.'; end if;

  select * into v_member from public.campaign_members where id = p_member_id for update;
  if not found then raise exception 'Testing membership not found.'; end if;
  select * into v_campaign from public.testing_campaigns where id = v_member.campaign_id for update;
  select * into v_project from public.projects where id = v_campaign.project_id;

  if v_project.owner_id <> v_owner then raise exception 'You do not own this campaign.'; end if;
  if v_member.status <> 'submitted' then raise exception 'This report is not awaiting review.'; end if;

  update public.feedback_reports
  set review_note = p_review_note, reviewed_at = now(), reviewed_by = v_owner
  where campaign_member_id = p_member_id;

  if p_approve then
    if v_campaign.reserved_credits < v_campaign.reward_credits then
      raise exception 'This campaign does not have enough reserved credits to pay this reward.';
    end if;

    update public.campaign_members set status = 'approved', approved_at = now() where id = p_member_id;

    if not exists(
      select 1 from public.credit_transactions
      where profile_id = v_member.tester_id and transaction_type = 'test_reward' and reference_id = p_member_id
    ) then
      update public.testing_campaigns
      set reserved_credits = reserved_credits - reward_credits,
          spent_credits = spent_credits + reward_credits
      where id = v_campaign.id;

      update public.profiles
      set credits = credits + v_campaign.reward_credits, updated_at = now()
      where id = v_member.tester_id;

      insert into public.credit_transactions(profile_id, amount, transaction_type, reference_id, note)
      values (v_member.tester_id, v_campaign.reward_credits, 'test_reward', p_member_id, 'Approved feedback: ' || v_campaign.title);
    end if;

    select count(*)::integer into v_approved_count
    from public.campaign_members where tester_id = v_member.tester_id and status = 'approved';

    update public.profiles
    set tester_reputation = least(5.0, 3.5 + (least(v_approved_count, 10) * 0.15)), updated_at = now()
    where id = v_member.tester_id;

    insert into public.notifications(profile_id, type, title, message, link_url)
    values (
      v_member.tester_id,
      'feedback_approved',
      'Feedback approved',
      'Your feedback for ' || v_campaign.title || ' was approved. You earned ' || v_campaign.reward_credits || ' credits.',
      '/dashboard/credits'
    );

    return 'approved';
  else
    update public.campaign_members set status = 'in_progress', submitted_at = null where id = p_member_id;
    insert into public.notifications(profile_id, type, title, message, link_url)
    values (
      v_member.tester_id,
      'changes_requested',
      'Changes requested',
      'The developer requested changes to your feedback for ' || v_campaign.title || coalesce('. Note: ' || nullif(p_review_note, ''), '.'),
      '/dashboard/testing/' || p_member_id
    );
    return 'changes_requested';
  end if;
end;
$$;
grant execute on function public.review_testing_feedback(uuid,boolean,text) to authenticated;
