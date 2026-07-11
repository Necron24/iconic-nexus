-- Iconic Nexus: legacy campaign reward compatibility and strict new reward validation.
-- Run this after campaign_credit_escrow_update.sql.

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
  v_required_reward integer;
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
  if p_reward_credits < 1 or p_reward_credits > 1000 then raise exception 'Reward amount is invalid.'; end if;
  if p_duration_days < 1 or p_duration_days > 90 then raise exception 'Campaign duration is invalid.'; end if;
  if p_minimum_minutes < 1 or p_minimum_minutes > 600 then raise exception 'Minimum testing time is invalid.'; end if;

  v_required_reward := greatest(
    25,
    ceil(p_minimum_minutes::numeric / 15)::integer * 10,
    case when p_duration_days >= 14 then 50 else 25 end
  );

  if p_reward_credits < v_required_reward then
    raise exception 'This campaign requires at least % credits per approved tester.', v_required_reward;
  end if;

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
  v_required_reward integer;
  v_current_required_reward integer;
  v_is_legacy boolean;
  v_legacy_settings_unchanged boolean;
begin
  if v_user_id is null then raise exception 'Please log in.'; end if;

  select * into v_campaign from public.testing_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found.'; end if;

  select owner_id into v_owner_id from public.projects where id = v_campaign.project_id;
  if v_owner_id <> v_user_id then raise exception 'You do not own this campaign.'; end if;
  if v_campaign.status in ('completed', 'cancelled') then raise exception 'Closed campaigns cannot be edited.'; end if;

  if nullif(trim(p_title), '') is null or nullif(trim(p_instructions), '') is null then
    raise exception 'Campaign title and instructions are required.';
  end if;
  if p_tester_goal < 1 or p_tester_goal > 500 then raise exception 'Tester goal is invalid.'; end if;
  if p_reward_credits < 1 or p_reward_credits > 1000 then raise exception 'Reward amount is invalid.'; end if;
  if p_duration_days < 1 or p_duration_days > 90 then raise exception 'Campaign duration is invalid.'; end if;
  if p_minimum_minutes < 1 or p_minimum_minutes > 600 then raise exception 'Minimum testing time is invalid.'; end if;

  v_required_reward := greatest(
    25,
    ceil(p_minimum_minutes::numeric / 15)::integer * 10,
    case when p_duration_days >= 14 then 50 else 25 end
  );
  v_current_required_reward := greatest(
    25,
    ceil(v_campaign.minimum_minutes::numeric / 15)::integer * 10,
    case when v_campaign.duration_days >= 14 then 50 else 25 end
  );
  v_is_legacy := v_campaign.reward_credits < v_current_required_reward;
  v_legacy_settings_unchanged :=
    v_is_legacy
    and p_reward_credits = v_campaign.reward_credits
    and p_tester_goal = v_campaign.tester_goal
    and p_duration_days = v_campaign.duration_days
    and p_minimum_minutes = v_campaign.minimum_minutes;

  if p_reward_credits < v_required_reward and not v_legacy_settings_unchanged then
    if v_is_legacy then
      raise exception 'This legacy reward can only be retained while tester count, duration and minimum testing time remain unchanged. The updated campaign requires at least % credits per approved tester.', v_required_reward;
    else
      raise exception 'This campaign requires at least % credits per approved tester.', v_required_reward;
    end if;
  end if;

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
  set title = trim(p_title),
      instructions = trim(p_instructions),
      minimum_minutes = p_minimum_minutes,
      tester_goal = p_tester_goal,
      reward_credits = p_reward_credits,
      duration_days = p_duration_days,
      ends_at = v_ends_at,
      reserved_credits = v_desired_remaining
  where id = p_campaign_id;

  return 'updated';
end;
$$;
grant execute on function public.update_funded_testing_campaign(uuid,text,text,integer,integer,integer,integer) to authenticated;
