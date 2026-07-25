-- Iconic Nexus privacy-friendly creator analytics.
-- Run after devlog_community_update.sql.

begin;

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_day date not null default (now() at time zone 'utc')::date,
  event_type text not null check (
    event_type in ('impression','view','link_click','share','save','follow','reaction','comment','campaign_join')
  ),
  target_type text not null check (target_type in ('project','devlog','campaign')),
  target_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  visitor_hash text,
  source text,
  occurred_at timestamptz not null default now(),
  check (profile_id is not null or visitor_hash is not null),
  check (visitor_hash is null or visitor_hash ~ '^[0-9a-f]{64}$'),
  check (source is null or char_length(source) <= 80)
);

create unique index if not exists analytics_events_visitor_daily_unique
  on public.analytics_events(event_day,event_type,target_type,target_id,visitor_hash)
  where visitor_hash is not null;
create unique index if not exists analytics_events_profile_daily_unique
  on public.analytics_events(event_day,event_type,target_type,target_id,profile_id)
  where profile_id is not null;
create index if not exists analytics_events_project_date_idx
  on public.analytics_events(project_id,event_day,event_type);
create index if not exists analytics_events_target_date_idx
  on public.analytics_events(target_type,target_id,event_day);

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;

create or replace function public.track_analytics_event(
  p_event_type text,
  p_target_type text,
  p_target_id uuid,
  p_visitor_hash text default null,
  p_source text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_owner_id uuid;
  v_profile_id uuid := auth.uid();
  v_hash text := lower(nullif(trim(coalesce(p_visitor_hash,'')),''));
  v_source text := left(nullif(trim(coalesce(p_source,'')),''),80);
begin
  if p_event_type not in ('impression','view','link_click','share','save','follow','reaction','comment','campaign_join') then
    raise exception 'Invalid analytics event.';
  end if;
  if p_target_type not in ('project','devlog','campaign') then
    raise exception 'Invalid analytics target.';
  end if;

  if p_target_type = 'project' then
    select p.id, p.owner_id into v_project_id, v_owner_id
    from public.projects p
    where p.id = p_target_id
      and p.is_published = true
      and p.moderation_status = 'visible';
  elsif p_target_type = 'devlog' then
    select p.id, p.owner_id into v_project_id, v_owner_id
    from public.project_updates u
    join public.projects p on p.id = u.project_id
    where u.id = p_target_id
      and u.is_published = true
      and p.is_published = true
      and p.moderation_status = 'visible';
  else
    select p.id, p.owner_id into v_project_id, v_owner_id
    from public.testing_campaigns c
    join public.projects p on p.id = c.project_id
    where c.id = p_target_id
      and c.is_private = false
      and p.is_published = true
      and p.moderation_status = 'visible';
  end if;

  if v_project_id is null then return false; end if;
  if v_profile_id is not null and v_profile_id = v_owner_id then return false; end if;
  if v_profile_id is null and (v_hash is null or v_hash !~ '^[0-9a-f]{64}$') then return false; end if;

  insert into public.analytics_events(
    event_type,target_type,target_id,project_id,profile_id,visitor_hash,source
  )
  values (
    p_event_type,p_target_type,p_target_id,v_project_id,v_profile_id,
    case when v_profile_id is null then v_hash else null end,
    v_source
  )
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.track_analytics_event(text,text,uuid,text,text) from public;
grant execute on function public.track_analytics_event(text,text,uuid,text,text) to anon, authenticated;

create or replace function public.get_creator_content_analytics(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
viewer_plan as (
  select coalesce((
    select ps.plan_code
    from public.profile_subscriptions ps
    where ps.profile_id=auth.uid()
      and ps.status='active'
      and (ps.current_period_end is null or ps.current_period_end>now())
    limit 1
  ),'free') plan_code
),
settings as (
  select
    greatest(1,least(
      coalesce(p_days,30),
      case when vp.plan_code='studio' then 365 when vp.plan_code='pro' then 90 else 30 end
    ))::integer as days,
    auth.uid() as owner_id
  from viewer_plan vp
),
owned_projects as (
  select p.id,p.slug,p.name,p.icon_url
  from public.projects p, settings s
  where p.owner_id = s.owner_id
),
events as (
  select e.*
  from public.analytics_events e
  join owned_projects p on p.id = e.project_id
  cross join settings s
  where e.event_day >= (current_date - (s.days - 1))
),
daily as (
  select
    e.event_day,
    count(*) filter (where e.event_type='impression')::integer impressions,
    count(*) filter (where e.event_type='view')::integer views,
    count(*) filter (where e.event_type in ('reaction','comment','save','follow','share'))::integer engagements,
    count(*) filter (where e.event_type='campaign_join')::integer conversions
  from events e
  group by e.event_day
),
series as (
  select
    d::date as day,
    coalesce(x.impressions,0)::integer impressions,
    coalesce(x.views,0)::integer views,
    coalesce(x.engagements,0)::integer engagements,
    coalesce(x.conversions,0)::integer conversions
  from settings s
  cross join generate_series(current_date-(s.days-1),current_date,interval '1 day') d
  left join daily x on x.event_day=d::date
),
project_metrics as (
  select
    p.id,p.slug,p.name,p.icon_url,
    count(e.id) filter (where e.event_type='impression')::integer impressions,
    count(e.id) filter (where e.event_type='view')::integer views,
    count(e.id) filter (where e.event_type in ('reaction','comment','save','follow','share'))::integer engagements,
    count(e.id) filter (where e.event_type='campaign_join')::integer conversions
  from owned_projects p
  left join events e on e.project_id=p.id
  group by p.id,p.slug,p.name,p.icon_url
),
devlog_metrics as (
  select
    u.id,u.title,u.update_type,u.published_at,p.name project_name,
    count(e.id) filter (where e.event_type='impression')::integer impressions,
    count(e.id) filter (where e.event_type='view')::integer views,
    count(e.id) filter (where e.event_type in ('reaction','comment','save','share'))::integer engagements
  from public.project_updates u
  join owned_projects p on p.id=u.project_id
  left join events e on e.target_type='devlog' and e.target_id=u.id
  where u.is_published=true
  group by u.id,u.title,u.update_type,u.published_at,p.name
),
sources as (
  select coalesce(nullif(e.source,''),'direct') source,count(*)::integer events
  from events e
  where e.event_type in ('view','link_click')
  group by coalesce(nullif(e.source,''),'direct')
)
select jsonb_build_object(
  'days',(select days from settings),
  'totals',jsonb_build_object(
    'impressions',(select count(*) from events where event_type='impression'),
    'views',(select count(*) from events where event_type='view'),
    'unique_visitors',(select count(distinct coalesce('p:'||profile_id::text,'v:'||visitor_hash)) from events),
    'link_clicks',(select count(*) from events where event_type='link_click'),
    'shares',(select count(*) from events where event_type='share'),
    'saves',(select count(*) from events where event_type='save'),
    'follows',(select count(*) from events where event_type='follow'),
    'reactions',(select count(*) from events where event_type='reaction'),
    'comments',(select count(*) from events where event_type='comment'),
    'campaign_joins',(select count(*) from events where event_type='campaign_join')
  ),
  'series',coalesce((select jsonb_agg(to_jsonb(s) order by s.day) from series s),'[]'::jsonb),
  'projects',coalesce((select jsonb_agg(to_jsonb(p) order by p.views desc,p.impressions desc) from (select * from project_metrics order by views desc,impressions desc limit 12) p),'[]'::jsonb),
  'devlogs',coalesce((select jsonb_agg(to_jsonb(d) order by d.views desc,d.impressions desc) from (select * from devlog_metrics order by views desc,impressions desc limit 12) d),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(to_jsonb(s) order by s.events desc) from (select * from sources order by events desc limit 8) s),'[]'::jsonb),
  'funnel',jsonb_build_object(
    'impressions',(select count(*) from events where event_type='impression'),
    'views',(select count(*) from events where event_type='view'),
    'link_clicks',(select count(*) from events where event_type='link_click'),
    'campaign_joins',(select count(*) from events where event_type='campaign_join')
  )
);
$$;

revoke all on function public.get_creator_content_analytics(integer) from public;
grant execute on function public.get_creator_content_analytics(integer) to authenticated;

commit;
