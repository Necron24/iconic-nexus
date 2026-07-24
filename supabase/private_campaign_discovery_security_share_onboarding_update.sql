begin;

alter table public.profiles
  alter column onboarding_completed set default false;

update public.profiles
set onboarding_completed = false
where onboarding_completed is null;

-- Private campaigns are visible only to their owner or an existing participant.
-- Invitees use the guarded get_campaign_page RPC with their access code.
drop policy if exists "Campaigns public when project is visible" on public.testing_campaigns;
drop policy if exists "Campaigns visible according to privacy" on public.testing_campaigns;
create policy "Campaigns visible according to privacy"
on public.testing_campaigns
for select
using (
  (
    coalesce(is_private, false) = false
    and exists (
      select 1
      from public.projects p
      where p.id = testing_campaigns.project_id
        and p.is_published = true
        and p.moderation_status = 'visible'
    )
  )
  or exists (
    select 1
    from public.projects p
    where p.id = testing_campaigns.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.campaign_members cm
    where cm.campaign_id = testing_campaigns.id
      and cm.tester_id = auth.uid()
  )
);

-- Safely supplies a campaign page. Private campaign details are returned only
-- to the owner, an existing member, or someone with the correct access code.
create or replace function public.get_campaign_page(
  p_campaign_id uuid,
  p_access_code text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.testing_campaigns%rowtype;
  v_owner uuid;
  v_authorized boolean := false;
  v_result jsonb;
begin
  select c.* into v_campaign
  from public.testing_campaigns c
  where c.id = p_campaign_id;

  if not found then
    return null;
  end if;

  select p.owner_id into v_owner
  from public.projects p
  where p.id = v_campaign.project_id;

  v_authorized := not coalesce(v_campaign.is_private, false)
    or v_owner = v_user
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = p_campaign_id
        and cm.tester_id = v_user
    )
    or (
      v_campaign.access_code is not null
      and upper(trim(coalesce(p_access_code, ''))) = upper(v_campaign.access_code)
    );

  if not v_authorized then
    return jsonb_build_object('access_required', true);
  end if;

  select jsonb_build_object(
    'access_required', false,
    'campaign', to_jsonb(c) || jsonb_build_object(
      'projects', to_jsonb(p) || jsonb_build_object(
        'profiles', to_jsonb(pr)
      )
    )
  )
  into v_result
  from public.testing_campaigns c
  join public.projects p on p.id = c.project_id
  left join public.profiles pr on pr.id = p.owner_id
  where c.id = p_campaign_id
    and (
      p.is_published = true
      or p.owner_id = v_user
      or exists (
        select 1 from public.campaign_members cm
        where cm.campaign_id = p_campaign_id
          and cm.tester_id = v_user
      )
    );

  return v_result;
end;
$$;

revoke all on function public.get_campaign_page(uuid,text) from public;
grant execute on function public.get_campaign_page(uuid,text) to anon, authenticated;

-- Public Campaigns feed: private campaigns never appear, while boosts remain active.
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
  creator_role text,
  is_boosted boolean,
  boost_code text,
  boost_ends_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with active_boosts as (
    select distinct on (cb.target_id)
      cb.target_id as campaign_id,
      cb.boost_code,
      cb.ends_at
    from public.content_boosts cb
    where cb.target_type = 'campaign'
      and cb.status = 'active'
      and cb.starts_at <= now()
      and cb.ends_at > now()
    order by cb.target_id, cb.ends_at desc
  )
  select
    c.id, c.title, c.minimum_minutes, c.tester_goal, c.reward_credits,
    c.duration_days, c.ends_at, c.created_at,
    p.name, p.slug, p.platform, p.stage::text, p.short_description, p.icon_url,
    count(cm.id) filter (where cm.status <> 'rejected'),
    pr.username, pr.display_name, pr.avatar_url, pr.role::text,
    (ab.campaign_id is not null), ab.boost_code, ab.ends_at
  from public.testing_campaigns c
  join public.projects p on p.id = c.project_id
  join public.profiles pr on pr.id = p.owner_id
  left join public.campaign_members cm on cm.campaign_id = c.id
  left join active_boosts ab on ab.campaign_id = c.id
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
  group by c.id, p.id, pr.id, ab.campaign_id, ab.boost_code, ab.ends_at
  order by
    case when ab.campaign_id is not null then 0 else 1 end,
    case when p_sort = 'ending_soon' then c.ends_at end asc nulls last,
    case when p_sort = 'highest_reward' then c.reward_credits end desc nulls last,
    case when p_sort = 'spaces_left' then (c.tester_goal - count(cm.id) filter (where cm.status <> 'rejected')) end desc nulls last,
    case when ab.campaign_id is not null then ab.ends_at end desc nulls last,
    c.created_at desc,
    c.id
  limit greatest(1, least(coalesce(p_limit, 10), 40))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.browse_campaigns(text,text,text,text,integer,integer) from public;
