-- Makes project and devlog boosts visible in their public feeds and exposes
-- privacy-friendly performance totals to the purchaser.
-- Run after private_campaign_discovery_security_share_onboarding_update.sql,
-- detailed_analytics_archive_update.sql and monetization_credits_boosts_payfast.sql.

begin;

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
  owner_display_name text, owner_avatar_url text, is_sponsored boolean,
  boost_ends_at timestamptz
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
  active_project_boosts as (
    select cb.target_id as project_id, max(cb.ends_at) as ends_at
    from public.content_boosts cb
    where cb.target_type = 'project'
      and cb.status = 'active'
      and cb.starts_at <= now()
      and cb.ends_at > now()
    group by cb.target_id
  ),
  project_stats as (
    select p.id, p.slug, p.name, p.type::text, p.platform, p.stage::text,
      p.short_description, p.icon_url, p.cover_url, p.created_at,
      coalesce(p.last_activity_at, p.updated_at, p.created_at) as last_activity_at,
      coalesce(acs.active_campaign_count, 0)::bigint as active_campaign_count,
      acs.active_campaign_id, acs.active_campaign_reward, acs.active_campaign_spots_left,
      count(distinct cm.id) filter (where cm.status = 'approved') as approved_test_count,
      round(avg(fr.overall_rating) filter (where cm.status = 'approved'), 2) as average_rating,
      p.owner_id, op.username, op.display_name, op.avatar_url,
      (apb.project_id is not null) as is_sponsored, apb.ends_at as boost_ends_at
    from public.projects p
    left join public.profiles op on op.id = p.owner_id
    left join active_campaign_summary acs on acs.project_id = p.id
    left join active_project_boosts apb on apb.project_id = p.id
    left join public.testing_campaigns allc on allc.project_id = p.id
    left join public.campaign_members cm on cm.campaign_id = allc.id
    left join public.feedback_reports fr on fr.campaign_member_id = cm.id
    where p.is_published = true and p.moderation_status = 'visible'
      and p.archived_at is null
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
      acs.active_campaign_reward, acs.active_campaign_spots_left,
      apb.project_id, apb.ends_at
  )
  select ps.* from project_stats ps
  where not p_active_only or ps.active_campaign_count > 0
  order by
    ps.is_sponsored desc,
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

create or replace function public.get_own_boost_performance()
returns table (
  boost_id uuid,
  impressions bigint,
  views bigint,
  link_clicks bigint,
  engagements bigint,
  conversions bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cb.id as boost_id,
    count(ae.id) filter (where ae.event_type = 'impression')::bigint as impressions,
    count(ae.id) filter (where ae.event_type = 'view')::bigint as views,
    count(ae.id) filter (where ae.event_type = 'link_click')::bigint as link_clicks,
    count(ae.id) filter (where ae.event_type in ('reaction','comment','save','follow','share'))::bigint as engagements,
    count(ae.id) filter (where ae.event_type = 'campaign_join')::bigint as conversions
  from public.content_boosts cb
  left join public.analytics_events ae
    on ae.target_type = cb.target_type
    and ae.target_id = cb.target_id
    and ae.occurred_at >= cb.starts_at
    and ae.occurred_at <= cb.ends_at
  where cb.purchaser_id = auth.uid()
  group by cb.id;
$$;

revoke all on function public.get_own_boost_performance() from public;
grant execute on function public.get_own_boost_performance() to authenticated;

commit;
