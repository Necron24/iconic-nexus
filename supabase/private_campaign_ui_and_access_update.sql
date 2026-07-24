begin;

alter table public.testing_campaigns
  add column if not exists is_private boolean not null default false;

alter table public.testing_campaigns
  add column if not exists access_code text;

create unique index if not exists testing_campaigns_access_code_unique
  on public.testing_campaigns(access_code)
  where access_code is not null;

create or replace function public.set_campaign_privacy(
  p_campaign_id uuid,
  p_is_private boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_allowed boolean := false;
  v_code text;
begin
  if v_user is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.testing_campaigns c
    join public.projects p on p.id = c.project_id
    where c.id = p_campaign_id
      and p.owner_id = v_user
  ) then
    raise exception 'Campaign not found.';
  end if;

  select coalesce(cp.private_campaigns, false)
  into v_allowed
  from public.current_plan(v_user) cp;

  if p_is_private and not v_allowed then
    raise exception 'Private campaigns require Pro or Studio.';
  end if;

  if p_is_private then
    select access_code into v_code
    from public.testing_campaigns
    where id = p_campaign_id;

    if v_code is null then
      loop
        v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
        exit when not exists (
          select 1 from public.testing_campaigns where access_code = v_code
        );
      end loop;
    end if;
  else
    v_code := null;
  end if;

  update public.testing_campaigns
  set is_private = p_is_private,
      access_code = v_code
  where id = p_campaign_id;

  return v_code;
end;
$$;

-- Remove the old one-argument join RPC so it cannot bypass private access.
drop function if exists public.join_testing_campaign(uuid);
drop function if exists public.join_testing_campaign(uuid, text);

create function public.join_testing_campaign(
  p_campaign_id uuid,
  p_access_code text default null
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
  v_member_count integer;
  v_project_name text;
begin
  if v_user_id is null then
    raise exception 'Please log in to join this campaign.';
  end if;

  select * into v_campaign
  from public.testing_campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found.';
  end if;

  select owner_id, name
  into v_owner_id, v_project_name
  from public.projects
  where id = v_campaign.project_id;

  if v_owner_id = v_user_id then
    raise exception 'You cannot join a campaign for your own project.';
  end if;

  if v_campaign.is_private
     and upper(trim(coalesce(p_access_code, ''))) <> upper(coalesce(v_campaign.access_code, '')) then
    raise exception 'A valid private campaign access code is required.';
  end if;

  if v_campaign.status <> 'active' then
    raise exception 'This campaign is not active.';
  end if;

  if v_campaign.starts_at is not null and v_campaign.starts_at > now() then
    raise exception 'This campaign has not started yet.';
  end if;

  if v_campaign.ends_at is not null and v_campaign.ends_at <= now() then
    raise exception 'This campaign has ended.';
  end if;

  if v_campaign.reserved_credits < v_campaign.reward_credits then
    raise exception 'This campaign no longer has enough reserved reward credits.';
  end if;

  if exists (
    select 1 from public.campaign_members
    where campaign_id = p_campaign_id and tester_id = v_user_id
  ) then
    return 'already_joined';
  end if;

  select count(*)::integer
  into v_member_count
  from public.campaign_members
  where campaign_id = p_campaign_id
    and status <> 'rejected';

  if v_member_count >= v_campaign.tester_goal then
    raise exception 'This campaign has reached its tester goal.';
  end if;

  insert into public.campaign_members(campaign_id, tester_id, status)
  values(p_campaign_id, v_user_id, 'joined');

  insert into public.notifications(profile_id, type, title, message, link_url)
  values (
    v_owner_id,
    'campaign_join',
    'New tester joined',
    coalesce(
      (select display_name from public.profiles where id = v_user_id),
      (select username from public.profiles where id = v_user_id),
      'A tester'
    ) || ' joined ' || v_campaign.title,
    '/dashboard/projects/' || v_campaign.project_id || '/campaigns/' || v_campaign.id || '/manage'
  );

  return 'joined';
end;
$$;

revoke all on function public.set_campaign_privacy(uuid, boolean) from public, anon;
grant execute on function public.set_campaign_privacy(uuid, boolean) to authenticated;
revoke all on function public.join_testing_campaign(uuid, text) from public, anon;
grant execute on function public.join_testing_campaign(uuid, text) to authenticated;

-- Private campaigns must not appear in the public Campaigns feed.
-- This recreates the current six-argument feed RPC used by Iconic-Nexus(18).
drop function if exists public.browse_campaigns(text,text,text,text,integer,integer);

create function public.browse_campaigns(
  p_search text default null,
  p_platform text default null,
  p_stage text default null,
  p_sort text default 'newest',
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  minimum_minutes integer,
  tester_goal integer,
  reward_credits integer,
  duration_days integer,
  ends_at timestamptz,
  created_at timestamptz,
  project_name text,
  project_slug text,
  platform text,
  stage text,
  short_description text,
  icon_url text,
  joined_count bigint,
  creator_username text,
  creator_display_name text,
  creator_avatar_url text,
  creator_role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.title,
    c.minimum_minutes,
    c.tester_goal,
    c.reward_credits,
    c.duration_days,
    c.ends_at,
    c.created_at,
    p.name as project_name,
    p.slug as project_slug,
    p.platform,
    p.stage::text,
    p.short_description,
    p.icon_url,
    count(cm.id) filter (where cm.status <> 'rejected') as joined_count,
    pr.username as creator_username,
    pr.display_name as creator_display_name,
    pr.avatar_url as creator_avatar_url,
    pr.role::text as creator_role
  from public.testing_campaigns c
  join public.projects p on p.id = c.project_id
  join public.profiles pr on pr.id = p.owner_id
  left join public.campaign_members cm on cm.campaign_id = c.id
  where c.status = 'active'
    and coalesce(c.is_private, false) = false
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at > now())
    and p.is_published = true
    and p.moderation_status = 'visible'
    and coalesce(pr.account_status, 'active') = 'active'
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or c.title ilike '%' || trim(p_search) || '%'
      or p.name ilike '%' || trim(p_search) || '%'
      or p.short_description ilike '%' || trim(p_search) || '%'
      or pr.username ilike '%' || trim(p_search) || '%'
      or coalesce(pr.display_name, '') ilike '%' || trim(p_search) || '%'
    )
    and (nullif(trim(coalesce(p_platform, '')), '') is null or lower(p.platform) = lower(p_platform))
    and (nullif(trim(coalesce(p_stage, '')), '') is null or p.stage::text = p_stage)
  group by c.id, p.id, pr.id
  order by
    case when p_sort = 'ending_soon' then c.ends_at end asc nulls last,
    case when p_sort = 'highest_reward' then c.reward_credits end desc nulls last,
    case when p_sort = 'spaces_left' then (c.tester_goal - count(cm.id) filter (where cm.status <> 'rejected')) end desc nulls last,
    c.created_at desc,
    c.id
  limit greatest(1, least(coalesce(p_limit, 10), 40))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.browse_campaigns(text,text,text,text,integer,integer) from public;
grant execute on function public.browse_campaigns(text,text,text,text,integer,integer) to anon, authenticated;

commit;
