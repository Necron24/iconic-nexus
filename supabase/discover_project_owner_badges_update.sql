begin;

-- The return columns are changing, so PostgreSQL requires the old function
-- to be dropped before it can be recreated.
drop function if exists public.browse_projects(
  text,
  text,
  text,
  text,
  boolean,
  text,
  integer,
  integer
);

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
  id uuid,
  slug text,
  name text,
  type text,
  platform text,
  stage text,
  short_description text,
  icon_url text,
  cover_url text,
  created_at timestamptz,
  last_activity_at timestamptz,
  active_campaign_count bigint,
  approved_test_count bigint,
  average_rating numeric,
  owner_id uuid,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  with project_stats as (
    select
      p.id,
      p.slug,
      p.name,
      p.type::text as type,
      p.platform,
      p.stage::text as stage,
      p.short_description,
      p.icon_url,
      p.cover_url,
      p.created_at,
      coalesce(p.last_activity_at, p.updated_at, p.created_at) as last_activity_at,
      count(distinct c.id) filter (
        where c.status = 'active'
          and (c.starts_at is null or c.starts_at <= now())
          and (c.ends_at is null or c.ends_at > now())
      ) as active_campaign_count,
      count(distinct cm.id) filter (
        where cm.status = 'approved'
      ) as approved_test_count,
      round(
        avg(fr.overall_rating) filter (where cm.status = 'approved'),
        2
      ) as average_rating,
      p.owner_id,
      owner_profile.username as owner_username,
      owner_profile.display_name as owner_display_name,
      owner_profile.avatar_url as owner_avatar_url
    from public.projects p
    join public.profiles owner_profile
      on owner_profile.id = p.owner_id
    left join public.testing_campaigns c
      on c.project_id = p.id
    left join public.campaign_members cm
      on cm.campaign_id = c.id
    left join public.feedback_reports fr
      on fr.campaign_member_id = cm.id
    where p.is_published = true
      and p.moderation_status = 'visible'
      and (
        nullif(trim(coalesce(p_search, '')), '') is null
        or p.name ilike '%' || trim(p_search) || '%'
        or p.short_description ilike '%' || trim(p_search) || '%'
        or coalesce(p.genre, '') ilike '%' || trim(p_search) || '%'
        or p.platform ilike '%' || trim(p_search) || '%'
      )
      and (
        nullif(trim(coalesce(p_type, '')), '') is null
        or p.type::text = p_type
      )
      and (
        nullif(trim(coalesce(p_platform, '')), '') is null
        or lower(p.platform) = lower(p_platform)
      )
      and (
        nullif(trim(coalesce(p_stage, '')), '') is null
        or p.stage::text = p_stage
      )
    group by
      p.id,
      owner_profile.username,
      owner_profile.display_name,
      owner_profile.avatar_url
  )
  select
    ps.id,
    ps.slug,
    ps.name,
    ps.type,
    ps.platform,
    ps.stage,
    ps.short_description,
    ps.icon_url,
    ps.cover_url,
    ps.created_at,
    ps.last_activity_at,
    ps.active_campaign_count,
    ps.approved_test_count,
    ps.average_rating,
    ps.owner_id,
    ps.owner_username,
    ps.owner_display_name,
    ps.owner_avatar_url
  from project_stats ps
  where not p_active_only or ps.active_campaign_count > 0
  order by
    case when p_sort = 'newest' then ps.created_at end desc nulls last,
    case when p_sort = 'name' then lower(ps.name) end asc nulls last,
    case when p_sort = 'most_tested' then ps.approved_test_count end desc nulls last,
    case when p_sort = 'highest_rated' then ps.average_rating end desc nulls last,
    case when p_sort = 'updated' then ps.last_activity_at end desc nulls last,
    ps.created_at desc,
    ps.id
  limit greatest(1, least(coalesce(p_limit, 12), 48))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.browse_projects(
  text,
  text,
  text,
  text,
  boolean,
  text,
  integer,
  integer
) from public;

grant execute on function public.browse_projects(
  text,
  text,
  text,
  text,
  boolean,
  text,
  integer,
  integer
) to anon, authenticated;

commit;
