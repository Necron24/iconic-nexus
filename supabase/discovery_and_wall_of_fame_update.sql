-- Iconic Nexus discovery, infinite scrolling and Wall of Fame foundation.
-- Run once in Supabase SQL Editor.

begin;

alter table public.projects
  add column if not exists last_activity_at timestamptz;

update public.projects
set last_activity_at = coalesce(last_activity_at, updated_at, created_at)
where last_activity_at is null;

alter table public.projects
  alter column last_activity_at set default now();

create index if not exists projects_public_discovery_idx
  on public.projects (is_published, moderation_status, last_activity_at desc, created_at desc);
create index if not exists projects_type_idx on public.projects (type);
create index if not exists projects_stage_idx on public.projects (stage);
create index if not exists projects_platform_lower_idx on public.projects (lower(platform));
create index if not exists testing_campaigns_public_browse_idx
  on public.testing_campaigns (status, ends_at, created_at desc);
create index if not exists campaign_members_campaign_status_idx
  on public.campaign_members (campaign_id, status);

create or replace function public.touch_project_activity(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please log in.';
  end if;

  update public.projects
  set last_activity_at = now(), updated_at = now()
  where id = p_project_id
    and (
      owner_id = auth.uid()
      or exists (
        select 1 from public.profiles pr
        where pr.id = auth.uid() and pr.is_admin = true
      )
    );

  if not found then
    raise exception 'Project not found or access denied.';
  end if;
end;
$$;

revoke all on function public.touch_project_activity(uuid) from public, anon;
grant execute on function public.touch_project_activity(uuid) to authenticated;

create or replace function public.browse_projects(
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
  average_rating numeric
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
      p.type::text,
      p.platform,
      p.stage::text,
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
      count(distinct cm.id) filter (where cm.status = 'approved') as approved_test_count,
      round(avg(fr.overall_rating) filter (where cm.status = 'approved'), 2) as average_rating
    from public.projects p
    left join public.testing_campaigns c on c.project_id = p.id
    left join public.campaign_members cm on cm.campaign_id = c.id
    left join public.feedback_reports fr on fr.campaign_member_id = cm.id
    where p.is_published = true
      and p.moderation_status = 'visible'
      and (
        nullif(trim(coalesce(p_search, '')), '') is null
        or p.name ilike '%' || trim(p_search) || '%'
        or p.short_description ilike '%' || trim(p_search) || '%'
        or coalesce(p.genre, '') ilike '%' || trim(p_search) || '%'
        or p.platform ilike '%' || trim(p_search) || '%'
      )
      and (nullif(trim(coalesce(p_type, '')), '') is null or p.type::text = p_type)
      and (nullif(trim(coalesce(p_platform, '')), '') is null or lower(p.platform) = lower(p_platform))
      and (nullif(trim(coalesce(p_stage, '')), '') is null or p.stage::text = p_stage)
    group by p.id
  )
  select *
  from project_stats ps
  where (not p_active_only or ps.active_campaign_count > 0)
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

revoke all on function public.browse_projects(text,text,text,text,boolean,text,integer,integer) from public;
grant execute on function public.browse_projects(text,text,text,text,boolean,text,integer,integer) to anon, authenticated;

create or replace function public.browse_campaigns(
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
  joined_count bigint
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
    count(cm.id) as joined_count
  from public.testing_campaigns c
  join public.projects p on p.id = c.project_id
  left join public.campaign_members cm on cm.campaign_id = c.id
  where c.status = 'active'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at > now())
    and p.is_published = true
    and p.moderation_status = 'visible'
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or c.title ilike '%' || trim(p_search) || '%'
      or p.name ilike '%' || trim(p_search) || '%'
      or p.short_description ilike '%' || trim(p_search) || '%'
    )
    and (nullif(trim(coalesce(p_platform, '')), '') is null or lower(p.platform) = lower(p_platform))
    and (nullif(trim(coalesce(p_stage, '')), '') is null or p.stage::text = p_stage)
  group by c.id, p.id
  order by
    case when p_sort = 'ending_soon' then c.ends_at end asc nulls last,
    case when p_sort = 'highest_reward' then c.reward_credits end desc nulls last,
    case when p_sort = 'spaces_left' then (c.tester_goal - count(cm.id)) end desc nulls last,
    c.created_at desc,
    c.id
  limit greatest(1, least(coalesce(p_limit, 10), 40))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.browse_campaigns(text,text,text,text,integer,integer) from public;
grant execute on function public.browse_campaigns(text,text,text,text,integer,integer) to anon, authenticated;

create or replace function public.wall_of_fame(p_limit integer default 10)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'testers', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.rank)
      from (
        select
          row_number() over (order by count(cm.id) desc, pr.tester_reputation desc, pr.created_at asc) as rank,
          pr.id,
          pr.username,
          pr.display_name,
          pr.avatar_url,
          pr.tester_reputation,
          count(cm.id)::integer as approved_tests
        from public.profiles pr
        join public.campaign_members cm on cm.tester_id = pr.id and cm.status = 'approved'
        where coalesce(pr.account_status, 'active') = 'active'
        group by pr.id
        order by approved_tests desc, pr.tester_reputation desc, pr.created_at asc
        limit greatest(1, least(coalesce(p_limit, 10), 25))
      ) t
    ), '[]'::jsonb),
    'developers', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.rank)
      from (
        select
          row_number() over (order by count(distinct cm.id) desc, count(distinct p.id) desc, pr.created_at asc) as rank,
          pr.id,
          pr.username,
          pr.display_name,
          pr.avatar_url,
          count(distinct p.id)::integer as published_projects,
          count(distinct cm.id)::integer as approved_tests_received
        from public.profiles pr
        join public.projects p on p.owner_id = pr.id and p.is_published = true and p.moderation_status = 'visible'
        left join public.testing_campaigns c on c.project_id = p.id
        left join public.campaign_members cm on cm.campaign_id = c.id and cm.status = 'approved'
        where coalesce(pr.account_status, 'active') = 'active'
        group by pr.id
        order by approved_tests_received desc, published_projects desc, pr.created_at asc
        limit greatest(1, least(coalesce(p_limit, 10), 25))
      ) d
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.rank)
      from (
        select
          row_number() over (order by count(distinct cm.id) desc, avg(fr.overall_rating) desc nulls last, p.last_activity_at desc) as rank,
          p.id,
          p.slug,
          p.name,
          p.icon_url,
          p.platform,
          count(distinct cm.id)::integer as approved_tests,
          round(avg(fr.overall_rating), 2) as average_rating
        from public.projects p
        left join public.testing_campaigns c on c.project_id = p.id
        left join public.campaign_members cm on cm.campaign_id = c.id and cm.status = 'approved'
        left join public.feedback_reports fr on fr.campaign_member_id = cm.id
        where p.is_published = true and p.moderation_status = 'visible'
        group by p.id
        order by approved_tests desc, average_rating desc nulls last, p.last_activity_at desc
        limit greatest(1, least(coalesce(p_limit, 10), 25))
      ) x
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.wall_of_fame(integer) from public;
grant execute on function public.wall_of_fame(integer) to anon, authenticated;

commit;