grant execute on function public.browse_campaigns(text,text,text,text,integer,integer) to anon, authenticated;

-- Discover badges count only public, open campaigns.
drop function if exists public.browse_projects(text,text,text,text,boolean,text,integer,integer);

create function public.browse_projects(
  p_search text default null,
  p_type text default null,
  p_platform text default null,
  p_stage text default null,
  p_active_only boolean default false,
  p_sort text default 'updated',
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid, slug text, name text, type text, platform text, stage text,
  short_description text, icon_url text, cover_url text, created_at timestamptz,
  last_activity_at timestamptz, active_campaign_count bigint,
  active_campaign_id uuid, active_campaign_reward integer,
  active_campaign_spots_left integer, approved_test_count bigint,
  average_rating numeric, owner_id uuid, owner_username text,
  owner_display_name text, owner_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  with campaign_capacity as (
    select c.id, c.project_id, c.reward_credits,
      greatest(c.tester_goal - count(cm.id) filter (where cm.status <> 'rejected'), 0)::integer as spots_left,
      c.ends_at, c.created_at
    from public.testing_campaigns c
    left join public.campaign_members cm on cm.campaign_id = c.id
    where c.status = 'active'
      and coalesce(c.is_private, false) = false
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at > now())
    group by c.id, c.project_id, c.reward_credits, c.tester_goal, c.ends_at, c.created_at
  ),
  ranked_open_campaigns as (
    select cc.*,
      row_number() over (
        partition by cc.project_id
        order by cc.reward_credits desc, cc.spots_left desc,
          cc.ends_at asc nulls last, cc.created_at desc, cc.id
      ) as campaign_rank
    from campaign_capacity cc
    where cc.spots_left > 0
  ),
  active_campaign_summary as (
    select roc.project_id,
      count(*)::bigint as active_campaign_count,
      (array_agg(roc.id order by roc.campaign_rank) filter (where roc.campaign_rank = 1))[1] as active_campaign_id,
      max(roc.reward_credits) filter (where roc.campaign_rank = 1)::integer as active_campaign_reward,
      max(roc.spots_left) filter (where roc.campaign_rank = 1)::integer as active_campaign_spots_left
    from ranked_open_campaigns roc
    group by roc.project_id
  ),
  project_stats as (
    select p.id, p.slug, p.name, p.type::text, p.platform, p.stage::text,
      p.short_description, p.icon_url, p.cover_url, p.created_at,
      coalesce(p.last_activity_at, p.updated_at, p.created_at) as last_activity_at,
      coalesce(acs.active_campaign_count, 0)::bigint as active_campaign_count,
      acs.active_campaign_id, acs.active_campaign_reward, acs.active_campaign_spots_left,
      count(distinct cm.id) filter (where cm.status = 'approved') as approved_test_count,
      round(avg(fr.overall_rating) filter (where cm.status = 'approved'), 2) as average_rating,
      p.owner_id, op.username, op.display_name, op.avatar_url
    from public.projects p
    left join public.profiles op on op.id = p.owner_id
    left join active_campaign_summary acs on acs.project_id = p.id
    left join public.testing_campaigns allc on allc.project_id = p.id
    left join public.campaign_members cm on cm.campaign_id = allc.id
    left join public.feedback_reports fr on fr.campaign_member_id = cm.id
    where p.is_published = true and p.moderation_status = 'visible'
      and (nullif(trim(coalesce(p_search, '')), '') is null
        or p.name ilike '%' || trim(p_search) || '%'
        or p.short_description ilike '%' || trim(p_search) || '%'
        or coalesce(p.genre, '') ilike '%' || trim(p_search) || '%'
        or p.platform ilike '%' || trim(p_search) || '%')
      and (nullif(trim(coalesce(p_type, '')), '') is null or p.type::text = p_type)
      and (nullif(trim(coalesce(p_platform, '')), '') is null or lower(p.platform) = lower(p_platform))
      and (nullif(trim(coalesce(p_stage, '')), '') is null or p.stage::text = p_stage)
    group by p.id, op.username, op.display_name, op.avatar_url,
      acs.active_campaign_count, acs.active_campaign_id,
      acs.active_campaign_reward, acs.active_campaign_spots_left
  )
  select ps.* from project_stats ps
  where not p_active_only or ps.active_campaign_count > 0
  order by
    case when p_sort = 'newest' then ps.created_at end desc nulls last,
    case when p_sort = 'name' then lower(ps.name) end asc nulls last,
    case when p_sort = 'most_tested' then ps.approved_test_count end desc nulls last,
    case when p_sort = 'highest_rated' then ps.average_rating end desc nulls last,
    case when p_sort = 'updated' then ps.last_activity_at end desc nulls last,
    ps.created_at desc, ps.id
  limit greatest(1, least(coalesce(p_limit, 12), 48))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.browse_projects(text,text,text,text,boolean,text,integer,integer) from public;
grant execute on function public.browse_projects(text,text,text,text,boolean,text,integer,integer) to anon, authenticated;

commit;
