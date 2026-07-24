-- Connects active campaign boosts to the public campaign feed and campaign pages.
-- Run after monetization_credits_boosts_payfast.sql and campaign_creator_tags_update.sql.

begin;

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
    count(cm.id) as joined_count,
    pr.username as creator_username,
    pr.display_name as creator_display_name,
    pr.avatar_url as creator_avatar_url,
    pr.role::text as creator_role,
    (ab.campaign_id is not null) as is_boosted,
    ab.boost_code,
    ab.ends_at as boost_ends_at
  from public.testing_campaigns c
  join public.projects p on p.id = c.project_id
  join public.profiles pr on pr.id = p.owner_id
  left join public.campaign_members cm on cm.campaign_id = c.id
  left join active_boosts ab on ab.campaign_id = c.id
  where c.status = 'active'
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
    case when p_sort = 'spaces_left' then (c.tester_goal - count(cm.id)) end desc nulls last,
    case when ab.campaign_id is not null then ab.ends_at end desc nulls last,
    c.created_at desc,
    c.id
  limit greatest(1, least(coalesce(p_limit, 10), 40))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.browse_campaigns(text,text,text,text,integer,integer) from public;
grant execute on function public.browse_campaigns(text,text,text,text,integer,integer) to anon, authenticated;

commit;
